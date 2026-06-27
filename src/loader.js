import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  const files = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = await import(`./commands/${file}`);
    client.commands.set(cmd.default.data.name, cmd.default);
  }
}

export async function loadEvents(client) {
  const files = readdirSync(join(__dirname, 'events')).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const event = await import(`./events/${file}`);
    if (event.default.once) {
      client.once(event.default.name, (...args) => event.default.execute(...args));
    } else {
      client.on(event.default.name, (...args) => event.default.execute(...args));
    }
  }
}
