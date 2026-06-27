import cron from 'node-cron';

// Mardi (2) et Vendredi (5) à 18h15 heure de Paris
const CRON_EXPRESSION = '15 18 * * 2,5';
const TIMEZONE = 'Europe/Paris';

export function startScheduler(client) {
  cron.schedule(CRON_EXPRESSION, async () => {
    try {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const channel = await guild.channels.fetch('1387879248240447490').catch(() => null);
      if (!channel) return;

      await channel.send(
        `<@&${process.env.PING_ROLE_ID}> N'oubliez pas de poster sur les réseaux sociaux aujourd'hui ! 📲`
      );
    } catch (err) {
      console.error('Scheduler ping error:', err);
    }
  }, { timezone: TIMEZONE });

  console.log(`Scheduler started — pings every Tuesday & Friday at 18:15 (${TIMEZONE})`);
}
