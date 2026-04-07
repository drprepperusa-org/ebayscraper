module.exports = async (req, res) => {
  const discord = !!(process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL !== 'https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN');
  const sheets = !!(process.env.GOOGLE_CREDENTIALS && process.env.GOOGLE_TOKEN);
  const sheetId = !!(process.env.SHEET_ID);

  res.status(200).json({
    discord,
    sheets: sheets && sheetId,
    sheetId: sheetId ? 'configured' : 'missing',
    cronSecret: !!process.env.CRON_SECRET,
  });
};
