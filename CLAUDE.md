# Discord Bot - Alex2 Social Manager

## Overview

Discord.js v14 bot for managing the Alex2 social media team server.

**Guild ID:** `1375606684621209711`
**Bot Token:** stored in `.env` → `DISCORD_TOKEN`
**Container name:** `discord-bot`
**Network:** `alex2-net`
**n8n IP:** `172.18.0.31:5678`

## Project Structure

```
discord-bot/
├── src/
│   ├── commands/       # Slash commands + button handlers
│   ├── events/         # Discord.js event handlers
│   └── index.js        # Entry point
├── .env                # DISCORD_TOKEN, GUILD_ID, etc. (never commit)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Server Structure to Build

### Channels to KEEP (do not delete)
- `réseaux-sociaux`
- `général`

### Target Structure
```
GENERAL
  ├── 📢 annonces
  ├── 🔗 liens-outils
  ├── 🔑 credentials
  ├── 📅 planning-posts
  └── 🔊 Vocal (single voice channel)

ANALYTICS
  ├── 📊 stats-réseaux      ← n8n posts weekly digest here
  └── 🏆 top-contenu

PROJETS
  └── 📌 créer-un-projet    ← button → modal → auto-create project category
```

### Project Categories (auto-created via modal)
Each project gets a category named after the project with:
- `💡 idées-brainstorm`
- `🎨 maquette-design`
- `💻 dev`
- `✅ suivi-tâches`
- Archive button in `suivi-tâches` → moves category to ARCHIVES section

## Key Features

1. **Setup command** (`/setup`): Deletes all channels except réseaux-sociaux + général, creates full structure
2. **Create project button**: Posts message with button in #créer-un-projet; click → modal (project name) → creates category
3. **Archive project button**: Posted in each project's suivi-tâches; moves category to ARCHIVES, renames, removes permissions
4. **n8n webhooks**: Bot exposes HTTP endpoints (or n8n calls Discord webhook URLs) for:
   - Weekly digest → #stats-réseaux
   - Prochain post preview (30min before) → #planning-posts

## Tech Stack
- Node.js 20, Discord.js v14
- No database needed (stateless)
- Docker container on alex2-net

## n8n Social Scheduler Context
- Workflow ID: `C3OGBvN62LzXJl3w`
- Encryption key: `gXr7x63NMUpajSkvIK8XbnyYTIRaUUqt`
- Discord role to ping on post: `1387865908168491149`
- Webhook already exists in n8n workflow for post notifications
