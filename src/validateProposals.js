const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '../config/config.json'));
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const puppeteerUtils = require('./utils/puppeteerUtils');
const { notifyNewVotes } = require('./handlers/notifyNewVotes');
const { notifyNewStatus } = require('./handlers/notifyNewStatus'); // Import notifyNewStatus

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

    // Skip proposals that have state 'Passed'
    if (proposalData.state === 'Passed' || proposalData.state === 'Rejected' ) {
      continue;
    }

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

    // Scrape the updated proposal data
    const updatedProposalData = await puppeteerUtils.scrapeProposalData(url);
    if (!updatedProposalData) {
      console.log(`Could not scrape data for proposal ${proposalKey}`);
      continue;
    }

    // Detect state change
    const oldState = proposalData.state;
    const newState = updatedProposalData.state;
    if (oldState !== newState) {
      console.log(
        `State change detected for proposal ${proposalKey}: ${oldState} -> ${newState}`
      );
      notifyNewStatus(client, proposalKey, oldState, newState); // Notify about state change
      proposalData.state = newState; // Update the state in knownProposals
      needsUpdate = true;
    }

    // Detect new votes
    const currentVotes = proposalData.votes || [];
    const scrapedVotes = updatedProposalData.votes || [];
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
      // Update other fields if necessary
      for (const field of fieldsToCheck) {
        proposalData[field] = updatedProposalData[field];
      }
      // Save the updated proposal data
      knownProposals[proposalKey] = proposalData;
    }
  }

  // After updating proposals, save the knownProposals back to the file
  fs.writeFileSync(knownProposalsFile, JSON.stringify(knownProposals, null, 2));
  console.log('Known proposals updated and saved to file.');
}

module.exports = validateProposals;
