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
      console.warn('⚠️  No Discord webhook configured, skipping alert');
      return;
    }

    const grouped = this._groupByCapacity(deals);

    for (const [capacity, capacityDeals] of Object.entries(grouped)) {
      const embed = this._buildEmbed(capacity, capacityDeals);
      await axios.post(this.WEBHOOK_URL, { embeds: [embed] });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  }

  _groupByCapacity(deals) {
    return deals.reduce((acc, deal) => {
      if (!acc[deal.capacity]) {
        acc[deal.capacity] = [];
      }
      acc[deal.capacity].push(deal);
      return acc;
    }, {});
  }

  _buildEmbed(capacity, deals) {
    const topDeals = deals.slice(0, 5); // Top 5 deals to stay under Discord limits
    const thresholds = { '32GB': 100, '64GB': 200, '128GB': 500 };
    const threshold = thresholds[capacity] || '?';

    let description = `Found **${deals.length}** deals under threshold ($${threshold}/stick)\n\n`;

    topDeals.forEach((deal, idx) => {
      const stickLabel = deal.stickCount > 1 ? `(${deal.stickCount}x)` : '(1x)';
      const title = deal.title.length > 80 ? deal.title.substring(0, 77) + '...' : deal.title;
      description += `**#${idx + 1}** - $${deal.perStickCost}/stick ${stickLabel}\n`;
      description += `[${title}](${deal.link})\n`;
      description += `$${deal.price} | ${deal.condition}\n\n`;
    });

    if (deals.length > 5) {
      description += `_...and ${deals.length - 5} more deals (see Google Sheet)_\n`;
    }

    const now = new Date();
    const pstTime = now.toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return {
      title: `🎯 ${capacity} DDR4 Deals Detected`,
      description: description,
      color: 0x1abc9c, // Teal/cyan color for the left border
      timestamp: new Date().toISOString(),
      footer: {
        text: `eBay DDR4 Scraper | Auto-logged to sheet | ${pstTime}`,
      },
    };
  }
}

module.exports = DiscordWebhook;
