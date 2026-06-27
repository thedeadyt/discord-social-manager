import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildTaskEmbed({ name, description, startDate, endDate, done = false }) {
  const embed = new EmbedBuilder()
    .setTitle(`${done ? '✅' : '🔲'} ${name}`)
    .setColor(done ? 0x00b894 : 0xfdcb6e)
    .setTimestamp();

  if (description) embed.setDescription(description);

  embed.addFields(
    { name: '📅 Début', value: startDate || 'Non défini', inline: true },
    { name: '🏁 Fin', value: endDate || 'Non défini', inline: true },
    { name: 'Statut', value: done ? '✅ Terminée' : '🔄 En cours', inline: true },
  );

  return embed;
}

export function buildTaskButtons(messageId, done = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`task_done_${messageId}`)
      .setLabel(done ? 'Rouvrir' : '✅ Terminer')
      .setStyle(done ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`task_edit_${messageId}`)
      .setLabel('✏️ Modifier')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`task_delete_${messageId}`)
      .setLabel('🗑️ Supprimer')
      .setStyle(ButtonStyle.Danger),
  );
  return row;
}
