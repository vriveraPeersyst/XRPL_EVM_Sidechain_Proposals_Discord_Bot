const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { scrapeAllProposals } = require('./utils/cosmosGovApi');
const validateProposals = require('./validateProposals');
require('dotenv').config();
const cron = require('node-cron');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const knownProposalsFile = 'knownProposals.json';
const scrapedProposalsFile = 'scrapedProposals.json';

let knownProposals = {};
let scrapedProposals = {};

// Load files
if (fs.existsSync(knownProposalsFile)) {
  knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
  console.log('Loaded knownProposals:', JSON.stringify(knownProposals, null, 2));
}
if (fs.existsSync(scrapedProposalsFile)) {
  scrapedProposals = JSON.parse(fs.readFileSync(scrapedProposalsFile, 'utf-8'));
  console.log('Loaded scrapedProposals:', JSON.stringify(scrapedProposals, null, 2));
}

client.once('ready', async () => {
  console.log('Bot is ready!');

  async function executeTasks() {
    if (executeTasks.isRunning) {
      console.log('Previous execution still running. Skipping this interval.');
      return;
    }

    executeTasks.isRunning = true;

    try {
      console.log('Starting scrape proposals...');
      await scrapeAllProposals(scrapedProposals, knownProposals, client);
      console.log('Scrape proposals completed.');

      saveScrapedProposals(scrapedProposals);

      console.log('Starting validate proposals...');
      await validateProposals(client, knownProposals, scrapedProposals);
      console.log('Validate proposals completed.');

      Object.assign(knownProposals, scrapedProposals);
      saveKnownProposals(knownProposals);
    } catch (error) {
      console.error('Error in scrape and validate proposals:', error);
    } finally {
      executeTasks.isRunning = false;
    }
  }

  cron.schedule('* * * * *', () => {
    console.log('Cron job triggered at', new Date().toLocaleString());
    executeTasks();
  });

  await executeTasks();
});

function saveKnownProposals(proposals) {
  try {
    fs.writeFileSync(knownProposalsFile, JSON.stringify(proposals, null, 2));
    console.log('Known proposals updated and saved to file.');
  } catch (error) {
    console.error('Error saving known proposals:', error.message);
  }
}

function saveScrapedProposals(proposals) {
  try {
    fs.writeFileSync(scrapedProposalsFile, JSON.stringify(proposals, null, 2));
    console.log('Scraped proposals updated and saved to file.');
  } catch (error) {
    console.error('Error saving scraped proposals:', error.message);
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);
