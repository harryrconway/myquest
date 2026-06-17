export default {
  async scheduled(event, env, ctx) {
    // Daily at 21:00 UTC (07:00 AEST): send day-before reminders to customers
    const res = await fetch(
      `https://myquest.au/api/send-reminders?secret=${env.REMINDER_SECRET}`
    );
    const data = await res.json().catch(() => ({}));
    console.log('MyQuest reminders:', JSON.stringify(data));
  },
};
