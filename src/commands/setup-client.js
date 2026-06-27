import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

const CLIENT_STRUCTURE = [
  {
    name: 'GÉNÉRAL',
    channels: [
      { name: 'annonces', type: 'text' },
      { name: 'discussion', type: 'text' },
      { name: 'Vocal', type: 'voice' },
    ],
  },
  {
    name: 'PROJET',
    channels: [
      { name: 'brief-objectifs', type: 'text' },
      { name: 'livrables', type: 'text' },
      { name: 'suivi', type: 'text' },
    ],
  },
  {
    name: 'FACTURATION',
    channels: [
      // teamOnly: true → caché au rôle Client
      { name: 'devis-factures', type: 'text', teamOnly: true },
    ],
  },
];

export default {
  data: new SlashCommandBuilder()
    .setName('setup-client')
    .setDescription('Initialise un serveur pour un projet client')
    .addStringOption(opt =>
      opt.setName('nom')
        .setDescription('Nom du projet client')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('client')
        .setDescription('Mention du client (optionnel) — lui envoie un DM de bienvenue')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const projectName = interaction.options.getString('nom');
    const clientUser = interaction.options.getUser('client');

    // Delete all existing channels
    const channels = await guild.channels.fetch();
    for (const [, channel] of channels) {
      try {
        await channel.delete('setup-client: initialisation serveur projet');
      } catch (e) {
        console.error(`Failed to delete ${channel.name}:`, e.message);
      }
    }

    // Delete existing managed roles (keep @everyone + bot roles)
    const roles = await guild.roles.fetch();
    for (const [, role] of roles) {
      if (['Client', 'Équipe'].includes(role.name)) {
        try { await role.delete(); } catch (e) { /* ignore */ }
      }
    }

    // Create roles
    const roleEquipe = await guild.roles.create({
      name: 'Équipe',
      color: 0x5865F2,
      mentionable: true,
    });
    const roleClient = await guild.roles.create({
      name: 'Client',
      color: 0x57F287,
      mentionable: false,
    });

    // Hide all channels from @everyone by default
    await guild.roles.everyone.setPermissions(0n);

    // Create structure with permissions
    const createdChannels = {};
    for (const cat of CLIENT_STRUCTURE) {
      const category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: roleEquipe, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: roleClient, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });

      for (const ch of cat.channels) {
        const overwrites = [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: roleEquipe, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ];

        // teamOnly channels: Client can't see
        if (!ch.teamOnly) {
          overwrites.push({ id: roleClient, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        }

        const created = await guild.channels.create({
          name: ch.name,
          type: ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites,
        });
        createdChannels[ch.name] = created;
      }
    }

    // Assign Équipe role to the person who ran the command
    await interaction.member.roles.add(roleEquipe);

    // Welcome message in #annonces
    await createdChannels['annonces'].send(
      `📢 **Bienvenue sur le serveur du projet "${projectName}"** !\n\n` +
      `Voici comment le serveur est organisé :\n` +
      `• **#brief-objectifs** — les objectifs et le brief du projet\n` +
      `• **#livrables** — liens Figma, démos, fichiers livrés\n` +
      `• **#suivi** — avancement et validations\n\n` +
      `N'hésitez pas à poser vos questions dans **#discussion** 👋`
    );

    // DM the client if provided
    if (clientUser) {
      try {
        await clientUser.send(
          `👋 Bonjour !\n\n` +
          `Vous avez été invité sur le serveur Discord du projet **"${projectName}"**.\n\n` +
          `Vous y trouverez le brief, les livrables et le suivi de votre projet.\n` +
          `N'hésitez pas à poser vos questions directement dans **#discussion**.\n\n` +
          `À bientôt ! 🚀`
        );
      } catch (e) {
        // Client has DMs disabled, not a blocker
      }
    }

    const dmNote = clientUser ? ` Un DM de bienvenue a été envoyé à ${clientUser.username}.` : '';
    await interaction.editReply(`✅ Serveur initialisé pour le projet **${projectName}** !${dmNote}\n\n**Rôles créés :**\n• \`Équipe\` — toi + l'équipe (accès complet)\n• \`Client\` — le client (sans #devis-factures)`);
  },
};
