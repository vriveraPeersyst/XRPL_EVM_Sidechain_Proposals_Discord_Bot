const fs = require('fs');
const path = require('path');
require('dotenv').config();



function notifyNewVotes(client, proposalKey, newVotes) {
    const channelId = process.env.DISCORD_CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);
  
    if (!channel) {
      console.error(`Channel with ID ${channelId} not found. Make sure the bot has access.`);
      return;
    }
  
    const getVoteEmoji = (vote) => {
      if (vote.includes('yes')) return '✅';
      if (vote.includes('no')) return '❌';
      if (vote.includes('veto')) return '🛑';
      if (vote.includes('abstain')) return '🔵';
      return '❓'; // Fallback for unknown vote types
    };
  
    const messageHeader = `📢 **New Votes Registered for Proposal ${proposalKey}!**\n\n`;
    const messageBody = newVotes
      .map(vote => `${getVoteEmoji(vote.vote)} **${vote.name}**`)
      .join('\n');
  
    const message = messageHeader + `### Vote Details\n` + messageBody;
  
  
    channel
      .send(message)
      .then(() => console.log(`Notification sent for proposal ${proposalKey}`))
      .catch(error => console.error('Error sending message:', error));
  }

const knownProposalsFile = path.resolve(__dirname, '../../knownProposals.json');
let previousProposals = {};

if (fs.existsSync(knownProposalsFile)) {
  previousProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

module.exports = {
  notifyNewVotes,
};
