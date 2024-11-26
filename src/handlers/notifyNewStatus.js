const path = require('path');
const config = require(path.resolve(__dirname, '../../config/config.json'));

function notifyNewStatus(client, proposalKey, oldStatus, newStatus) {
  const channelId = config.channelid;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error(`Channel with ID ${channelId} not found. Make sure the bot has access.`);
    return;
  }

  const message = `📣 **STATUS UPDATE FOR PROPOSAL ${proposalKey}!**\n\n` +
                  `**Previous Status:** ${oldStatus}\n` +
                  `**New Status:** ${newStatus}\n`;

  channel.send(message)
    .then(() => console.log(`Status update notification sent for proposal ${proposalKey}`))
    .catch(error => console.error('Error sending message:', error));
}

module.exports = {
  notifyNewStatus,
};
