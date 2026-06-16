export default {
  async scheduled(event, env, ctx) {
    if (event.cron === '*/15 * * * *') {
      // Every 15 min: check for unscheduled jobs approaching the 2-hr response window
      const res = await fetch(
        `https://myquest.au/api/job-reminder?secret=${env.REMINDER_SECRET}`
      );
      const data = await res.json().catch(() => ({}));
      console.log('MyQuest job reminders:', JSON.stringify(data));
    } else {
      // Daily at 21:00 UTC (07:00 AEST): send day-before reminders to customers
      const res = await fetch(
        `https://myquest.au/api/send-reminders?secret=${env.REMINDER_SECRET}`
      );
      const data = await res.json().catch(() => ({}));
      console.log('MyQuest reminders:', JSON.stringify(data));
    }
  },
};
