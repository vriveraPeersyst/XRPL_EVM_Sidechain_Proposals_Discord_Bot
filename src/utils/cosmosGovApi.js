// File: ./src/utils/cosmosGovApi.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Environment variables (be sure they're set in your .env or environment)
const BASE_URL = process.env.COSMOS_GOV_API_URL;        // e.g. "http://cosmos.xrplevm.org:1317/cosmos/gov/v1/proposals/"
const VALIDATORS_URL = process.env.COSMOS_VALIDATORS_API_URL; // e.g. "http://cosmos.xrplevm.org:1317/cosmos/staking/v1beta1/validators"
const STAKING_DELEG_URL = process.env.COSMOS_STAKING_API_URL; // e.g. "http://cosmos.xrplevm.org:1317/cosmos/staking/v1beta1/delegations/"

/**
 * Helper function:
 * Given a delegator address (e.g. "ethm1djhpzr..."), fetch its delegations and
 * return the FIRST validator operator address (e.g. "ethmvaloper1djhpzr...") if any.
 */
async function getOperatorAddressForDelegator(delegatorAddr) {
  try {
    // Example request: "http://.../cosmos/staking/v1beta1/delegations/<delegatorAddr>"
    const url = `${STAKING_DELEG_URL}${delegatorAddr}`;
    const res = await axios.get(url);

    // If no delegation_responses, it means this address has no delegation => not a validator
    if (!res.data || !res.data.delegation_responses || !res.data.delegation_responses.length) {
      return null;
    }

    // For simplicity, we just take the first delegation if there are multiple
    const { validator_address } = res.data.delegation_responses[0].delegation;
    return validator_address;
  } catch (err) {
    // Often a 404 means no delegations for that address
    console.warn(`No delegations found for ${delegatorAddr} (or error): ${err.message}`);
    return null;
  }
}

/**
 * Helper function:
 * For a given account address (ethm1...), find the moniker if it belongs to a validator.
 */
async function getMonikerForDelegatorAddress(delegatorAddr, validators) {
  // 1) Grab the operator address, if any
  const operatorAddr = await getOperatorAddressForDelegator(delegatorAddr);
  if (!operatorAddr) return null; // No delegation or not a validator

  // 2) Match it to the validator in the list
  const matchedValidator = validators.find(
    (v) => v.operator_address === operatorAddr
  );
  return matchedValidator
    ? matchedValidator.description.moniker
    : null;
}

/**
 * Fetch the votes for a given proposal, then resolve each voter's "moniker" if they are a validator.
 */
async function scrapeVotes(proposalId) {
  try {
    // 1) Fetch the list of validators
    const valRes = await axios.get(VALIDATORS_URL);
    const validators = valRes.data.validators || [];

    // 2) Fetch the proposal's votes
    const votesRes = await axios.get(`${BASE_URL}${proposalId}/votes`);
    const allVotes = votesRes.data.votes || [];

    // 3) For each vote, see if the address is a validator by checking delegations
    const mappedVotes = [];
    for (const vote of allVotes) {
      const delegatorAddr = vote.voter;

      // Attempt to retrieve a validator moniker for this address
      const moniker = await getMonikerForDelegatorAddress(delegatorAddr, validators);

      mappedVotes.push({
        name: moniker || delegatorAddr,
        address: delegatorAddr,
        vote: vote.options.map((option) =>
          option.option.replace('VOTE_OPTION_', '').toLowerCase()
        ),
      });
    }

    return mappedVotes;
  } catch (error) {
    console.error(`Error fetching votes for Proposal ${proposalId}:`, error.message);
    return [];
  }
}

/**
 * Fetch proposal data (title, times, summary, etc.) and retrieve votes with moniker/address data.
 */
async function scrapeProposalData(proposalId) {
  try {
    console.log(`Fetching data for Proposal ${proposalId}...`);
    const response = await axios.get(`${BASE_URL}${proposalId}`);
    const proposal = response.data.proposal;

    if (!proposal) {
      console.warn(`Proposal ${proposalId} not found in the API response.`);
      return null;
    }

    console.log(`Fetched proposal data for ${proposalId}:`, proposal);

    // 1) Scrape votes using the moniker logic
    const votes = await scrapeVotes(proposalId);

    // 2) Return the consolidated proposal object
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
    console.error(`Error fetching proposal ${proposalId}:`, error.message);
    return null;
  }
}

/**
 * Continues scraping proposals from the given proposalId upward
 * until one is missing, then stops. Adjust logic as needed for your use.
 */
async function scrapeAllProposals(scrapedProposals, knownProposals, client) {
  let proposalId = 10; // or whichever starting ID you want
  let missingProposals = 0;

  while (missingProposals < 1) {
    console.log(`Checking Proposal ${proposalId}...`);

    const knownProposal = knownProposals[proposalId];
    if (knownProposal) {
      if (knownProposal.votingEndTime) {
        const votingEndTime = new Date(knownProposal.votingEndTime);
        const now = new Date();
        // Voting end time plus 3 hours
        const votingEndTimePlus3 = new Date(votingEndTime.getTime() + 3 * 60 * 60 * 1000);

        console.log(
          `Proposal ${proposalId}: Voting ended at ${votingEndTime.toISOString()}, keep scraping until ${votingEndTimePlus3.toISOString()}, current time: ${now.toISOString()}`
        );

        // Skip proposals that ended more than 3 hours ago
        if (now > votingEndTimePlus3) {
          console.log(
            `Skipping Proposal ${proposalId}: Voting ended on ${votingEndTime.toISOString()} (more than 3 hours ago).`
          );
          proposalId++;
          continue;
        }
      } else {
        console.warn(`Proposal ${proposalId} in knownProposals is missing votingEndTime.`);
      }
    } else {
      console.warn(`Proposal ${proposalId} not found in knownProposals.`);
    }

    // Try to scrape new data for the proposal
    console.log(`Scraping new data for Proposal ${proposalId}...`);
    const proposalData = await scrapeProposalData(proposalId);

    if (proposalData) {
      scrapedProposals[proposalId] = proposalData;
      console.log(`Added Proposal ${proposalId} to scrapedProposals.`);
      missingProposals = 0;
    } else {
      console.log(`Proposal ${proposalId} not found or invalid.`);
      missingProposals++;
    }

    proposalId++;
  }

  console.log('Finished scraping proposals.');
}


module.exports = {
  scrapeProposalData,
  scrapeAllProposals,
};
