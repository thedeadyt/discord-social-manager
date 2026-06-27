import { createServer } from 'http';
import { cache } from './cache.js';

const PORT = process.env.HTTP_PORT || 3001;

export function startHttpServer(client) {
  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405).end('Method Not Allowed');
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400).end('Bad JSON');
        return;
      }

      try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const channels = await guild.channels.fetch();

        if (req.url === '/notify/post') {
          // Post published notification → fixed channel ID + role ping
          const channel = await guild.channels.fetch('1387879248240447490').catch(() => null);
          if (channel) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
              .setTitle('✅ Post publié !')
              .setColor(0x00b894)
              .addFields(
                { name: '🖥️ Plateforme(s)', value: data.platform || 'Social', inline: true },
                { name: '📝 Titre', value: data.title || '—', inline: true },
              )
              .setFooter({ text: 'Alex2 Social Media Scheduler' })
              .setTimestamp();
            if (data.caption) embed.setDescription(data.caption);
            if (data.image_url) embed.setImage(data.image_url);
            await channel.send({
              content: `<@&${process.env.PING_ROLE_ID}>`,
              embeds: [embed],
            });
          }
          res.writeHead(200).end('ok');

        } else if (req.url === '/notify/digest') {
          // Weekly digest → #stats-réseaux
          const channel = channels.find(c => c.name === 'stats-réseaux');
          if (channel) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
              .setTitle('📊 Digest hebdomadaire')
              .setDescription(data.content || JSON.stringify(data, null, 2))
              .setColor(0x6c5ce7)
              .setTimestamp();
            await channel.send({ embeds: [embed] });
          }
          cache.lastDigest = { ...data, timestamp: Date.now() };
          res.writeHead(200).end('ok');

        } else if (req.url === '/notify/preview') {
          // Preview 30min before → fixed channel ID
          const channel = await guild.channels.fetch('1387879248240447490').catch(() => null);
          if (channel) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
              .setTitle(`⏰ Prochain post dans 30min — ${data.platform || 'Social'}`)
              .setDescription(data.caption || null)
              .setColor(0xfdcb6e)
              .setTimestamp();
            if (data.image_url) embed.setImage(data.image_url);
            if (data.title) embed.addFields({ name: 'Titre', value: data.title });
            if (data.scheduled_at) embed.addFields({ name: 'Heure prévue', value: data.scheduled_at });
            await channel.send({ embeds: [embed] });
          }
          cache.lastPreview = { ...data, timestamp: Date.now() };
          res.writeHead(200).end('ok');

        } else {
          res.writeHead(404).end('Not Found');
        }
      } catch (err) {
        console.error('HTTP handler error:', err);
        res.writeHead(500).end('Internal Server Error');
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
  });
}
