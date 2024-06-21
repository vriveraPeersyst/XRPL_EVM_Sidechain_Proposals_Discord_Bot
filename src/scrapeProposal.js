const puppeteerUtils = require('./utils/puppeteerUtils');

(async () => {
  const url = 'https://validators.evm-sidechain.xrpl.org/xrp/proposals/36';
  try {
    const proposalData = await puppeteerUtils.scrapeProposalData(url);
    console.log('Scraped Proposal Data:', proposalData);
  } catch (error) {
    console.error('Error scraping proposal data:', error);
  }
})();
