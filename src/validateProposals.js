const fs = require('fs');
const path = require('path');
const puppeteerUtils = require('./utils/puppeteerUtils');

const knownProposalsFile = path.resolve(__dirname, '../knownProposals.json');

async function validateProposals() {
  let knownProposals = {};

  // Load known proposals from file
  if (fs.existsSync(knownProposalsFile)) {
    knownProposals = JSON.parse(fs.readFileSync(knownProposalsFile, 'utf-8'));
  } else {
    console.log(`File not found: ${knownProposalsFile}`);
    return;
  }

  const updatedProposals = { ...knownProposals };
  const fieldsToCheck = ['number', 'title', 'state', 'submitTime', 'depositEndTime', 'votingStartTime', 'votingEndTime', 'proposer', 'message'];

  for (const proposalKey in knownProposals) {
    const proposalData = knownProposals[proposalKey];
    let needsUpdate = false;

    for (const field of fieldsToCheck) {
      if (proposalData[field] === 'Not Found') {
        needsUpdate = true;
        console.log(`Field "${field}" in proposal ${proposalKey} is marked as "Not Found".`);
        break;
      }
    }

    if (needsUpdate) {
      console.log(`Updating proposal ${proposalKey}...`);
      const url = `https://governance.xrplevm.org/xrplevm/proposals/${proposalKey.replace('#', '')}`;
      const updatedProposalData = await puppeteerUtils.scrapeProposalData(url);

      if (updatedProposalData) {
        updatedProposals[proposalKey] = updatedProposalData;
        console.log(`Updated proposal ${proposalKey} successfully.`);
        console.log(`Updated Proposal Data: ${JSON.stringify(updatedProposalData, null, 2)}`);
      } else {
        console.log(`Failed to update proposal ${proposalKey}.`);
      }
    }
  }

  // Save the updated proposals back to the file
  fs.writeFileSync(knownProposalsFile, JSON.stringify(updatedProposals, null, 2));
  console.log('Known proposals validated and updated.');
}

module.exports = validateProposals;

// Utility function for testing and running the script
if (require.main === module) {
  validateProposals().catch(error => console.error('Error in validateProposals:', error));
}
