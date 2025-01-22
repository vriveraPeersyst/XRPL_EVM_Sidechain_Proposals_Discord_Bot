const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { notifyNewVotes } = require('./handlers/notifyNewVotes');
const { notifyNewStatus } = require('./handlers/notifyNewStatus');
const { notifyNewProposal } = require('./handlers/notifyNewProposal');

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

async function validateProposals(client, knownProposals, scrapedProposals) {
  for (const proposalKey in scrapedProposals) {
    const scrapedData = scrapedProposals[proposalKey];
    const knownData = knownProposals[proposalKey] || {};

    let isNewProposal = !knownProposals[proposalKey];
    let hasChanges = false;

    // Detect new proposals
    if (isNewProposal) {
      console.log(`New proposal detected: ${proposalKey}`);
      await notifyNewProposal(client, scrapedData); // Notify about the new proposal
      knownProposals[proposalKey] = scrapedData; // Store it so we know it's no longer new
      continue;
    }

    // Detect state changes
    if (scrapedData.state !== knownData.state) {

      function formatUTCDate(date) {
        const d = new Date(date);
        return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      }
      const newVotingEndTime = formatUTCDate(scrapedData.votingEndTime);
      
      console.log(`State change detected for Proposal ${proposalKey}: ${knownData.state} -> ${scrapedData.state}`);
      notifyNewStatus(client, proposalKey, knownData.state, scrapedData.state, newVotingEndTime);
      hasChanges = true;
    }

    // Detect new votes
    const newVotes = scrapedData.votes.filter(vote =>
      !(knownData.votes || []).some(existingVote => areVotesEqual(existingVote, vote))
    );
    if (newVotes.length > 0) {
      console.log(`New votes detected for Proposal ${proposalKey}:`, newVotes);
      notifyNewVotes(client, proposalKey, newVotes, knownData.votes || []);
      hasChanges = true;
    }

    // Update the known proposals if changes were detected
    if (hasChanges) {
      console.log(`Updating Proposal ${proposalKey} in knownProposals.`);
      knownProposals[proposalKey] = { ...knownData, ...scrapedData };
    }
  }
}

module.exports = validateProposals;
