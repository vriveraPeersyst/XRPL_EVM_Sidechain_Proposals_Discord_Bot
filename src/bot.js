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

  // Scrape all proposals
  await scrapeAllProposals(knownProposals, client);
  
  // Validate proposals after scraping
  validateProposals();

  // Save the known proposals to file
  saveKnownProposals(knownProposals);

  // Set interval to scrape and validate proposals periodically
  setInterval(async () => {
    await scrapeAllProposals(knownProposals, client);
    validateProposals();
    saveKnownProposals(knownProposals);
  }, 60000);

  // Initialize command handler after scraping and validating proposals
  commandHandler(client);
});

client.login(config.token);
