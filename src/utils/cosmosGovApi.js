const axios = require('axios');
const fs = require('fs');
const { notifyNewProposal } = require('../handlers/notifyNewProposal');
require('dotenv').config();

const BASE_URL = process.env.COSMOS_GOV_API_URL;

async function scrapeVotes(proposalId) {
  try {
    const response = await axios.get(`${BASE_URL}${proposalId}/votes`);
    const votes = response.data.votes.map((vote) => ({
      name: vote.voter,
      vote: vote.options.map((option) => option.option.replace('VOTE_OPTION_', '').toLowerCase()),
    }));
    console.log(`Votes for proposal ${proposalId}:`, votes);
    return votes;
  } catch (error) {
    console.error(`Error fetching votes for proposal ${proposalId}:`, error.message);
    return [];
  }
}

async function scrapeProposalData(proposalId) {
  try {
    const response = await axios.get(`${BASE_URL}${proposalId}`);
    const proposal = response.data.proposal;

    if (!proposal) {
      console.log(`Proposal ${proposalId} not found or invalid.`);
      return null;
    }

    const proposalData = {
      number: proposal.id,
      title: proposal.title,
      state: proposal.status,
      submitTime: proposal.submit_time,
      depositEndTime: proposal.deposit_end_time,
      votingStartTime: proposal.voting_start_time,
      votingEndTime: proposal.voting_end_time,
      proposer: proposal.proposer,
      message: proposal.summary,
      votes: await scrapeVotes(proposalId),
    };

    console.log(`Fetched proposal ${proposalId}:`, proposalData);
    return proposalData;
  } catch (error) {
    console.error(`Error fetching proposal ${proposalId}:`, error.message);
    return null;
  }
}

async function scrapeAllProposals(knownProposals, client) {
  let proposalId = 1;
  let missingProposals = 0;

  while (missingProposals < 1) {
    console.log(`Checking proposal #${proposalId}...`);

    if (!knownProposals[`#${proposalId}`]) {
      const proposalData = await scrapeProposalData(proposalId);

      if (proposalData) {
        knownProposals[`#${proposalId}`] = proposalData;
        missingProposals = 0;
        saveKnownProposals(knownProposals);
        notifyNewProposal(client, proposalData);
      } else {
        console.log(`Proposal #${proposalId} not found or invalid.`);
        missingProposals++;
      }
    } else {
      console.log(`Proposal #${proposalId} already exists in known proposals.`);
    }

    proposalId++;
  }
}

function saveKnownProposals(knownProposals) {
  try {
    fs.writeFileSync('knownProposals.json', JSON.stringify(knownProposals, null, 2));
    console.log('Known proposals updated and saved to file.');
  } catch (error) {
    console.error('Error saving known proposals:', error.message);
  }
}

module.exports = {
  scrapeProposalData,
  scrapeAllProposals,
  saveKnownProposals,
  scrapeVotes,
};
