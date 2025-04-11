# XRPL EVM Governance Discord Bot

A Node.js application that automatically scrapes governance proposals from a Cosmos-based API or website, then sends status updates and vote notifications to a Discord channel. This setup includes:

- Automated scraping of new proposals and their votes.
- Real-time Discord notifications for new proposals, new votes, and status changes (e.g., passed, rejected).
- Structured storage of known proposals in a JSON file for tracking across runs.
- Automatic creation of Discord threads for each proposal, providing a central place for follow-up notifications.

---

## Table of Contents
1. [Features](#features)
2. [Getting Started](#getting-started)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Project Structure](#project-structure)
6. [License](#license)

---

## Features

- **Discord Bot:** Listens for new proposals, updates, and vote events. Posts notifications to a specified Discord channel.
- **Automated Proposal Scraping:** Uses either a web-scraping approach (via Puppeteer) or a Cosmos API endpoint to pull data on proposals, their current voting status, and votes.
- **Thread Management:** Creates individual Discord threads for new proposals to keep relevant updates and discussions in one place.
- **Vote Tracking:** Notifies whenever new votes appear. Summarizes the total votes for each option (Yes / No / Veto / Abstain).
- **Cron Scheduling:** Uses `node-cron` to schedule the scraping tasks at a given interval (default: every minute).
- **JSON Storage:** Persists known proposals in a local JSON file (`knownProposals.json`) to track ongoing status across bot restarts.

---

## Getting Started

### Prerequisites
- **Node.js** (version 16+ recommended)
- **npm** or **yarn**
- A **Discord Bot Token** ([how to create a Discord Bot](https://discord.com/developers/applications))
- Basic knowledge of environment variables and Discord channel setup

### Installation
1. **Clone** this repository or copy the relevant files into your project.
2. **Install dependencies**:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```
3. **Create an `.env` file** at the root of the project (or rename `.env.example` to `.env`) and fill in the required environment variables (see [Configuration](#configuration)).

---

## Configuration

The `.env.example` file illustrates the environment variables needed:

```bash
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
DISCORD_CHANNEL_ID=YOUR_DISCORD_CHANNEL_ID
PROPOSAL_PAGE_URL=https://governance.xrplevm.org/xrplevm/proposals/36
BASE_PROPOSAL_URL=https://governance.xrplevm.org/xrplevm/proposals
COSMOS_GOV_API_URL= # Optional if you prefer the Cosmos Gov API approach
```

- **DISCORD_BOT_TOKEN**: The token for your Discord bot.
- **DISCORD_CHANNEL_ID**: The channel ID where the bot will post notifications.
- **PROPOSAL_PAGE_URL**: The specific URL for a single proposal you might track (used in old Puppeteer code).
- **BASE_PROPOSAL_URL**: The base URL for the proposal pages if scraping using Puppeteer. 
- **COSMOS_GOV_API_URL**: The base URL for the Cosmos governance API if using the axios-based approach.

You can omit or disable one of the scraping strategies if only one is needed. By default, the bot tries to use the environment variables properly, but you can modify the code if you want to only use Puppeteer or the Cosmos Gov API.

---

## Usage

1. **Run** the bot with:
   ```bash
   npm start
   ```
   or
   ```bash
   node ./src/bot.js
   ```

2. **Behavior**:
   - Once started, the bot logs into Discord and immediately performs a scraping cycle (`scrapeAllProposals` + `validateProposals`).
   - The scraping cycle repeats every minute (adjustable via `node-cron` in [src/bot.js](./src/bot.js)).
   - New proposals are announced in the specified Discord channel as separate messages. A dedicated thread is created for each proposal to group status updates and new vote notifications.

3. **File Outputs**:
   - `knownProposals.json`: A persistent file that stores recognized proposals. 
   - `threadMap.json`: Maps each proposal to its Discord thread ID, so updates can continue in the correct thread.

4. **Generating a Complete Code Bundle**:
   - The included script `save_project_code.sh` collects all relevant code into a single `code.txt` file (excluding specified filetypes and directories). Run:
     ```bash
     ./save_project_code.sh
     ```
     This is useful for archiving or sharing a snapshot of the code.

---

## Project Structure

<details>
<summary>Click to expand</summary>

```
.
├── LICENSE                 # MIT License
├── .gitignore
├── .env.example            # Template for environment variables
├── save_project_code.sh    # Script to compile code into a single text file
├── src
│   ├── bot.js              # Main entry point for the Discord bot
│   ├── validateProposals.js # Validates proposals, updates statuses and votes
│   ├── utils
│   │   ├── puppeteerOld.js # Puppeteer-based web scraping logic
│   │   └── cosmosGovApi.js # Axios-based API scraping logic
│   ├── handlers
│   │   ├── notifyNewProposal.js # Handles new proposal notification logic
│   │   ├── notifyNewVotes.js    # Handles new votes notification logic
│   │   └── notifyNewStatus.js   # Handles changes in proposal status
├── knownProposals.json (created at runtime)
├── threadMap.json (created at runtime)
└── package.json
```
</details>

**Key Scripts**:
- **`src/bot.js`**: Initializes the Discord bot, sets up a cron job, and orchestrates scraping tasks.
- **`validateProposals.js`**: Compares known proposals with newly scraped data, triggers status or vote notifications as needed.
- **`puppeteerOld.js`**: Original Puppeteer-based approach to scrape proposal pages.
- **`cosmosGovApi.js`**: Axios-based approach for pulling proposals directly from a Cosmos Gov API endpoint.

---

## License

This project is licensed under the [MIT License](./LICENSE). 

```
MIT License

Copyright (c) 2024 vriveraPeersyst
```

See [LICENSE](./LICENSE) for the full license text.

---

### Thanks for using the XRPL EVM Governance Discord Bot!

If you find any issues, feel free to open an issue or submit a pull request.