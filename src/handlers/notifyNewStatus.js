const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { EmbedBuilder } = require('discord.js');

const knownProposalsFile = path.resolve(__dirname, '../../knownProposals.json');
let previousProposals = {};

if (fs.existsSync(knownProposalsFile)) {
  previousProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

function notifyNewStatus(client, proposalKey, oldStatus, newStatus) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const governanceRoleId = process.env.DISCORD_GOVERNANCE_ROLE_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
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
    .setTitle(`📢 Status Update for Proposal ${proposalKey}`)
    .addFields(
      { name: 'Previous Status', value: formatStatus(oldStatus), inline: true },
      { name: 'New Status', value: formatStatus(newStatus), inline: true }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Proposal Status Update', iconURL: client.user.avatarURL() });

  channel.send({ content: `<@&${governanceRoleId}>`, embeds: [embed] })
    .then(() => console.log(`Status update notification sent for proposal ${proposalKey}`))
    .catch(error => console.error('Error sending message:', error));
}

module.exports = {
  notifyNewStatus,
};
