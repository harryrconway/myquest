export default {
  async scheduled(event, env, ctx) {
    if (event.cron === '0 21 * * *') {
      // Daily at 21:00 UTC (07:00 AEST): send day-before reminders to customers
      const res = await fetch(
        `https://myquest.au/api/send-reminders?secret=${env.REMINDER_SECRET}`
      );
      const data = await res.json().catch(() => ({}));
      console.log('MyQuest reminders:', JSON.stringify(data));
      return;
    }

    if (event.cron === '*/30 * * * *') {
      // Every 30 minutes: alert managers if an open shift still needs
      // cover and starts soon
      const res = await fetch(
        `https://myquest.au/api/check-open-shifts?secret=${env.REMINDER_SECRET}`
      );
      const data = await res.json().catch(() => ({}));
      console.log('MyQuest open shift check:', JSON.stringify(data));
    }
  },
};
