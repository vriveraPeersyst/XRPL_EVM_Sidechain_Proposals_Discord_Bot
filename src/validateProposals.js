const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '../config/config.json'));
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const puppeteerUtils = require('./utils/puppeteerUtils');
const { notifyNewVotes } = require('./handlers/notifyNewVotes');

const knownProposalsFile = path.resolve(__dirname, '../knownProposals.json');

async function validateProposals(client, knownProposals) {
  const fieldsToCheck = [
    'number',
    'title',
    'state',
    'submitTime',
    'depositEndTime',
    'votingStartTime',
    'votingEndTime',
    'proposer',
    'message',
  ];

  for (const proposalKey in knownProposals) {
    const proposalData = knownProposals[proposalKey];
    let needsUpdate = false;

    // Check for missing fields
    for (const field of fieldsToCheck) {
      if (proposalData[field] === 'Not Found') {
        needsUpdate = true;
        console.log(
          `Field "${field}" in proposal ${proposalKey} is marked as "Not Found".`
        );
        break;
      }
    }

    const url = `https://governance.xrplevm.org/xrplevm/proposals/${proposalKey.replace(
      '#',
      ''
    )}`;
    const scrapedVotes = await puppeteerUtils.scrapeVotes(url);

    // Detect new votes
    const currentVotes = proposalData.votes || [];
    const newVotes = scrapedVotes.filter(
      (vote) =>
        !currentVotes.some(
          (existingVote) =>
            existingVote.name === vote.name && existingVote.vote === vote.vote
        )
    );

    if (newVotes.length > 0) {
      needsUpdate = true;
      console.log(`New votes detected for proposal ${proposalKey}:`, newVotes);
      // Update the proposal's votes
      proposalData.votes = scrapedVotes;
      notifyNewVotes(client, proposalKey, newVotes); // Notify about new votes
    }

    if (needsUpdate) {
      // Optionally re-scrape the entire proposal data if fields are missing
      const updatedProposalData = await puppeteerUtils.scrapeProposalData(url);
      if (updatedProposalData) {
        knownProposals[proposalKey] = updatedProposalData;
      }
    }
  }

  // After updating proposals, save the knownProposals back to the file
  fs.writeFileSync(knownProposalsFile, JSON.stringify(knownProposals, null, 2));
  console.log('Known proposals updated and saved to file.');
}

module.exports = validateProposals;
