/**
 * One-time script to retroactively update Discord threads for proposals
 * that missed their status updates due to the thread cache bug.
 * 
 * Run with: node src/fixMissedStatusUpdates.js
 */

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const knownProposalsFile = path.resolve(__dirname, '../knownProposals.json');
const threadMapFile = path.resolve(__dirname, '../threadMap.json');

// Proposals that need their status updates fixed
const PROPOSALS_TO_FIX = ['16', '17', '18'];

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

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

function formatThreadStatus(status) {
  const statusMap = {
    PROPOSAL_STATUS_UNSPECIFIED: { emoji: '❓', label: 'Unspecified' },
    PROPOSAL_STATUS_DEPOSIT_PERIOD: { emoji: '💰', label: 'Deposit Period' },
    PROPOSAL_STATUS_VOTING_PERIOD: { emoji: '🗳', label: 'Voting Period' },
    PROPOSAL_STATUS_PASSED: { emoji: '✅', label: 'Passed' },
    PROPOSAL_STATUS_REJECTED: { emoji: '❌', label: 'Rejected' },
    PROPOSAL_STATUS_FAILED: { emoji: '🛑', label: 'Failed' },
  };

  const mappedStatus = statusMap[status] || { emoji: 'ℹ️', label: 'Unknown Status' };
  return `${mappedStatus.emoji} ${mappedStatus.label}`;
}

function formatUTCDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

async function fixProposalStatus(channel, proposalKey, proposalData, threadInfo) {
  const { threadId, messageId } = threadInfo;
  
  console.log(`\nFixing Proposal #${proposalKey}...`);
  console.log(`  Current status: ${proposalData.state}`);
  console.log(`  Thread ID: ${threadId}`);
  console.log(`  Message ID: ${messageId}`);

  // Fetch the thread from Discord
  let thread;
  try {
    thread = await channel.threads.fetch(threadId);
  } catch (error) {
    console.error(`  ❌ Failed to fetch thread: ${error.message}`);
    return false;
  }

  if (!thread) {
    console.error(`  ❌ Thread not found`);
    return false;
  }

  // Fetch and update the intro message
  let introMessage;
  try {
    introMessage = await channel.messages.fetch(messageId);
  } catch (error) {
    console.error(`  ❌ Failed to fetch intro message: ${error.message}`);
    return false;
  }

  if (!introMessage) {
    console.error(`  ❌ Intro message not found`);
    return false;
  }

  const embed = introMessage.embeds[0];
  if (!embed) {
    console.error(`  ❌ No embed found in intro message`);
    return false;
  }

  // Check if already updated
  const currentTitle = embed.title || '';
  const expectedStatus = formatStatus(proposalData.state);
  if (currentTitle.includes(expectedStatus.replace('[', '').replace(']', ''))) {
    console.log(`  ⏭️ Already has correct status in title, skipping embed update`);
  } else {
    // Update the embed title with the new status
    const updatedTitle = currentTitle.replace(/\[.*?\]/, formatStatus(proposalData.state));

    // Update the embed fields
    const updatedFields = embed.fields.map(field => {
      if (field.name === 'Voting Ends:' && proposalData.votingEndTime) {
        return { ...field, value: formatUTCDate(proposalData.votingEndTime) };
      }
      return field;
    });

    // Create the updated embed
    const updatedIntroEmbed = EmbedBuilder.from(embed)
      .setTitle(updatedTitle)
      .setFields(updatedFields);

    // Edit the intro message
    try {
      await introMessage.edit({ embeds: [updatedIntroEmbed] });
      console.log(`  ✅ Updated intro message with status: ${expectedStatus}`);
    } catch (error) {
      console.error(`  ❌ Failed to edit intro message: ${error.message}`);
      return false;
    }
  }

  // Post status update message in the thread
  const threadEmbed = new EmbedBuilder()
    .setTitle(`Proposal ${proposalKey} Status Update (Retroactive Fix)`)
    .addFields(
      { name: 'Previous Status', value: formatThreadStatus('PROPOSAL_STATUS_VOTING_PERIOD'), inline: true },
      { name: 'Final Status', value: formatThreadStatus(proposalData.state), inline: true }
    )
    .setColor('#00AAFF')
    .setFooter({ text: 'Retroactive Status Update', iconURL: client.user.avatarURL() });

  if (proposalData.votingEndTime) {
    threadEmbed.addFields({ name: 'Voting Ended:', value: formatUTCDate(proposalData.votingEndTime), inline: false });
  }

  try {
    await thread.send({ embeds: [threadEmbed] });
    console.log(`  ✅ Posted status update message to thread`);
  } catch (error) {
    console.error(`  ❌ Failed to send thread message: ${error.message}`);
    return false;
  }

  return true;
}

client.once('ready', async () => {
  console.log('Bot is ready! Starting retroactive status fix...\n');

  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found! Check DISCORD_CHANNEL_ID in .env');
    process.exit(1);
  }

  // Load data
  let knownProposals = {};
  let threadMap = {};

  try {
    knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
    threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
  } catch (error) {
    console.error('Failed to load data files:', error.message);
    process.exit(1);
  }

  console.log(`Proposals to fix: ${PROPOSALS_TO_FIX.join(', ')}`);

  let successCount = 0;
  let failCount = 0;

  for (const proposalKey of PROPOSALS_TO_FIX) {
    const proposalData = knownProposals[proposalKey];
    const threadInfo = threadMap[proposalKey];

    if (!proposalData) {
      console.log(`\n⚠️ Proposal #${proposalKey} not found in knownProposals.json`);
      failCount++;
      continue;
    }

    if (!threadInfo) {
      console.log(`\n⚠️ Proposal #${proposalKey} not found in threadMap.json`);
      failCount++;
      continue;
    }

    const success = await fixProposalStatus(channel, proposalKey, proposalData, threadInfo);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay between proposals to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n========================================`);
  console.log(`Fix complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`========================================\n`);

  // Exit after completion
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);
