const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { scrapeAllProposals, saveKnownProposals } = require('./utils/puppeteerUtils');
const validateProposals = require('./validateProposals');
const config = require(path.resolve(__dirname, '../config/config.json'));
const commandHandler = require('./handlers/commandHandler');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const channelId = config.channelid;
const knownProposalsFile = 'knownProposals.json';

let knownProposals = {};

// Load known proposals from file
if (fs.existsSync(knownProposalsFile)) {
  knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

client.once('ready', async () => {
  console.log('Bot is ready!');

  // Log commands information at startup
  console.log(`
    Active Proposals

    Name: activeproposals
    Description: Lists all active proposals.
    Usage: !activeproposals

    Explain AI

    Name: explainai
    Description: Get an AI-generated explanation for a proposal message.
    Usage: !explainai <proposal_number>

    Proposal Information

    Name: proposal
    Description: Get information about a specific proposal.
    Usage: !proposal <proposal_number>

    Proposal Votes

    Name: proposalvotes
    Description: Get validator votes for a specific proposal.
    Usage: !proposalvotes <proposal_number>
  `);

  // Initialize command handler
  commandHandler(client);

  // Start the continuous execution
  startContinuousExecution();
});

async function startContinuousExecution() {
  while (true) {
    try {
      console.log('Starting scrape and validate proposals...');

      // Scrape all proposals
      await scrapeAllProposals(knownProposals, client);

      // Validate proposals after scraping
      await validateProposals(client, knownProposals);

      // Optionally save known proposals to file
      // saveKnownProposals(knownProposals);

    } catch (error) {
      console.error('Error in scrape and validate proposals:', error);
    }
    // Immediately proceed to the next iteration
  }
}

client.login(config.token);