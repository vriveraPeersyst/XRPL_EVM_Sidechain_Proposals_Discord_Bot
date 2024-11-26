const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '../config/config.json'));
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const puppeteerUtils = require('./utils/puppeteerUtils');
const { notifyNewVotes } = require('./handlers/notifyNewVotes');
const { notifyNewStatus } = require('./handlers/notifyNewStatus');

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

    if (proposalData.state === 'Passed' || proposalData.state === 'Rejected' ) {
      continue;
    }

    let needsUpdate = false;

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

    const updatedProposalData = await puppeteerUtils.scrapeProposalData(url);
    if (!updatedProposalData) {
      console.log(`Could not scrape data for proposal ${proposalKey}`);
      continue;
    }

    const oldState = proposalData.state;
    const newState = updatedProposalData.state;
    if (oldState !== newState) {
      console.log(
        `State change detected for proposal ${proposalKey}: ${oldState} -> ${newState}`
      );
      notifyNewStatus(client, proposalKey, oldState, newState);
      proposalData.state = newState;
      needsUpdate = true;
    }

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
      proposalData.votes = scrapedVotes;
      notifyNewVotes(client, proposalKey, newVotes);
    }

    if (needsUpdate) {
      for (const field of fieldsToCheck) {
        proposalData[field] = updatedProposalData[field];
      }
      knownProposals[proposalKey] = proposalData;
    }
  }

  fs.writeFileSync(knownProposalsFile, JSON.stringify(knownProposals, null, 2));
  console.log('Known proposals updated and saved to file.');
}

module.exports = validateProposals;
