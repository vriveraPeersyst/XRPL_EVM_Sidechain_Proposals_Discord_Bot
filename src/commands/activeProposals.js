const fs = require('fs');
const path = require('path');
const knownProposals = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../knownProposals.json'), 'utf-8'));

module.exports = {
  name: 'activeproposals',
  description: 'List all active proposals',
  async execute(message) {
    const activeProposals = Object.values(knownProposals).filter(proposal => proposal.state === 'Voting');
    if (activeProposals.length === 0) {
      return message.reply('No active proposals found.');
    }

    let responseMessage = '**Active Proposals:**\n';
    activeProposals.forEach(proposal => {
      responseMessage += `
**Proposal Number**: ${proposal.number}
**Title**: ${proposal.title}
**State**: ${proposal.state}
**Voting End Time**: ${proposal.votingEndTime}\n
      `;
    });

    message.channel.send(`${responseMessage} 
      
      Commands:
      !proposal 1
      !proposalVotes 1
      !explainAI 1
      !activeProposals
      \n`);
  },
};
