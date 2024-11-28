const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { EmbedBuilder } = require('discord.js');

const knownProposalsFile = path.resolve(__dirname, '../../knownProposals.json');
let previousProposals = {};

// Load known proposals from file if it exists
if (fs.existsSync(knownProposalsFile)) {
  previousProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
}

/**
 * Sends a notification for new votes on a proposal, including total vote counts.
 * 
 * @param {object} client - Discord client instance
 * @param {string} proposalKey - The proposal identifier
 * @param {array} newVotes - Array of newly registered votes
 * @param {array} allVotes - Array of all votes for the proposal
 */
function notifyNewVotes(client, proposalKey, newVotes, allVotes = []) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  // Ensure allVotes is an array
  if (!Array.isArray(allVotes)) {
    console.error(`Invalid allVotes input for proposal ${proposalKey}:`, allVotes);
    allVotes = [];
  }

  const getVoteEmoji = (vote) => {
    if (vote.includes('yes')) return '✅';
    if (vote.includes('no')) return '❌';
    if (vote.includes('veto')) return '🛑';
    if (vote.includes('abstain')) return '🔵';
    return '❓'; // Fallback for unknown vote types
  };

  // Calculate total votes
  const totalYes = allVotes.filter(v => v.vote.includes('yes')).length;
  const totalNo = allVotes.filter(v => v.vote.includes('no')).length;
  const totalVeto = allVotes.filter(v => v.vote.includes('veto')).length;
  const totalAbstain = allVotes.filter(v => v.vote.includes('abstain')).length;

  // Construct the embed message
  const embed = new EmbedBuilder()
    .setTitle(`📢 New Votes Registered for Proposal ${proposalKey}`)
    .setDescription(
      newVotes.map(vote => `${getVoteEmoji(vote.vote)} **${vote.name}**`).join('\n') || 'No new votes.'
    )
    .addFields(
      { name: 'Current Voting Results', value: `✅ Yes: ${totalYes}\n❌ No: ${totalNo}\n🛑 Veto: ${totalVeto}\n🔵 Abstain: ${totalAbstain}`, inline: false }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Vote Update Notification', iconURL: client.user.avatarURL() });

  // Send the embed message
  channel.send({ embeds: [embed] })
    .then(() => console.log(`Notification sent for proposal ${proposalKey}`))
    .catch(error => console.error('Error sending message:', error));
}

module.exports = {
  notifyNewVotes,
};
