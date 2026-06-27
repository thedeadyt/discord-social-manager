import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [];

const files = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of files) {
  const mod = await import(`./commands/${file}`);
  commands.push(mod.default.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Client ID is the base64-decoded first segment of the token
const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString('utf8');

const guildIds = process.env.GUILD_IDS
  ? process.env.GUILD_IDS.split(',')
  : [process.env.GUILD_ID];

for (const guildId of guildIds) {
  console.log(`Registering ${commands.length} commands for guild ${guildId}...`);
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId.trim()),
    { body: commands }
  );
  console.log(`Commands registered for guild ${guildId}.`);
}
