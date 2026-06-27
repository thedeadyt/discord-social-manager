import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tasks')
    .setDescription('Liste les tâches du suivi-tâches de ce projet (à utiliser dans un salon du projet)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Find the suivi-tâches channel in the same category
    const currentChannel = interaction.channel;
    const categoryId = currentChannel.parentId;

    if (!categoryId) {
      return interaction.editReply('Cette commande doit être utilisée dans un salon de projet.');
    }

    const guild = interaction.guild;
    const channels = await guild.channels.fetch();

    const suiviChannel = channels.find(c =>
      c.name === 'suivi-tâches' && c.parentId === categoryId
    );

    if (!suiviChannel) {
      return interaction.editReply('Aucun canal #suivi-tâches trouvé dans ce projet.');
    }

    // Fetch messages from suivi-tâches (last 50)
    const messages = await suiviChannel.messages.fetch({ limit: 50 });

    // Filter messages that are task embeds posted by the bot
    const taskMessages = messages.filter(m =>
      m.author.id === interaction.client.user.id &&
      m.embeds.length > 0 &&
      (m.embeds[0].title?.startsWith('✅') || m.embeds[0].title?.startsWith('🔲'))
    );

    if (taskMessages.size === 0) {
      return interaction.editReply(`Aucune tâche dans <#${suiviChannel.id}>.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Tâches — ${currentChannel.parent?.name || 'Projet'}`)
      .setColor(0x74b9ff)
      .setTimestamp();

    // Sort: open tasks first, done last
    const sorted = [...taskMessages.values()].sort((a, b) => {
      const aDone = a.embeds[0].title?.startsWith('✅') ? 1 : 0;
      const bDone = b.embeds[0].title?.startsWith('✅') ? 1 : 0;
      return aDone - bDone;
    });

    for (const msg of sorted) {
      const taskEmbed = msg.embeds[0];
      const name = taskEmbed.title || '';
      const start = taskEmbed.fields?.find(f => f.name === '📅 Début')?.value || '';
      const end = taskEmbed.fields?.find(f => f.name === '🏁 Fin')?.value || '';
      const status = taskEmbed.fields?.find(f => f.name === 'Statut')?.value || '';
      embed.addFields({
        name,
        value: `${status} · Début: ${start} · Fin: ${end}\n[Voir la tâche](${msg.url})`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
