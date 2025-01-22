const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const threadMapFile = path.resolve(__dirname, '../../threadMap.json');
let threadMap = {};

console.log(threadMap);

// Load thread IDs from file
if (fs.existsSync(threadMapFile)) {
  threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
}

function notifyNewVotes(client, proposalKey, newVotes, currentVotes = []) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  const threadId = threadMap[proposalKey]?.threadId;
  if (!threadId) {
    console.error(`Thread ID not found in threadMap for Proposal ${proposalKey}`);
    return;
  }
  const thread = channel.threads.cache.get(threadId);

  if (!thread) {
    console.error(`Thread not found for Proposal ${proposalKey}`);
    return;
  }

  const allVotes = [...currentVotes, ...newVotes];
  const getVoteEmoji = (vote) => {
    if (vote.includes('yes')) return '✅';
    if (vote.includes('no')) return '❌';
    if (vote.includes('veto')) return '🛑';
    if (vote.includes('abstain')) return '🔵';
    return '❓';
  };

  const totalYes = allVotes.filter(v => v.vote.includes('yes')).length;
  const totalNo = allVotes.filter(v => v.vote.includes('no')).length;
  const totalVeto = allVotes.filter(v => v.vote.includes('veto')).length;
  const totalAbstain = allVotes.filter(v => v.vote.includes('abstain')).length;

  const embed = new EmbedBuilder()
    .setTitle(`New Votes! Proposal ${proposalKey}`)
    .setDescription(
      newVotes.map(vote => `${getVoteEmoji(vote.vote)} **${vote.name}**`).join('\n') || 'No new votes.'
    )
    .addFields(
      { name: 'Current Voting Results', value: `✅ Yes: ${totalYes}\n❌ No: ${totalNo}\n🛑 Veto: ${totalVeto}\n🔵 Abstain: ${totalAbstain}`, inline: false }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Vote Update Notification', iconURL: client.user.avatarURL() });

  thread.send({ embeds: [embed] })
    .then(() => console.log(`Vote update notification sent for Proposal #${proposalKey}`))
    .catch(error => console.error('Error sending message:', error));
}

module.exports = {
  notifyNewVotes,
};
