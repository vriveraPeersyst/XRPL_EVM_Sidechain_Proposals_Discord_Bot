const fs = require('fs');
const path = require('path');
const knownProposals = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../knownProposals.json'), 'utf-8'));

module.exports = {
  name: 'proposal',
  description: 'Get information about a proposal',
  async execute(message, args) {
    const proposalNumber = args[0];
    if (!proposalNumber) {
      return message.reply('Please provide a proposal number.');
    }

    const proposalData = knownProposals[`#${proposalNumber}`];

    if (!proposalData) {
      return message.reply('Proposal not found.');
    }

    const responseMessage = `
**Proposal Number**: ${proposalData.number}
**Title**: ${proposalData.title}
**State**: ${proposalData.state}
**Submit Time**: ${proposalData.submitTime}
**Deposit End Time**: ${proposalData.depositEndTime}
**Voting Start Time**: ${proposalData.votingStartTime}
**Voting End Time**: ${proposalData.votingEndTime}
**Proposer**: ${proposalData.proposer}
**Message**: ${proposalData.message}
    `;
    message.channel.send(`${responseMessage} 
      
      Commands:
      !proposal 1
      !proposalVotes 1
      !explainAI 1
      !activeProposals
      \n`);
  },
};
