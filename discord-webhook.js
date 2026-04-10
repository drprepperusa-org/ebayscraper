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
      const key = deal.searchQuery || deal.product || deal.capacity || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(deal);
      return acc;
    }, {});
  }

  _buildEmbed(product, deals) {
    const topDeals = deals.slice(0, 10);
    const maxPrice = deals[0]?.maxPrice || '?';
    const isRAM = deals[0]?.type === 'ram';
    const priceLabel = isRAM ? '/stick' : '';

    let description = `Found **${deals.length}** deals under $${maxPrice}${priceLabel}\n\n`;

    topDeals.forEach((deal, idx) => {
      const title = deal.title.length > 80 ? deal.title.substring(0, 77) + '...' : deal.title;
      if (isRAM) {
        const stickLabel = deal.stickCount > 1 ? `(${deal.stickCount}x)` : '(1x)';
        const perStick = deal.perStickCost || deal.price;
        description += `**#${idx + 1}** - **$${perStick}/stick** ${stickLabel}\n`;
        description += `[${title}](${deal.link})\n`;
        description += `Total: $${deal.price} | ${deal.condition}\n\n`;
      } else {
        description += `**#${idx + 1}** - **$${deal.price}**\n`;
        description += `[${title}](${deal.link})\n`;
        description += `${deal.condition} | ${deal.seller || 'Unknown seller'}\n\n`;
      }
    });

    if (deals.length > 10) {
      description += `_...and ${deals.length - 10} more (see dashboard)_\n`;
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
