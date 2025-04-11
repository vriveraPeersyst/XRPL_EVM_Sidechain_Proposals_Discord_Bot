const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const threadMapFile = path.resolve(__dirname, '../../threadMap.json');

async function notifyNewVotes(client, proposalKey, newVotes, currentVotes = []) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  // Reload threadMap from disk
  let threadMap = {};
  try {
    if (fs.existsSync(threadMapFile)) {
      threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
      console.log("Reloaded threadMap from disk:", threadMap);
    }
  } catch (error) {
    console.error('Error reading threadMap from disk:', error);
  }

  // Retrieve the threadId from the freshly loaded threadMap
  const threadId = threadMap[proposalKey]?.threadId;
  console.log("Found threadId in threadMap:", threadId);

  if (!threadId) {
    console.error(`Thread ID not found in threadMap for Proposal ${proposalKey}`);
    return;
  }

  // Instead of relying on the cache, fetch the thread from Discord
  let thread;
  try {
    thread = await channel.threads.fetch(threadId);
  } catch (error) {
    console.error(`Failed to fetch thread for Proposal ${proposalKey} with ID ${threadId}`, error);
    return;
  }

  if (!thread) {
    console.error(`Thread not found or could not be fetched for Proposal ${proposalKey}`);
    return;
  }

  const allVotes = [...currentVotes, ...newVotes];
  const getVoteEmoji = (vote) => {
    if (vote.includes('yes')) return '✅';
    if (vote.includes('no')) return '❌';
    if (vote.includes('no_with_veto')) return '🛑';
    if (vote.includes('abstain')) return '🔵';
    return '❓';
  };

  const totalYes = allVotes.filter(v => v.vote.includes('yes')).length;
  const totalNo = allVotes.filter(v => v.vote.includes('no')).length;
  const totalVeto = allVotes.filter(v => v.vote.includes('no_with_veto')).length;
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
