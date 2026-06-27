import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { cache } from '../cache.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche le dernier digest hebdomadaire'),

  async execute(interaction) {
    if (!cache.lastDigest) {
      return interaction.reply({ content: 'Aucun digest reçu de n8n pour le moment.', ephemeral: true });
    }

    const d = cache.lastDigest;
    const embed = new EmbedBuilder()
      .setTitle('📊 Dernières stats')
      .setDescription(d.content || JSON.stringify(d, null, 2))
      .setColor(0x6c5ce7)
      .setTimestamp(d.timestamp);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
