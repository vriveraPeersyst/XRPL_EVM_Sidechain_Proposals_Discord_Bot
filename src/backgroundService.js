const puppeteerUtils = require('./utils/puppeteerUtils');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '../config/config.json'));
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const channelId = config.channelid;
let knownProposals = {};

async function checkForNewProposals() {
  try {
    await puppeteerUtils.scrapeAllProposals(knownProposals);

    for (const proposalNumber in knownProposals) {
      const proposalData = knownProposals[proposalNumber];

      if (proposalData.state === 'Active') {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
          await channel.send(`
**New Proposal**
**Proposal Number**: ${proposalData.number}
**Title**: ${proposalData.title}
**State**: ${proposalData.state}
**Voting Start Time**: ${proposalData.votingStartTime}
**Voting End Time**: ${proposalData.votingEndTime}
**Proposer**: ${proposalData.proposer}
          `);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for new proposals:', error.message);
  }
}

client.once('ready', () => {
  console.log('Bot is ready!');

  if (fs.existsSync('knownProposals.json')) {
    try {
      knownProposals = JSON.parse(fs.readFileSync('knownProposals.json', 'utf-8'));
      console.log('Known proposals loaded from file:', knownProposals);
    } catch (error) {
      console.error('Error loading known proposals from file:', error.message);
    }
  }

  setInterval(checkForNewProposals, 60000);
});

client.login(process.env.DISCORD_BOT_TOKEN);
