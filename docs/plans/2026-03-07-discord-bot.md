# Discord Bot - Alex2 Social Manager - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Discord.js v14 bot that reorganizes the Alex2 Discord server and manages social media team workflows.

**Architecture:** Single Node.js process using Discord.js v14 with slash commands and button/modal interactions. No database — all state is derived from Discord channel structure. Deployed as a Docker container on alex2-net.

**Tech Stack:** Node.js 20, Discord.js v14, Docker, docker-compose

---

## Prerequisites

- Guild ID: `1375606684621209711`
- Bot Token: `_6-Up4BKcHttrNGMq7q8C3AwiVHuW-Qy`
- Role to ping on posts: `1387865908168491149`
- Channels to keep: `réseaux-sociaux`, `général`
- n8n IP: `172.18.0.31:5678`

---

### Task 1: Project scaffold

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/package.json`
- Create: `/mnt/docker-volumes/discord-bot/src/index.js`
- Create: `/mnt/docker-volumes/discord-bot/.env`
- Create: `/mnt/docker-volumes/discord-bot/.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "discord-bot",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "deploy-commands": "node src/deploy-commands.js"
  },
  "dependencies": {
    "discord.js": "^14.17.3",
    "dotenv": "^16.4.7"
  }
}
```

**Step 2: Create .env**

```env
DISCORD_TOKEN=_6-Up4BKcHttrNGMq7q8C3AwiVHuW-Qy
GUILD_ID=1375606684621209711
PING_ROLE_ID=1387865908168491149
```

**Step 3: Create .gitignore**

```
node_modules/
.env
```

**Step 4: Create src/index.js (entry point)**

```js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { loadCommands } from './loader.js';
import { loadEvents } from './loader.js';

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
```

**Step 5: Create src/loader.js**

```js
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
```

---

### Task 2: Slash command registration script

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/src/deploy-commands.js`

**Step 1: Create deploy-commands.js**

```js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [];

const files = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of files) {
  const cmd = await import(`./commands/${file}`);
  commands.push(cmd.default.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
await rest.put(
  Routes.applicationGuildCommands(
    (await (await import('discord.js')).Client.prototype, process.env.DISCORD_TOKEN.split('.')[0]),
    process.env.GUILD_ID
  ),
  { body: commands }
);
```

Wait — cleaner approach:

```js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [];

const files = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of files) {
  const mod = await import(`./commands/${file}`);
  commands.push(mod.default.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Get client ID from token (first segment is base64-encoded client ID)
const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString('utf8');

console.log(`Registering ${commands.length} commands for guild ${process.env.GUILD_ID}...`);
await rest.put(
  Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
  { body: commands }
);
console.log('Commands registered.');
```

---

### Task 3: ready event + interactionCreate event

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/src/events/ready.js`
- Create: `/mnt/docker-volumes/discord-bot/src/events/interactionCreate.js`

**Step 1: Create ready.js**

```js
export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot ready: ${client.user.tag}`);
  },
};
```

**Step 2: Create interactionCreate.js**

This handles slash commands, button clicks, and modal submissions.

```js
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
```

**Step 3: Create handlers directory**

```
mkdir -p /mnt/docker-volumes/discord-bot/src/handlers
```

---

### Task 4: /setup command — server reorganization

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/src/commands/setup.js`
- Create: `/mnt/docker-volumes/discord-bot/src/lib/serverStructure.js`

**Step 1: Create serverStructure.js — defines the target structure**

```js
export const KEEP_CHANNELS = ['réseaux-sociaux', 'général'];

export const TARGET_STRUCTURE = [
  {
    name: 'GÉNÉRAL',
    type: 'category',
    channels: [
      { name: 'annonces', type: 'text' },
      { name: 'liens-outils', type: 'text' },
      { name: 'credentials', type: 'text' },
      { name: 'planning-posts', type: 'text' },
      { name: 'Vocal', type: 'voice' },
    ],
  },
  {
    name: 'ANALYTICS',
    type: 'category',
    channels: [
      { name: 'stats-réseaux', type: 'text' },
      { name: 'top-contenu', type: 'text' },
    ],
  },
  {
    name: 'PROJETS',
    type: 'category',
    channels: [
      { name: 'créer-un-projet', type: 'text' },
    ],
  },
  {
    name: 'ARCHIVES',
    type: 'category',
    channels: [],
  },
];
```

**Step 2: Create setup.js command**

```js
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
```

---

### Task 5: Create project button + modal

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/src/lib/projectButton.js`
- Create: `/mnt/docker-volumes/discord-bot/src/handlers/buttonHandler.js`
- Create: `/mnt/docker-volumes/discord-bot/src/handlers/modalHandler.js`

**Step 1: Create projectButton.js**

```js
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
```

**Step 2: Create buttonHandler.js**

```js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export async function handleButton(interaction) {
  if (interaction.customId === 'create_project') {
    const modal = new ModalBuilder()
      .setCustomId('modal_create_project')
      .setTitle('Nouveau projet');

    const nameInput = new TextInputBuilder()
      .setCustomId('project_name')
      .setLabel('Nom du projet')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('ex: Site e-commerce')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    await interaction.showModal(modal);
  }

  if (interaction.customId.startsWith('archive_project_')) {
    const categoryId = interaction.customId.replace('archive_project_', '');
    const { archiveProject } = await import('../lib/archiveProject.js');
    await archiveProject(interaction, categoryId);
  }
}
```

**Step 3: Create modalHandler.js**

```js
import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handleModal(interaction) {
  if (interaction.customId === 'modal_create_project') {
    await interaction.deferReply({ ephemeral: true });
    const projectName = interaction.fields.getTextInputValue('project_name');
    const guild = interaction.guild;

    // Find PROJETS category to position before ARCHIVES
    const channels = await guild.channels.fetch();
    const archiveCat = channels.find(c => c.name === 'ARCHIVES' && c.type === ChannelType.GuildCategory);

    // Create project category
    const category = await guild.channels.create({
      name: projectName.toUpperCase(),
      type: ChannelType.GuildCategory,
    });

    // Move before ARCHIVES if it exists
    if (archiveCat) {
      await category.setPosition(archiveCat.position);
    }

    // Create project sub-channels
    const subChannels = ['idées-brainstorm', 'maquette-design', 'dev', 'suivi-tâches'];
    let suiviChannel = null;
    for (const name of subChannels) {
      const ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
      });
      if (name === 'suivi-tâches') suiviChannel = ch;
    }

    // Post archive button in suivi-tâches
    if (suiviChannel) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`archive_project_${category.id}`)
          .setLabel('📦 Archiver ce projet')
          .setStyle(ButtonStyle.Danger)
      );
      await suiviChannel.send({
        content: `**Projet : ${projectName}**\nClique ci-dessous pour archiver ce projet.`,
        components: [row],
      });
    }

    await interaction.editReply(`✅ Projet **${projectName}** créé !`);
  }
}
```

---

### Task 6: Archive project feature

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/src/lib/archiveProject.js`

**Step 1: Create archiveProject.js**

```js
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

  await interaction.editReply(`✅ Projet archivé sous **${newName}**.`);
}
```

---

### Task 7: /post-create-button command (re-posts button if lost)

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/src/commands/postbutton.js`

**Step 1: Create postbutton.js**

```js
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
```

---

### Task 8: Dockerfile + docker-compose

**Files:**
- Create: `/mnt/docker-volumes/discord-bot/Dockerfile`
- Create: `/mnt/docker-volumes/discord-bot/docker-compose.yml`

**Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
CMD ["node", "src/index.js"]
```

**Step 2: Create docker-compose.yml**

```yaml
services:
  discord-bot:
    build: .
    container_name: discord-bot
    restart: unless-stopped
    env_file: .env
    networks:
      - alex2-net

networks:
  alex2-net:
    external: true
```

---

### Task 9: Install dependencies and deploy slash commands

**Step 1: Install npm dependencies**

```bash
cd /mnt/docker-volumes/discord-bot
npm install
```

Expected: `node_modules/` created, discord.js and dotenv installed.

**Step 2: Deploy slash commands to guild**

```bash
node src/deploy-commands.js
```

Expected output:
```
Registering 3 commands for guild 1375606684621209711...
Commands registered.
```

---

### Task 10: Build and run Docker container

**Step 1: Build image**

```bash
cd /mnt/docker-volumes/discord-bot
docker build -t discord-bot .
```

**Step 2: Start with docker-compose**

```bash
docker compose up -d
```

**Step 3: Check logs**

```bash
docker logs discord-bot -f
```

Expected: `Bot ready: <BotName>#XXXX`

---

### Task 11: Run /setup in Discord

After bot is running:
1. Go to the Discord server
2. Type `/setup` and execute
3. Verify: all old channels deleted, new structure created
4. Verify: button appears in #créer-un-projet
5. Test: click button → modal appears → fill name → project created with 4 sub-channels + archive button in suivi-tâches
6. Test: click archive button → category moves to ARCHIVES

---

## n8n Integration (Post-setup)

Once the server structure exists, n8n can send messages to specific channels via Discord webhook or bot HTTP.

The bot doesn't need to expose an HTTP server — n8n uses Discord webhooks directly:
- Create a webhook in `#stats-réseaux` → add URL to n8n workflow for weekly digest
- Create a webhook in `#planning-posts` → add URL to n8n for prochain post preview (30min before)

These webhook URLs can be added manually in Discord channel settings (Edit channel → Integrations → Webhooks).
