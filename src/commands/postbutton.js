import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { postCreateProjectButton } from '../lib/projectButton.js';

export default {
  data: new SlashCommandBuilder()
    .setName('postbutton')
    .setDescription('Re-poste le bouton "Créer un projet" dans #créer-un-projet')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const channels = await guild.channels.fetch();
    const channel = channels.find(c => c.name === 'créer-un-projet');
    if (!channel) return interaction.editReply('Canal #créer-un-projet introuvable.');
    await postCreateProjectButton(channel);
    await interaction.editReply('✅ Bouton posté.');
  },
};
