const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DiscordWebhook {
  constructor() {
    this.WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || this.loadWebhookUrl();
  }

  loadWebhookUrl() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      const match = env.match(/DISCORD_WEBHOOK_URL=(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
    throw new Error('DISCORD_WEBHOOK_URL not found in .env');
  }

  async sendDeals(deals) {
    if (!this.WEBHOOK_URL) {
      console.warn('No Discord webhook configured, skipping alert');
      return;
    }

    const grouped = this._groupByProduct(deals);

    for (const [product, productDeals] of Object.entries(grouped)) {
      const embed = this._buildEmbed(product, productDeals);
      await axios.post(this.WEBHOOK_URL, { embeds: [embed] });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  _groupByProduct(deals) {
    return deals.reduce((acc, deal) => {
      const key = deal.product || deal.capacity || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(deal);
      return acc;
    }, {});
  }

  _buildEmbed(product, deals) {
    const topDeals = deals.slice(0, 5);
    const maxPrice = deals[0]?.maxPrice || '?';

    let description = `Found **${deals.length}** deals under $${maxPrice}\n\n`;

    topDeals.forEach((deal, idx) => {
      const title = deal.title.length > 80 ? deal.title.substring(0, 77) + '...' : deal.title;
      description += `**#${idx + 1}** — **$${deal.price}**\n`;
      description += `[${title}](${deal.link})\n`;
      description += `${deal.condition}\n\n`;
    });

    if (deals.length > 5) {
      description += `_...and ${deals.length - 5} more (see Google Sheet)_\n`;
    }

    const now = new Date();
    const pstTime = now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    return {
      title: `${product} — ${deals.length} Deals`,
      description,
      color: 0x6c5ce7,
      timestamp: new Date().toISOString(),
      footer: {
        text: `OpenClaw eBay Scraper | ${pstTime}`,
      },
    };
  }
}

module.exports = DiscordWebhook;
