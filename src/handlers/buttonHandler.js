import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { buildTaskEmbed, buildTaskButtons } from '../lib/taskEmbed.js';

export async function handleButton(interaction) {
  // ── Créer un projet ──────────────────────────────────────────────
  if (interaction.customId === 'create_project') {
    const modal = new ModalBuilder()
      .setCustomId('modal_create_project')
      .setTitle('Nouveau projet');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('project_name')
          .setLabel('Nom du projet')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('ex: Site e-commerce')
          .setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }

  // ── Archiver un projet ───────────────────────────────────────────
  if (interaction.customId.startsWith('archive_project_')) {
    const categoryId = interaction.customId.replace('archive_project_', '');
    const { archiveProject } = await import('../lib/archiveProject.js');
    return archiveProject(interaction, categoryId);
  }

  // ── Créer une tâche ──────────────────────────────────────────────
  if (interaction.customId === 'create_task') {
    const modal = new ModalBuilder()
      .setCustomId('modal_create_task')
      .setTitle('Nouvelle tâche');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_name')
          .setLabel('Nom de la tâche')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_start')
          .setLabel('Date de début (ex: 07/03/2026)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_end')
          .setLabel('Date de fin (ex: 14/03/2026)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Terminer / Rouvrir une tâche ─────────────────────────────────
  if (interaction.customId.startsWith('task_done_')) {
    const messageId = interaction.customId.replace('task_done_', '');
    const message = await interaction.channel.messages.fetch(messageId);
    const embed = message.embeds[0];
    if (!embed) return interaction.reply({ content: 'Tâche introuvable.', ephemeral: true });

    const isDone = embed.title?.startsWith('✅');
    const name = embed.title?.replace(/^[✅🔲] /, '') || '';
    const description = embed.description || '';
    const startDate = embed.fields?.find(f => f.name === '📅 Début')?.value || '';
    const endDate = embed.fields?.find(f => f.name === '🏁 Fin')?.value || '';

    const newEmbed = buildTaskEmbed({ name, description, startDate, endDate, done: !isDone });
    const newRow = buildTaskButtons(messageId, !isDone);
    await message.edit({ embeds: [newEmbed], components: [newRow] });
    return interaction.reply({ content: isDone ? '🔄 Tâche réouverte.' : '✅ Tâche marquée comme terminée.', ephemeral: true });
  }

  // ── Modifier une tâche ───────────────────────────────────────────
  if (interaction.customId.startsWith('task_edit_')) {
    const messageId = interaction.customId.replace('task_edit_', '');
    const message = await interaction.channel.messages.fetch(messageId);
    const embed = message.embeds[0];
    if (!embed) return interaction.reply({ content: 'Tâche introuvable.', ephemeral: true });

    const name = embed.title?.replace(/^[✅🔲] /, '') || '';
    const description = embed.description || '';
    const startDate = embed.fields?.find(f => f.name === '📅 Début')?.value || '';
    const endDate = embed.fields?.find(f => f.name === '🏁 Fin')?.value || '';

    const modal = new ModalBuilder()
      .setCustomId(`modal_edit_task_${messageId}`)
      .setTitle('Modifier la tâche');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_name')
          .setLabel('Nom de la tâche')
          .setStyle(TextInputStyle.Short)
          .setValue(name)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(description)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_start')
          .setLabel('Date de début')
          .setStyle(TextInputStyle.Short)
          .setValue(startDate === 'Non défini' ? '' : startDate)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('task_end')
          .setLabel('Date de fin')
          .setStyle(TextInputStyle.Short)
          .setValue(endDate === 'Non défini' ? '' : endDate)
          .setRequired(false)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Supprimer une tâche ──────────────────────────────────────────
  if (interaction.customId.startsWith('task_delete_')) {
    const messageId = interaction.customId.replace('task_delete_', '');
    const message = await interaction.channel.messages.fetch(messageId);
    await message.delete();
    return interaction.reply({ content: '🗑️ Tâche supprimée.', ephemeral: true });
  }
}
