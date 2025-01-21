const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { scrapeAllProposals } = require('./utils/cosmosGovApi');
const validateProposals = require('./validateProposals');
require('dotenv').config();
const cron = require('node-cron');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const knownProposalsFile = 'knownProposals.json';

let knownProposals = {};

if (fs.existsSync(knownProposalsFile)) {
  knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

client.once('ready', async () => {
  console.log('Bot is ready!');

  console.log(`
  `);

  // Function to perform scraping and validation
  async function executeTasks() {
    if (executeTasks.isRunning) {
      console.log('Previous execution still running. Skipping this interval.');
      return;
    }

    executeTasks.isRunning = true;
    try {
      console.log('Starting scrape proposals...');
      await scrapeAllProposals(knownProposals, client);
      console.log('Scrape proposals completed');

      console.log('Starting validate proposals...');
      await validateProposals(client, knownProposals);
      console.log('Validate proposals completed.');
      
    } catch (error) {
      console.error('Error in scrape and validate proposals:', error);
    } finally {
      executeTasks.isRunning = false;
    }
  }

  // Schedule the task to run every minute
  cron.schedule('* * * * *', () => {
    console.log('Cron job triggered at', new Date().toLocaleString());
    executeTasks();
  });

  // Optionally, execute immediately on startup
  await executeTasks();
});

client.login(process.env.DISCORD_BOT_TOKEN);