import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function postNewTaskButton(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_task')
      .setLabel('➕ Nouvelle tâche')
      .setStyle(ButtonStyle.Primary)
  );
  await channel.send({
    content: '**Suivi des tâches** — Clique pour ajouter une tâche à ce projet.',
    components: [row],
  });
}
