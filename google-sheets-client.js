const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

class GoogleSheetsClient {
  constructor() {
    this.SHEET_ID = process.env.SHEET_ID || '1DsIADrgk7gIWBQEfDy4suY4DFRk4l4gjIv6YeC0_Aps';
    this.SHEET_NAME = 'Sheet1';
    this.credentials = this.loadCredentials();
  }

  loadCredentials() {
    // Prefer environment variables (for Vercel / serverless)
    if (process.env.GOOGLE_CREDENTIALS && process.env.GOOGLE_TOKEN) {
      const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      const token = JSON.parse(process.env.GOOGLE_TOKEN);
      return { token, creds };
    }

    // Fallback to filesystem (for local development)
    const home = process.env.HOME || process.env.USERPROFILE;
    const tokenPath = path.join(home, '.openclaw', 'google', 'token.json');
    const credPath = path.join(home, '.openclaw', 'google', 'credentials.json');

    if (!fs.existsSync(tokenPath)) {
      throw new Error(`Google token not found at ${tokenPath}. Set GOOGLE_TOKEN env var for serverless.`);
    }

    if (!fs.existsSync(credPath)) {
      throw new Error(`Google credentials not found at ${credPath}. Set GOOGLE_CREDENTIALS env var for serverless.`);
    }

    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));

    return { token, creds };
  }

  getAuthClient() {
    const { token, creds } = this.credentials;
    const oauth2Client = new google.auth.OAuth2(
      creds.installed.client_id,
      creds.installed.client_secret,
      creds.installed.redirect_uris[0]
    );

    oauth2Client.setCredentials(token);
    return oauth2Client;
  }

  async appendDeals(deals) {
    const auth = this.getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    if (!deals || deals.length === 0) {
      console.log('No deals to append');
      return;
    }

    const rows = deals.map(deal => [
      deal.timestamp,
      deal.capacity,
      deal.title,
      deal.price,
      deal.stickCount,
      deal.perStickCost,
      deal.condition,
      deal.seller,
      deal.link,
      deal.alertedAt,
    ]);

    const request = {
      spreadsheetId: this.SHEET_ID,
      range: `${this.SHEET_NAME}!A2`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: rows,
      },
    };

    try {
      const response = await sheets.spreadsheets.values.append(request);
      console.log(`✅ Appended ${rows.length} deals to Google Sheets`);
      return response;
    } catch (error) {
      console.error('❌ Failed to append to Sheets:', error.message);
      throw error;
    }
  }

  async checkHeaders() {
    const auth = this.getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.SHEET_ID,
        range: `${this.SHEET_NAME}!A1:J1`,
      });
      return response.data.values?.[0] || [];
    } catch (error) {
      if (error.message.includes('Unable to parse range')) {
        console.log('⚠️ Sheet does not exist yet or headers not created');
        return null;
      }
      console.error('❌ Failed to check headers:', error.message);
      return [];
    }
  }

  async createHeaders() {
    const auth = this.getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const headers = [
      'Timestamp (UTC)',
      'Capacity',
      'Title',
      'Price ($)',
      'Stick Count',
      'Per-Stick Cost ($)',
      'Condition',
      'Seller',
      'eBay Link',
      'Alerted At (PST)',
    ];

    try {
      // First, create the sheet if it doesn't exist
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.SHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Sheet1',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 10,
                  },
                },
              },
            },
          ],
        },
      });

      console.log('✅ Sheet1 created');

      // Now update the header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.SHEET_ID,
        range: `'Sheet1'!A1:J1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers],
        },
      });
      console.log('✅ Headers written to sheet');
      return headers;
    } catch (error) {
      // If the error is that the sheet already exists, just write the headers
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️ Sheet already exists, writing headers...');
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.SHEET_ID,
            range: `'Sheet1'!A1:J1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [headers],
            },
          });
          console.log('✅ Headers written to sheet');
          return headers;
        } catch (innerError) {
          console.error('❌ Failed to write headers:', innerError.message);
          throw innerError;
        }
      }
      console.error('❌ Failed to create headers:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleSheetsClient;
