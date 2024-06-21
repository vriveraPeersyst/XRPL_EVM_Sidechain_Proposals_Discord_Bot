const fs = require('fs');
const path = require('path');
const knownProposals = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../knownProposals.json'), 'utf-8'));

module.exports = {
  name: 'proposalvotes',
  description: 'Get validator votes for a proposal',
  async execute(message, args) {
    const proposalNumber = args[0];
    if (!proposalNumber) {
      return message.reply('Please provide a proposal number.');
    }

    const proposalData = knownProposals[`#${proposalNumber}`];
    if (!proposalData) {
      return message.reply('Proposal not found.');
    }

    let responseMessage = `
**Proposal ${proposalData.number} **
**Proposal State**: ${proposalData.state}
**Proposal Voting Ends**: ${proposalData.votingEndTime}
Yes = ✅, No = ❌
Veto = 🛑, Abstain = ⚪️
**Current Votes:**

    `;

    proposalData.votes.forEach(vote => {
      const emoji = vote.vote === 'Yes' ? '✅' : vote.vote === 'No' ? '❌' : vote.vote === 'Veto' ? '🛑' : '⚪️';
      responseMessage += `${emoji} ${vote.name}: "${vote.vote}"\n`;
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
