const puppeteerUtils = require('../utils/puppeteerUtils');

module.exports = {
  async getProposalInfo(url) {
    return puppeteerUtils.scrapeProposalData(url);
  },

  async getAllProposals() {
    return puppeteerUtils.scrapeAllProposals();
  },

  async getProposalVotes(url) {
    const proposalData = await puppeteerUtils.scrapeProposalData(url);
    const votes = proposalData.votes.map(vote => ({
      name: vote.name,
      vote: vote.vote,
      icon: vote.vote === 'Yes' ? '✅' : vote.vote === 'No' ? '❌' : vote.vote === 'Veto' ? '🛑' : '⚪️'
    }));

    return votes;
  }
};
