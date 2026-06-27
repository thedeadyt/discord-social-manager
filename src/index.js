import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { loadCommands, loadEvents } from './loader.js';
import { startHttpServer } from './http.js';
import { startScheduler } from './scheduler.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
await loadCommands(client);
await loadEvents(client);

await client.login(process.env.DISCORD_TOKEN);

client.once('clientReady', () => {
  startHttpServer(client);
  startScheduler(client);
});
