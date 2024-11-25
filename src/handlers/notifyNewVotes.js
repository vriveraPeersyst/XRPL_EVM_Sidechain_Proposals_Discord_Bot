const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '../../config/config.json'));



function notifyNewVotes(client, proposalKey, newVotes) {
    const channelId = config.channelid;
    const channel = client.channels.cache.get(channelId);
  
    if (!channel) {
      console.error(`Channel with ID ${channelId} not found. Make sure the bot has access.`);
      return;
    }
  
    const messageHeader = `📣 **NEW VOTES REGISTERED FOR PROPOSAL ${proposalKey}!**\n\n`;
    const messageBody = newVotes
      .map(
        (vote) =>
          `**Voter:** ${vote.name}\n**Vote:** ${vote.vote}\n`
      )
      .join('\n');
  
    const message = messageHeader + messageBody;
  
    channel
      .send(message)
      .then(() => console.log(`Notification sent for proposal ${proposalKey}`))
      .catch(error => console.error('Error sending message:', error));
  }
  

const knownProposalsFile = path.resolve(__dirname, '../../knownProposals.json');
let previousProposals = {};

// Load known proposals from file
if (fs.existsSync(knownProposalsFile)) {
  previousProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

module.exports = {
  notifyNewVotes,
};
