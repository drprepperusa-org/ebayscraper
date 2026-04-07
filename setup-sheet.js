#!/usr/bin/env node
/**
 * One-time setup: adds headers to Google Sheets if they don't exist
 * Run once before deploying the scraper
 */

const GoogleSheetsClient = require('./google-sheets-client');

async function setupSheet() {
  try {
    const sheetsClient = new GoogleSheetsClient();

    // Check if headers already exist
    const existingHeaders = await sheetsClient.checkHeaders();

    if (existingHeaders && Array.isArray(existingHeaders) && existingHeaders.length > 0) {
      console.log('✅ Headers already exist:');
      console.log(existingHeaders.join(' | '));
      return;
    }

    console.log('📝 Creating headers...');
    // Create headers
    const headers = await sheetsClient.createHeaders();
    console.log('✅ Headers initialized:');
    console.log(headers.join(' | '));
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupSheet();
