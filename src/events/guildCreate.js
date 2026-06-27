import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  name: 'guildCreate',
  once: false,
  async execute(guild) {
    const commands = [];
    const files = readdirSync(join(__dirname, '../commands')).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const mod = await import(`../commands/${file}`);
      commands.push(mod.default.data.toJSON());
    }

    const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString('utf8');
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands });
      console.log(`Commands registered for new guild: ${guild.name} (${guild.id})`);
    } catch (e) {
      console.error(`Failed to register commands for guild ${guild.id}:`, e.message);
    }
  },
};
