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

  const statusMap = {
    PROPOSAL_STATUS_UNSPECIFIED: { emoji: '❓', label: 'Unspecified' },
    PROPOSAL_STATUS_DEPOSIT_PERIOD: { emoji: '💰', label: 'Deposit Period' },
    PROPOSAL_STATUS_VOTING_PERIOD: { emoji: '🗳', label: 'Voting' },
    PROPOSAL_STATUS_PASSED: { emoji: '✅', label: 'Passed' },
    PROPOSAL_STATUS_REJECTED: { emoji: '❌', label: 'Rejected' },
    PROPOSAL_STATUS_FAILED: { emoji: '🛑', label: 'Failed' },
  };

  const formatStatus = (status) => {
    const mappedStatus = statusMap[status] || { emoji: 'ℹ️', label: 'Unknown Status' };
    return `${mappedStatus.emoji} ${mappedStatus.label}`;
  };

  const getVoteEmoji = (vote) => {
    if (vote.includes('yes')) return '✅';
    if (vote.includes('no')) return '❌';
    if (vote.includes('veto')) return '🛑';
    if (vote.includes('abstain')) return '🔵';
    return '❓'; // Fallback for unknown vote types
  };

  const message = `📢 **[${formatStatus(proposalData.state)}] Proposal ${proposalData.number} - ${proposalData.title}**\n` +
                  `> **Summary**: ${proposalData.message || 'No summary provided.'}\n` +
                  `> **Proposer**: ${proposalData.proposer}\n` +
                  `> 🗳 **Voting Period**: ${proposalData.votingStartTime} → ${proposalData.votingEndTime}\n` +
                  `> 💰 **Deposit Period**: ${proposalData.submitTime} → ${proposalData.depositEndTime}\n\n` +
                  `### Voting Results\n` +
                  `✅ Yes: ${proposalData.votes.filter(vote => vote.vote.includes('yes')).length}\n` +
                  `❌ No: ${proposalData.votes.filter(vote => vote.vote.includes('no')).length}\n` +
                  `🛑 Veto: ${proposalData.votes.filter(vote => vote.vote.includes('veto')).length}\n` +
                  `🔵 Abstain: ${proposalData.votes.filter(vote => vote.vote.includes('abstain')).length}\n\n` +
                  `### Vote Details\n` +
                  `${proposalData.votes.map(v => `${getVoteEmoji(v.vote)} ${v.name}`).join('\n')}`;

  channel.send(message).catch(console.error);
}

module.exports = {
  notifyNewProposal,
};
