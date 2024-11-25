const puppeteerUtils = require('./utils/puppeteerUtils');

(async () => {
  const url = "https://governance.xrplevm.org/xrplevm/proposals/";
  try {
    const proposalData = await puppeteerUtils.scrapeProposalData(url);
    console.log('Scraped Proposal Data:', proposalData);
  } catch (error) {
    console.error('Error scraping proposal data:', error);
  }
})();
