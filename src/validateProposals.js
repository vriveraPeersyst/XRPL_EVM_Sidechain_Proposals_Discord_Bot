const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cosmosGovApi = require('./utils/cosmosGovApi');
const { notifyNewVotes } = require('./handlers/notifyNewVotes');
const { notifyNewStatus } = require('./handlers/notifyNewStatus');

const knownProposalsFile = path.resolve(__dirname, '../knownProposals.json');

function normalizeVote(vote) {
  return {
    name: String(vote.name || '').trim().toLowerCase(),
    vote: String(vote.vote || '').trim().toLowerCase(),
  };
}

function areVotesEqual(vote1, vote2) {
  const normVote1 = normalizeVote(vote1);
  const normVote2 = normalizeVote(vote2);
  return normVote1.name === normVote2.name && normVote1.vote === normVote2.vote;
}

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

    if (proposalData.state === 'PROPOSAL_STATUS_PASSED' || proposalData.state === 'PROPOSAL_STATUS_REJECTED' || proposalData.state === 'Passed' || proposalData.state === 'Rejected') {
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

    const updatedProposalData = await cosmosGovApi.scrapeProposalData(proposalKey.replace(
      '#',
      ''
    ));
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

    const currentVotes = proposalData.votes.map(normalizeVote);
    const scrapedVotes = (updatedProposalData.votes || []).map(normalizeVote);
    const newVotes = scrapedVotes.filter(
      (vote) => !currentVotes.some((existingVote) => areVotesEqual(existingVote, vote))
    );

    if (newVotes.length > 0) {
      needsUpdate = true;
      console.log(`New votes detected for proposal ${proposalKey}:`, newVotes);
      proposalData.votes = updatedProposalData.votes; // Update to full vote list
      notifyNewVotes(client, proposalKey, newVotes, currentVotes);
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