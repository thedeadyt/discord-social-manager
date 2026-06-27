import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function postCreateProjectButton(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_project')
      .setLabel('+ Créer un projet')
      .setStyle(ButtonStyle.Primary)
  );
  await channel.send({
    content: '**Nouveau projet ?** Clique ci-dessous pour créer une catégorie dédiée.',
    components: [row],
  });
}
