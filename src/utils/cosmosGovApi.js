const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.COSMOS_GOV_API_URL;

async function scrapeVotes(proposalId) {
  try {
    const response = await axios.get(`${BASE_URL}${proposalId}/votes`);
    console.log(`Fetched votes for Proposal #${proposalId}:`, response.data.votes);
    return response.data.votes.map(vote => ({
      name: vote.voter,
      vote: vote.options.map(option => option.option.replace('VOTE_OPTION_', '').toLowerCase()),
    }));
  } catch (error) {
    console.error(`Error fetching votes for Proposal #${proposalId}:`, error.message);
    return [];
  }
}

async function scrapeProposalData(proposalId) {
  try {
    console.log(`Fetching data for Proposal #${proposalId}...`);
    const response = await axios.get(`${BASE_URL}${proposalId}`);
    const proposal = response.data.proposal;

    if (!proposal) {
      console.warn(`Proposal #${proposalId} not found in the API response.`);
      return null;
    }

    console.log(`Fetched proposal data for #${proposalId}:`, proposal);

    const votes = await scrapeVotes(proposalId);

    return {
      number: proposal.id,
      title: proposal.title,
      state: proposal.status,
      submitTime: proposal.submit_time,
      depositEndTime: proposal.deposit_end_time,
      votingStartTime: proposal.voting_start_time,
      votingEndTime: proposal.voting_end_time,
      proposer: proposal.proposer,
      message: proposal.summary,
      votes,
    };
  } catch (error) {
    console.error(`Error fetching proposal #${proposalId}:`, error.message);
    return null;
  }
}

async function scrapeAllProposals(scrapedProposals, knownProposals, client) {
  let proposalId = 1; // Start with the first proposal
  let missingProposals = 0;

  while (missingProposals < 1) {
    console.log(`Checking Proposal #${proposalId}...`);

    const knownProposal = knownProposals[`#${proposalId}`];

    if (knownProposal) {
      if (knownProposal.votingEndTime) {
        const votingEndTime = new Date(knownProposal.votingEndTime);
        const now = new Date();

        console.log(
          `Proposal #${proposalId}: Voting ends at ${votingEndTime.toISOString()}, Current time: ${now.toISOString()}`
        );

        // Check if proposal has ended and more than 2 hours have passed
        const twoHoursAfterEnd = new Date(votingEndTime.getTime() + 2 * 60 * 60 * 1000);
        if (votingEndTime <= now && now >= twoHoursAfterEnd) {
          console.log(
            `Skipping Proposal #${proposalId}: Voting ended on ${votingEndTime.toISOString()} and more than 2 hours have passed.`
          );
          proposalId++;
          continue; // Move to the next proposal
        }
      } else {
        console.warn(`Proposal #${proposalId} in knownProposals is missing votingEndTime.`);
      }
    } else {
      console.warn(`Proposal #${proposalId} not found in knownProposals.`);
    }

    // Scrape new proposal data if it hasn't ended or it's within the 2-hour window
    console.log(`Scraping new data for Proposal #${proposalId}...`);
    const proposalData = await scrapeProposalData(proposalId);

    if (proposalData) {
      scrapedProposals[`#${proposalId}`] = proposalData;
      console.log(`Added Proposal #${proposalId} to scrapedProposals.`);
      missingProposals = 0; // Reset missingProposals on successful fetch
    } else {
      console.log(`Proposal #${proposalId} not found or invalid.`);
      missingProposals++; // Increment missingProposals on failure
    }

    proposalId++; // Increment to the next proposal ID
  }

  console.log('Finished scraping proposals.');
}

module.exports = {
  scrapeProposalData,
  scrapeAllProposals,
};
