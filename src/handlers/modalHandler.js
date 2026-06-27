import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { buildTaskEmbed, buildTaskButtons } from '../lib/taskEmbed.js';
import { postNewTaskButton } from '../lib/taskButton.js';

export async function handleModal(interaction) {

  // ── Créer un projet ──────────────────────────────────────────────
  if (interaction.customId === 'modal_create_project') {
    await interaction.deferReply({ ephemeral: true });
    const projectName = interaction.fields.getTextInputValue('project_name');
    const guild = interaction.guild;

    const channels = await guild.channels.fetch();
    const archiveCat = channels.find(c => c.name === 'ARCHIVES' && c.type === ChannelType.GuildCategory);

    const category = await guild.channels.create({
      name: projectName.toUpperCase(),
      type: ChannelType.GuildCategory,
    });

    if (archiveCat) {
      await category.setPosition(archiveCat.position);
    }

    const subChannels = ['idées-brainstorm', 'maquette-design', 'dev', 'suivi-tâches'];
    let suiviChannel = null;
    for (const name of subChannels) {
      const ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
      });
      if (name === 'suivi-tâches') suiviChannel = ch;
    }

    if (suiviChannel) {
      // Bouton archiver
      const archiveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`archive_project_${category.id}`)
          .setLabel('📦 Archiver ce projet')
          .setStyle(ButtonStyle.Danger)
      );
      await suiviChannel.send({
        content: `**Projet : ${projectName}**\nClique ci-dessous pour archiver ce projet.`,
        components: [archiveRow],
      });

      // Bouton nouvelle tâche
      await postNewTaskButton(suiviChannel);
    }

    // Log dans #annonces
    const annonces = channels.find(c => c.name === 'annonces');
    if (annonces) {
      const { EmbedBuilder } = await import('discord.js');
      await annonces.send({
        embeds: [new EmbedBuilder()
          .setTitle('📁 Nouveau projet créé')
          .setDescription(`**${projectName}** a été créé par <@${interaction.user.id}>`)
          .setColor(0x00b894)
          .setTimestamp()
        ],
      });
    }

    await interaction.editReply(`✅ Projet **${projectName}** créé !`);
    return;
  }

  // ── Créer une tâche ──────────────────────────────────────────────
  if (interaction.customId === 'modal_create_task') {
    await interaction.deferReply({ ephemeral: true });
    const name = interaction.fields.getTextInputValue('task_name');
    const description = interaction.fields.getTextInputValue('task_description') || '';
    const startDate = interaction.fields.getTextInputValue('task_start') || '';
    const endDate = interaction.fields.getTextInputValue('task_end') || '';

    const embed = buildTaskEmbed({ name, description, startDate, endDate, done: false });

    // Post the task message first (without buttons, to get the message ID)
    const msg = await interaction.channel.send({ embeds: [embed] });

    // Now edit with buttons using the real message ID
    const row = buildTaskButtons(msg.id, false);
    await msg.edit({ embeds: [embed], components: [row] });

    await interaction.editReply('✅ Tâche créée !');
    return;
  }

  // ── Modifier une tâche ───────────────────────────────────────────
  if (interaction.customId.startsWith('modal_edit_task_')) {
    const messageId = interaction.customId.replace('modal_edit_task_', '');
    const name = interaction.fields.getTextInputValue('task_name');
    const description = interaction.fields.getTextInputValue('task_description') || '';
    const startDate = interaction.fields.getTextInputValue('task_start') || '';
    const endDate = interaction.fields.getTextInputValue('task_end') || '';

    const message = await interaction.channel.messages.fetch(messageId);
    const oldEmbed = message.embeds[0];
    const isDone = oldEmbed?.title?.startsWith('✅') || false;

    const newEmbed = buildTaskEmbed({ name, description, startDate, endDate, done: isDone });
    const row = buildTaskButtons(messageId, isDone);
    await message.edit({ embeds: [newEmbed], components: [row] });

    await interaction.reply({ content: '✅ Tâche mise à jour.', ephemeral: true });
    return;
  }
}
