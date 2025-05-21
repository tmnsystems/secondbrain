#!/usr/bin/env node
// Deer-Flow Web UI smoke-test using Puppeteer
import puppeteer from 'puppeteer';

async function runTest() {
  console.log('▶️  Starting Deer-Flow UI smoke-test');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.waitForSelector('textarea, input');
  console.log('✅ UI loaded and basic selector found');
  await browser.close();
}

runTest().catch((err) => {
  console.error('❌ UI smoke-test failed:', err.message || err);
  process.exit(1);
});

// Error handler to surface failures
process.on('unhandledRejection', (reason) => {
  console.error('❌ UI smoke-test failed:', reason);
  process.exit(1);
});