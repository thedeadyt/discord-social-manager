import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { KEEP_CHANNELS, TARGET_STRUCTURE } from '../lib/serverStructure.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Réorganise le serveur Discord (supprime tout sauf général et réseaux-sociaux)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;

    // Step 1: Delete all channels except kept ones
    const channels = await guild.channels.fetch();
    for (const [, channel] of channels) {
      if (!KEEP_CHANNELS.includes(channel.name)) {
        try {
          await channel.delete('Setup bot: restructuration serveur');
        } catch (e) {
          console.error(`Failed to delete ${channel.name}:`, e.message);
        }
      }
    }

    // Step 2: Create target structure
    const createdChannels = {};
    for (const cat of TARGET_STRUCTURE) {
      const category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
      });
      createdChannels[cat.name] = category;

      for (const ch of cat.channels) {
        const created = await guild.channels.create({
          name: ch.name,
          type: ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: category.id,
        });
        createdChannels[ch.name] = created;
      }
    }

    // Step 3: Post "Créer un projet" button in #créer-un-projet
    const { postCreateProjectButton } = await import('../lib/projectButton.js');
    await postCreateProjectButton(createdChannels['créer-un-projet']);

    await interaction.editReply('✅ Serveur restructuré avec succès !');
  },
};
