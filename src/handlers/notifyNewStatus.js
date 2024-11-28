const path = require('path');
require('dotenv').config();

function notifyNewStatus(client, proposalKey, oldStatus, newStatus) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error(`Channel with ID ${channelId} not found. Make sure the bot has access.`);
    return;
  }

  const statusMap = {
    PROPOSAL_STATUS_UNSPECIFIED: { emoji: '❓', label: 'Unspecified' },
    PROPOSAL_STATUS_DEPOSIT_PERIOD: { emoji: '💰', label: 'Deposit Period' },
    PROPOSAL_STATUS_VOTING_PERIOD: { emoji: '🗳', label: 'Voting Period' },
    PROPOSAL_STATUS_PASSED: { emoji: '✅', label: 'Passed' },
    PROPOSAL_STATUS_REJECTED: { emoji: '❌', label: 'Rejected' },
    PROPOSAL_STATUS_FAILED: { emoji: '🛑', label: 'Failed' },
  };

  const formatStatus = (status) => {
    const mappedStatus = statusMap[status] || { emoji: 'ℹ️', label: 'Unknown Status' };
    return `${mappedStatus.emoji} ${mappedStatus.label}`;
  };

  const message = `📢 **Status Update for Proposal ${proposalKey}!**\n\n` +
                  `🔄 **Previous Status**: ${formatStatus(oldStatus)}\n` +
                  `✅ **New Status**: ${formatStatus(newStatus)}\n` +
                  `\n📖 Stay tuned for further updates!`;

  channel.send(message)
    .then(() => console.log(`Status update notification sent for proposal ${proposalKey}`))
    .catch(error => console.error('Error sending message:', error));
}

module.exports = {
  notifyNewStatus,
};
