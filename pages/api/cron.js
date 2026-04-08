export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized triggers
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'] || req.query.secret;

  if (!cronSecret || providedSecret !== cronSecret) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not set' });
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/jakelayam/ebaycrapper/actions/workflows/scrape.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (response.status === 204) {
      return res.status(200).json({ success: true, triggered: new Date().toISOString() });
    }

    const body = await response.text();
    return res.status(response.status).json({ error: body });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
