const openAIService = require('../services/openAIService');
const fs = require('fs');
const path = require('path');
const knownProposals = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../knownProposals.json'), 'utf-8'));

module.exports = {
  name: 'explainai',
  description: 'Get an AI-generated explanation for a proposal message',
  async execute(message, args) {
    const proposalNumber = args[0];
    if (!proposalNumber) {
      return message.reply('Please provide a proposal number.');
    }

    const proposalData = knownProposals[`#${proposalNumber}`];
    if (!proposalData) {
      return message.reply('Proposal not found.');
    }

    const proposalMessage = proposalData.message;

    if (!proposalMessage || proposalMessage.startsWith('Element not found')) {
      return message.reply('Proposal message not found.');
    }

    const prompt = `Provide a complete, max 800 characters, easy to visualize and understand explanation with context on particular tech mentioned in the following message for the network upgrade proposals:\n\n"${proposalMessage}"`;

    try {
      const explanation = await openAIService.getAIExplanation(prompt);
      message.channel.send(`${explanation} 
      
      Commands:
      !proposal 1
      !proposalVotes 1
      !explainAI 1
      !activeProposals
      \n`);
    } catch (error) {
      console.error(error);
      message.reply('There was an error retrieving or explaining the proposal message.');
    }
  },
};
