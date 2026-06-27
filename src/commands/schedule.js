import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import https from 'https';
import { read, utils } from 'xlsx';

const NEXTCLOUD_BASE = 'https://drive.alex2-server.fr';

function downloadBuffer(url, user, pass) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    https.get(url, { headers: { Authorization: `Basic ${auth}` } }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function postJson(url, user, pass, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const data = new URLSearchParams(body).toString();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createShare(path) {
  const res = await postJson(
    `${NEXTCLOUD_BASE}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
    process.env.NEXTCLOUD_USER,
    process.env.NEXTCLOUD_PASS,
    { path, shareType: '3', permissions: '1' }
  );
  const url = res?.ocs?.data?.url;
  return url ? `${url}/download` : null;
}

async function getShareUrl(path) {
  if (!path) return null;
  try {
    // Try as-is first, then strip erroneous "post réseaux/" segment if not found
    let url = await createShare(path);
    if (!url) {
      const fixed = path.replace(/\/post\s+r[eé]seaux\//i, '/');
      if (fixed !== path) url = await createShare(fixed);
    }
    return url;
  } catch {
    return null;
  }
}

function parseScheduled(row) {
  if (!row.scheduled_at) return null;
  // Fix malformed date separators (W instead of T)
  const raw = row.scheduled_at.toString().replace(/(\d{4}-\d{2}-\d{2})[W](\d{2}:\d{2})/, '$1T$2');
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export default {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Affiche les prochains posts planifiés')
    .addIntegerOption(opt =>
      opt.setName('nombre').setDescription('Nombre de posts à afficher (défaut: 5)').setMinValue(1).setMaxValue(10)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const buf = await downloadBuffer(
        process.env.NEXTCLOUD_EXCEL_URL,
        process.env.NEXTCLOUD_USER,
        process.env.NEXTCLOUD_PASS
      );

      const wb = read(buf, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws);

      const now = new Date();
      const limit = interaction.options.getInteger('nombre') ?? 5;

      const upcoming = rows
        .filter(row => {
          if ((row.status || '').toString().toLowerCase().trim() === 'published') return false;
          const d = parseScheduled(row);
          return d && d > now;
        })
        .sort((a, b) => parseScheduled(a) - parseScheduled(b))
        .slice(0, limit);

      if (upcoming.length === 0) {
        return interaction.editReply({ content: 'Aucun post planifié à venir.' });
      }

      const embeds = await Promise.all(upcoming.map(async (post) => {
        const scheduled = parseScheduled(post);
        const dateStr = scheduled.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
        const platforms = (post.platforms || 'social').toString();

        const embed = new EmbedBuilder()
          .setTitle(post.title || 'Post planifié')
          .setDescription((post.caption || '').toString().slice(0, 4096))
          .setColor(0x74b9ff)
          .setFooter({ text: `${dateStr} · ${platforms}` });

        const thumbPath = (post.thumbnail_path || '').toString().trim();
        if (thumbPath) {
          const imageUrl = await getShareUrl(thumbPath);
          if (imageUrl) embed.setImage(imageUrl);
        }

        return embed;
      }));

      await interaction.editReply({ embeds });
    } catch (err) {
      console.error('/schedule error:', err);
      await interaction.editReply({ content: `Erreur lors de la récupération du planning : ${err.message}` });
    }
  },
};
