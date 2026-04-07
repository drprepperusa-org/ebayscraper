#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');

const home = process.env.HOME || process.env.USERPROFILE;
const GOOGLE_DIR = path.join(home, '.openclaw', 'google');
const CRED_PATH = path.join(GOOGLE_DIR, 'credentials.json');
const TOKEN_PATH = path.join(GOOGLE_DIR, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function main() {
  const creds = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
  const config = creds.installed || creds.web;

  const oauth2Client = new google.auth.OAuth2(
    config.client_id,
    config.client_secret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nAfter authorizing, Google will show you a code.');
  console.log('Paste that code below:\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter code: ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oauth2Client.getToken(code.trim());
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log(`\n✅ Token saved to: ${TOKEN_PATH}`);

      const credsStr = fs.readFileSync(CRED_PATH, 'utf8').replace(/\n/g, '').replace(/\s+/g, '');
      const tokenStr = JSON.stringify(tokens);
      console.log(`\n📋 For your .env:\n`);
      console.log(`GOOGLE_CREDENTIALS=${credsStr}`);
      console.log(`GOOGLE_TOKEN=${tokenStr}`);
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  });
}

main().catch(console.error);
