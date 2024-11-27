const fs = require('fs');
const path = require('path');
require('dotenv').config();

const knownProposalsFile = path.resolve(__dirname, '../../knownProposals.json');
let previousProposals = {};

if (fs.existsSync(knownProposalsFile)) {
  previousProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

function notifyNewProposal(client, proposalData) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);
  
  if (!channel) {
    console.error('Channel not found');
    return;
  }

  const message = `📣 **NEW PROPOSAL!**\n\n` +
                  `**Number:** ${proposalData.number}\n` +
                  `**Title:** ${proposalData.title}\n` +
                  `**State:** ${proposalData.state}\n` +
                  `**Submit Time:** ${proposalData.submitTime}\n` +
                  `**Deposit End Time:** ${proposalData.depositEndTime}\n` +
                  `**Voting Start Time:** ${proposalData.votingStartTime}\n` +
                  `**Voting End Time:** ${proposalData.votingEndTime}\n` +
                  `**Proposer:** ${proposalData.proposer}\n` +
                  `**Message:** ${proposalData.message}\n`;

  channel.send(message).catch(console.error);
}

module.exports = {
  notifyNewProposal,
};
