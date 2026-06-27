export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        await cmd.execute(interaction);
      } catch (err) {
        console.error(err);
        const msg = { content: 'Erreur lors de l\'exécution de la commande.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    }

    if (interaction.isButton()) {
      const { handleButton } = await import('../handlers/buttonHandler.js');
      await handleButton(interaction);
    }

    if (interaction.isModalSubmit()) {
      const { handleModal } = await import('../handlers/modalHandler.js');
      await handleModal(interaction);
    }
  },
};
