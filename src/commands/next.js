import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { cache } from '../cache.js';

export default {
  data: new SlashCommandBuilder()
    .setName('next')
    .setDescription('Affiche le prochain post planifié'),

  async execute(interaction) {
    if (!cache.lastPreview) {
      return interaction.reply({ content: 'Aucune preview reçue de n8n pour le moment.', ephemeral: true });
    }

    const d = cache.lastPreview;
    const embed = new EmbedBuilder()
      .setTitle(`⏰ Prochain post — ${d.platform || 'Social'}`)
      .setDescription(d.caption || '')
      .setColor(0xfdcb6e)
      .setTimestamp(d.timestamp);

    if (d.title) embed.addFields({ name: 'Titre', value: d.title });
    if (d.scheduled_at) embed.addFields({ name: 'Heure prévue', value: d.scheduled_at });
    if (d.image_url) embed.setImage(d.image_url);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
