const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const threadMapFile = path.resolve(__dirname, '../../threadMap.json'); // File to store thread IDs
let threadMap = {};

// Load existing thread IDs from file
if (fs.existsSync(threadMapFile)) {
  threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
}

function formatUTCDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

async function notifyNewProposal(client, proposalData) {
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

  const proposalUrl = `https://governance.xrplevm.org/xrplevm/proposals/${proposalData.number}`;
  const embed = new EmbedBuilder()
    .setTitle(`[${formatStatus(proposalData.state)}] #${proposalData.number} - ${proposalData.title}`)
    .setDescription(`[View Proposal Here](${proposalUrl})\n\n${proposalData.message || 'No summary provided.'}`)
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
        inline: false
      }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Proposal Notification', iconURL: client.user.avatarURL() });

  const message = await channel.send({ embeds: [embed] });
  const thread = await message.startThread({
    name: `Proposal #${proposalData.number} Updates`,
    autoArchiveDuration: 1440, // 24 hours
  });

  // Save the thread ID for this proposal
  threadMap[proposalData.number] = thread.id;
  fs.writeFileSync(threadMapFile, JSON.stringify(threadMap, null, 2), 'utf-8');

  console.log(`Thread created for Proposal #${proposalData.number}: ${thread.id}`);
}

module.exports = {
  notifyNewProposal,
};
