const puppeteer = require('puppeteer');
const fs = require('fs');
const { notifyNewProposal } = require('../handlers/notifyNewProposal');
require('dotenv').config();

async function scrapeVotes(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Add these flags
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    let allVotes = [];
    let previousVotes = [];
    let pageNumber = 1;
    const selector = '[id="__next"] div:nth-child(3) div:nth-child(2) table tbody tr';
    const loadMoreButtonXPath = '/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[3]/div[3]/div/ul[2]/li[5]/button';
    const validVotes = ['Yes', 'No', 'Veto', 'Abstain'];

    while (true) {
      console.log(`Fetching validators from proposal: ${url} page ${pageNumber}...`);
      await page.waitForSelector(selector, { timeout: 60000 });

      const votes = await page.evaluate((validVotes) => {
        const voteRows = document.querySelectorAll('[id="__next"] div:nth-child(3) div:nth-child(2) table tbody tr');
        let votes = [];

        voteRows.forEach(row => {
          const namePart1 = row.querySelector('td:nth-child(1) a span:nth-child(2) span:nth-child(1)')?.textContent.trim() || '';
          const namePart2 = row.querySelector('td:nth-child(1) a span:nth-child(2) span:nth-child(2)')?.textContent.trim() || '';
          const vote = row.querySelector('td:nth-child(2)')?.textContent.trim() || '';

          if (vote && validVotes.includes(vote)) {
            const voterName = (namePart1 + namePart2).replace(/\s+/g, ''); 
            votes.push({ name: voterName, vote });
          }
        });

        return votes;
      }, validVotes);

      console.log('Votes extracted:', votes); 

      if (JSON.stringify(votes) === JSON.stringify(previousVotes)) {
        console.log('No new votes found. Breaking the while loop.');
        break;
      }

      previousVotes = votes;
      allVotes = allVotes.concat(votes);

      const loadMoreButtonExists = await page.evaluate((loadMoreButtonXPath) => {
        const button = document.evaluate(loadMoreButtonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return button !== null;
      }, loadMoreButtonXPath);

      if (loadMoreButtonExists) {
        await page.evaluate((loadMoreButtonXPath) => {
          return new Promise((resolve) => {
            const interval = setInterval(() => {
              const loadMoreButton = document.evaluate(loadMoreButtonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (loadMoreButton) {
                loadMoreButton.click();
                clearInterval(interval); 
                resolve();
              }
            }, 5000); 
          });
        }, loadMoreButtonXPath);

        // Wait for the new content to appear
        await page.waitForSelector(selector, { timeout: 60000 }); 
      } else {
        console.log('No more content to load. Breaking the while loop.');
        break;
      }

      pageNumber++;
    }

 
    const uniqueVotes = allVotes.reduce((acc, vote) => {
      if (!acc.find(v => v.name === vote.name)) {
        acc.push(vote);
      }
      return acc;
    }, []);

    await browser.close();
    return uniqueVotes;

  } catch (error) {
    console.error('Error scraping votes:', error.message);
    await browser.close();
    return [];
  }
}

async function scrapeProposalData(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Add these flags
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });

    const proposalData = await page.evaluate(() => {
      const getElementText = (xpaths) => {
        for (const xpath of xpaths) {
          const element = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          if (element) {
            return element.textContent.trim();
          }
        }
        return 'Not Found';
      };

      const numberText = getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[1]/div[1]/h4']);
      if (numberText === 'Not Found') {
        return null;
      }

      return {
        number: numberText,
        title: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[1]/div[2]/div/h3']),
        state: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[1]/span/div/p']),
        submitTime: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/p[5]']),
        depositEndTime: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/p[7]']),
        votingStartTime: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/p[9]']),
        votingEndTime: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/p[11]']),
        proposer: getElementText(['/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/a']),
        message: getElementText([
          '/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/ul/li[1]/p',
          '/html/body/div[1]/div[1]/div[1]/div[3]/div[2]/div[2]/span/div[1]/div[2]/p[13]/text()'
        ]),
        votes: []
      };
    });

    if (proposalData && proposalData.number !== 'Not Found' && proposalData.number !== '#0') {
      const voteData = await scrapeVotes(url);
      proposalData.votes = voteData;
    } else {
      return null; 
    }

    console.log(`Proposal ${url} Data:`, proposalData);
    await browser.close();
    return proposalData;

  } catch (error) {
    console.error('Error scraping proposal data:', error.message);
    await browser.close();
    return null;
  }
}


async function scrapeAllProposals(knownProposals, client) {
  const baseUrl = process.env.BASE_PROPOSAL_URL;
  let proposalNumber = 1;
  let missingProposals = 0;

  while (missingProposals < 1) { 
    const url = `${baseUrl}${proposalNumber}`;
    console.log(`Checking URL: ${url}`);
    

    if (!knownProposals[`#${proposalNumber}`]) {
      const proposalData = await scrapeProposalData(url);

      if (proposalData) {
        knownProposals[`#${proposalNumber}`] = proposalData;
        missingProposals = 0; 
        saveKnownProposals(knownProposals); 
        notifyNewProposal(client, proposalData); 
      } else {
        console.log(`Proposal ${proposalNumber} not found or invalid.`);
        missingProposals++;
      }
    } else {
      console.log(`Proposal #${proposalNumber} already exists in known proposals.`);
    }

    proposalNumber++;
  }
}

function saveKnownProposals(knownProposals) {
  try {
    fs.writeFileSync('knownProposals.json', JSON.stringify(knownProposals, null, 2));
    console.log('Known proposals updated and saved to file.');
  } catch (error) {
    console.error('Error saving known proposals:', error.message);
  }
}

module.exports = {
  scrapeProposalData,
  scrapeAllProposals,
  saveKnownProposals,
  scrapeVotes
};