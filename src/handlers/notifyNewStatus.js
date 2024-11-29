const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const threadMapFile = path.resolve(__dirname, '../../threadMap.json');
let threadMap = {};

// Load thread IDs from file
if (fs.existsSync(threadMapFile)) {
  threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
}

function notifyNewStatus(client, proposalKey, oldStatus, newStatus) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  const threadId = threadMap[proposalKey.replace(
    '#',
    ''
  )];
  const thread = channel.threads.cache.get(threadId);

  if (!thread) {
    console.error(`Thread not found for Proposal #${proposalKey}`);
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

  const embed = new EmbedBuilder()
    .setTitle(`Proposal ${proposalKey} Status Update`)
    .addFields(
      { name: 'Previous Status', value: formatStatus(oldStatus), inline: true },
      { name: 'New Status', value: formatStatus(newStatus), inline: true }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Proposal Status Update', iconURL: client.user.avatarURL() });

  thread.send({ embeds: [embed] })
    .then(() => console.log(`Status update notification sent for Proposal #${proposalKey}`))
    .catch(error => console.error('Error sending message:', error));
}

module.exports = {
  notifyNewStatus,
};
