const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { EmbedBuilder } = require('discord.js');

const knownProposalsFile = path.resolve(__dirname, '../../knownProposals.json');
let previousProposals = {};

if (fs.existsSync(knownProposalsFile)) {
  previousProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

/**
 * Format a date to UTC with minutes only.
 * 
 * @param {string} date - ISO string or Date object
 * @returns {string} Formatted date string
 */
function formatUTCDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function notifyNewProposal(client, proposalData) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  const statusMap = {
    PROPOSAL_STATUS_UNSPECIFIED: { label: 'Unspecified' },
    PROPOSAL_STATUS_DEPOSIT_PERIOD: { label: 'Depositing' },
    PROPOSAL_STATUS_VOTING_PERIOD: { label: 'Voting' },
    PROPOSAL_STATUS_PASSED: { label: 'Passed' },
    PROPOSAL_STATUS_REJECTED: { label: 'Rejected' },
    PROPOSAL_STATUS_FAILED: { label: 'Failed' },
  };

  const formatStatus = (status) => {
    const mappedStatus = statusMap[status] || { label: 'Unknown Status' };
    return `${mappedStatus.label}`;
  };

  const embed = new EmbedBuilder()
    .setTitle(`[${formatStatus(proposalData.state)}] ${proposalData.number} ${proposalData.title}`)
    .setDescription(proposalData.message || 'No summary provided.')
    .addFields(
      { name: 'Proposer', value: proposalData.proposer, inline: true },
      { name: 'Voting Ends:', value: `${formatUTCDate(proposalData.votingEndTime)}`, inline: true },
      {
        name: 'Voting Results',
        value:
          `✅ Yes: ${proposalData.votes.filter(v => v.vote.includes('yes')).length}\n` +
          `❌ No: ${proposalData.votes.filter(v => v.vote.includes('no')).length}\n` +
          `🛑 Veto: ${proposalData.votes.filter(v => v.vote.includes('veto')).length}\n` +
          `🔵 Abstain: ${proposalData.votes.filter(v => v.vote.includes('abstain')).length}`,
        inline: false,
      }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Proposal Notification', iconURL: client.user.avatarURL() });

    channel.send({ embeds: [embed] }).catch(console.error);
}

module.exports = {
  notifyNewProposal,
};
