import { ChannelType } from 'discord.js';

export async function archiveProject(interaction, categoryId) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;

  const category = guild.channels.cache.get(categoryId);
  if (!category) {
    return interaction.editReply('Catégorie introuvable.');
  }

  // Find ARCHIVES category
  const channels = await guild.channels.fetch();
  const archiveCat = channels.find(c => c.name === 'ARCHIVES' && c.type === ChannelType.GuildCategory);
  if (!archiveCat) {
    return interaction.editReply('Catégorie ARCHIVES introuvable. Lance /setup d\'abord.');
  }

  // Rename category to ARCHIVED-<name>
  const newName = `ARCHIVED-${category.name}`;
  await category.setName(newName);
  await category.setPosition(archiveCat.position + 1);

  // Move all sub-channels under ARCHIVES
  const subChannels = channels.filter(c => c.parentId === categoryId);
  for (const [, ch] of subChannels) {
    await ch.setParent(archiveCat.id, { lockPermissions: false });
  }

  // Delete the now-empty original category
  await category.delete('Projet archivé');

  // Log in #annonces
  const allChannels = await guild.channels.fetch();
  const annonces = allChannels.find(c => c.name === 'annonces');
  if (annonces) {
    const { EmbedBuilder } = await import('discord.js');
    await annonces.send({
      embeds: [new EmbedBuilder()
        .setTitle('📦 Projet archivé')
        .setDescription(`**${newName}** a été archivé par <@${interaction.user.id}>`)
        .setColor(0xe17055)
        .setTimestamp()
      ],
    });
  }

  await interaction.editReply(`✅ Projet archivé sous **${newName}**.`);
}
