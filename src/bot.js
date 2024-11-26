const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { scrapeAllProposals } = require('./utils/puppeteerUtils');
const validateProposals = require('./validateProposals');
const config = require(path.resolve(__dirname, '../config/config.json'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const channelId = config.channelid;
const knownProposalsFile = 'knownProposals.json';

let knownProposals = {};

if (fs.existsSync(knownProposalsFile)) {
  knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

client.once('ready', async () => {
  console.log('Bot is ready!');

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

  startContinuousExecution();
});

async function startContinuousExecution() {
  while (true) {
    try {
      console.log('Starting scrape and validate proposals...');

      await scrapeAllProposals(knownProposals, client);

      await validateProposals(client, knownProposals);

    } catch (error) {
      console.error('Error in scrape and validate proposals:', error);
    }
  }
}

client.login(config.token);