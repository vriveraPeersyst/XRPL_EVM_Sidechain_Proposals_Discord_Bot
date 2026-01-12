const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const threadMapFile = path.resolve(__dirname, '../../threadMap.json');

function formatStatus(status) {
  const statusMap = {
    PROPOSAL_STATUS_UNSPECIFIED: { emoji: '❓', label: 'Unspecified' },
    PROPOSAL_STATUS_DEPOSIT_PERIOD: { emoji: '💰', label: 'Depositing' },
    PROPOSAL_STATUS_VOTING_PERIOD: { emoji: '🗳', label: 'Voting' },
    PROPOSAL_STATUS_PASSED: { emoji: '✅', label: 'Passed' },
    PROPOSAL_STATUS_REJECTED: { emoji: '❌', label: 'Rejected' },
    PROPOSAL_STATUS_FAILED: { emoji: '🛑', label: 'Failed' },
  };

  const mappedStatus = statusMap[status] || { emoji: 'ℹ️', label: 'Unknown Status' };
  return `[${mappedStatus.label}]`;
}

function formatUTCDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

async function notifyNewStatus(client, proposalKey, oldStatus, newStatus, newVotingEndTime) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  // Reload threadMap from disk to get the latest data
  let threadMap = {};
  try {
    if (fs.existsSync(threadMapFile)) {
      threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
      console.log("Reloaded threadMap from disk for status update:", threadMap);
    }
  } catch (error) {
    console.error('Error reading threadMap from disk:', error);
    return;
  }

  const threadInfo = threadMap[proposalKey];
  if (!threadInfo) {
    console.error(`No thread info found for Proposal ${proposalKey}`);
    return;
  }

  const { threadId, messageId } = threadInfo;
  
  // Fetch the thread from Discord instead of relying on cache
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

  // Step 1: Edit the intro message of the thread
  const introMessage = await channel.messages.fetch(messageId);

  if (!introMessage) {
    console.error(`Intro message not found for Proposal ${proposalKey}`);
    return;
  }

  const embed = introMessage.embeds[0];
  if (!embed) {
    console.error(`No embed found in the intro message for Proposal ${proposalKey}`);
    return;
  }

  // Update the embed title with the new status
  const updatedTitle = embed.title.replace(/\[.*?\]/, formatStatus(newStatus));

  // Update the embed fields, including Voting Ends if applicable
  const updatedFields = embed.fields.map(field => {
    if (field.name === 'Voting Ends:' && newVotingEndTime) {
      return { ...field, value: formatUTCDate(newVotingEndTime) };
    }
    return field;
  });

  // Create the updated embed
  const updatedIntroEmbed = EmbedBuilder.from(embed)
    .setTitle(updatedTitle)
    .setFields(updatedFields);

  // Edit the intro message
  await introMessage.edit({ embeds: [updatedIntroEmbed] });
  console.log(`Edited intro message for Proposal ${proposalKey} with new status.`);

  // Step 2: Send a new message to the thread with the status update
  const statusMap = {
    PROPOSAL_STATUS_UNSPECIFIED: { emoji: '❓', label: 'Unspecified' },
    PROPOSAL_STATUS_DEPOSIT_PERIOD: { emoji: '💰', label: 'Deposit Period' },
    PROPOSAL_STATUS_VOTING_PERIOD: { emoji: '🗳', label: 'Voting Period' },
    PROPOSAL_STATUS_PASSED: { emoji: '✅', label: 'Passed' },
    PROPOSAL_STATUS_REJECTED: { emoji: '❌', label: 'Rejected' },
    PROPOSAL_STATUS_FAILED: { emoji: '🛑', label: 'Failed' },
  };

  const formatThreadStatus = (status) => {
    const mappedStatus = statusMap[status] || { emoji: 'ℹ️', label: 'Unknown Status' };
    return `${mappedStatus.emoji} ${mappedStatus.label}`;
  };

  const threadEmbed = new EmbedBuilder()
    .setTitle(`Proposal ${proposalKey} Status Update`)
    .addFields(
      { name: 'Previous Status', value: formatThreadStatus(oldStatus), inline: true },
      { name: 'New Status', value: formatThreadStatus(newStatus), inline: true }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Proposal Status Update', iconURL: client.user.avatarURL() });

  if (newVotingEndTime) {
    threadEmbed.addFields({ name: 'Updated Voting Ends:', value: formatUTCDate(newVotingEndTime), inline: false });
  }

  await thread.send({ embeds: [threadEmbed] });
  console.log(`Sent status update message to thread for Proposal ${proposalKey}.`);
}

module.exports = {
  notifyNewStatus,
};
