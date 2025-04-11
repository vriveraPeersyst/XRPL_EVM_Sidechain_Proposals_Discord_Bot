// --- File: ./src/bot.js ---

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { scrapeAllProposals } = require('./utils/cosmosGovApi');
const validateProposals = require('./validateProposals');
require('dotenv').config();
const cron = require('node-cron');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const knownProposalsFile = 'knownProposals.json';
const scrapedProposalsFile = 'scrapedProposals.json';
const threadMapFile = path.resolve(__dirname, '../threadMap.json');

let knownProposals = {};
let scrapedProposals = {};
let threadMap = {};

// Load existing knownProposals
if (fs.existsSync(knownProposalsFile)) {
  knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
  console.log('Loaded knownProposals:', JSON.stringify(knownProposals, null, 2));
}

// Load existing scrapedProposals
if (fs.existsSync(scrapedProposalsFile)) {
  scrapedProposals = JSON.parse(fs.readFileSync(scrapedProposalsFile, 'utf-8'));
  console.log('Loaded scrapedProposals:', JSON.stringify(scrapedProposals, null, 2));
}

// Load existing threadMap
if (fs.existsSync(threadMapFile)) {
  threadMap = JSON.parse(fs.readFileSync(threadMapFile, 'utf-8'));
  console.log('Loaded threadMap:', threadMap);
}

/**
 * Utility: Save proposals to disk
 */
function saveKnownProposals(proposals) {
  try {
    fs.writeFileSync(knownProposalsFile, JSON.stringify(proposals, null, 2));
    console.log('Known proposals updated and saved to file.');
  } catch (error) {
    console.error('Error saving known proposals:', error.message);
  }
}

function saveScrapedProposals(proposals) {
  try {
    fs.writeFileSync(scrapedProposalsFile, JSON.stringify(proposals, null, 2));
    console.log('Scraped proposals updated and saved to file.');
  } catch (error) {
    console.error('Error saving scraped proposals:', error.message);
  }
}

/**
 * New Function:
 * Check if a proposal has votes in scrapedProposals.json or knownProposals.json,
 * but does not have any messages in its thread. If so, remove the votes.
 */
async function cleanupEmptyProposalThreads(client) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found; cannot check thread messages.');
    return;
  }

  // For each proposal in scrapedProposals, check if it has votes
  for (const propId of Object.keys(scrapedProposals)) {
    const scrapedData = scrapedProposals[propId];
    const knownData = knownProposals[propId];

    const hasScrapedVotes = scrapedData?.votes && scrapedData.votes.length > 0;
    const hasKnownVotes = knownData?.votes && knownData.votes.length > 0;

    // We only proceed if there are votes in at least one of them
    if (hasScrapedVotes || hasKnownVotes) {
      // See if there's a thread mapped for this proposal
      const { threadId } = threadMap[propId] || {};

      if (!threadId) {
        // No thread found => remove votes from both
        console.log(
          `Proposal ${propId} has votes but no thread in threadMap. Removing votes...`
        );
        if (scrapedProposals[propId]) scrapedProposals[propId].votes = [];
        if (knownProposals[propId]) knownProposals[propId].votes = [];
        continue;
      }

      // Fetch the thread via the API instead of relying on cache
      let thread;
      try {
        thread = await channel.threads.fetch(threadId);
      } catch (error) {
        console.log(
          `Proposal ${propId} has votes but the thread (ID: ${threadId}) could not be fetched. Removing votes...`
        );
        if (scrapedProposals[propId]) scrapedProposals[propId].votes = [];
        if (knownProposals[propId]) knownProposals[propId].votes = [];
        continue;
      }

      if (!thread) {
        // Possibly the thread doesn't exist or was deleted
        console.log(
          `Proposal ${propId} has votes but the thread (ID: ${threadId}) does not exist. Removing votes...`
        );
        if (scrapedProposals[propId]) scrapedProposals[propId].votes = [];
        if (knownProposals[propId]) knownProposals[propId].votes = [];
        continue;
      }

      // Fetch messages from the thread
      const fetchedMessages = await thread.messages.fetch({ limit: 10 });
      // If the thread has fewer than 2 messages, we consider it "empty"
      // (because the first message is typically the embed that started the thread).
      if (fetchedMessages.size < 2) {
        console.log(
          `Proposal ${propId} has votes but thread is empty (message count: ${fetchedMessages.size}). Removing votes...`
        );
        if (scrapedProposals[propId]) scrapedProposals[propId].votes = [];
        if (knownProposals[propId]) knownProposals[propId].votes = [];
      }
    }
  }

  // Save changes back to disk
  saveScrapedProposals(scrapedProposals);
  saveKnownProposals(knownProposals);
}

client.once('ready', async () => {
  console.log('Bot is ready!');

  async function executeTasks() {
    if (executeTasks.isRunning) {
      console.log('Previous execution still running. Skipping this interval.');
      return;
    }

    executeTasks.isRunning = true;

    try {

      // 2) Scrape proposals
      console.log('Starting scrape proposals...');
      await scrapeAllProposals(scrapedProposals, knownProposals, client);
      console.log('Scrape proposals completed.');

      saveScrapedProposals(scrapedProposals);

      // 3) Validate proposals (detect new proposals, new votes, status changes, etc.)
      console.log('Starting validate proposals...');
      await validateProposals(client, knownProposals, scrapedProposals);
      console.log('Validate proposals completed.');

      // 4) Persist combined data
      Object.assign(knownProposals, scrapedProposals);
      saveKnownProposals(knownProposals);

    } catch (error) {
      console.error('Error in scrape and validate proposals:', error);
    } finally {
      executeTasks.isRunning = false;
    }
  }

  // Schedule tasks every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    console.log('Cron job triggered at', new Date().toLocaleString());
    executeTasks();
  });

  // Run immediately once the bot is ready
  await executeTasks();
});

client.login(process.env.DISCORD_BOT_TOKEN);
