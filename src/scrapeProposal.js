const puppeteerUtils = require('./utils/puppeteerUtils');

(async () => {
  const url = "proposalPageUrl": "https://governance.xrplevm.org/xrp/proposals/36";
  try {
    const proposalData = await puppeteerUtils.scrapeProposalData(url);
    console.log('Scraped Proposal Data:', proposalData);
  } catch (error) {
    console.error('Error scraping proposal data:', error);
  }
})();
