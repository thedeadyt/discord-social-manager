import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';

const BASE_CATEGORIES = ['GÉNÉRAL', 'ANALYTICS', 'PROJETS', 'ARCHIVES'];

export default {
  data: new SlashCommandBuilder()
    .setName('projects')
    .setDescription('Liste tous les projets actifs'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const channels = await guild.channels.fetch();

    const projectCategories = channels.filter(c =>
      c.type === ChannelType.GuildCategory &&
      !BASE_CATEGORIES.includes(c.name) &&
      !c.name.startsWith('ARCHIVED-')
    );

    if (projectCategories.size === 0) {
      return interaction.editReply('Aucun projet actif pour le moment.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📁 Projets actifs')
      .setColor(0x74b9ff)
      .setTimestamp();

    for (const [, cat] of projectCategories) {
      const subChannels = channels.filter(c => c.parentId === cat.id);
      const suivi = subChannels.find(c => c.name === 'suivi-tâches');
      const channelList = subChannels.map(c => `<#${c.id}>`).join(' · ');
      embed.addFields({
        name: cat.name,
        value: channelList || 'Aucun salon',
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
