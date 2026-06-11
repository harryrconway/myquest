export default {
  async scheduled(event, env, ctx) {
    const res = await fetch(
      `https://myquest.au/api/send-reminders?secret=${env.REMINDER_SECRET}`
    );
    const data = await res.json().catch(() => ({}));
    console.log('MyQuest reminders:', JSON.stringify(data));
  },
};
