# XRPL EVM Sidechain Proposals Discord Bot

## Overview
The XRPL EVM Sidechain Proposals Discord Bot is a versatile and automated bot designed to keep your Discord community informed about the latest proposals on the XRPL EVM Sidechain. This bot scrapes proposal data, including validator votes, and posts updates directly to your Discord channel. It's a powerful tool for anyone involved in the XRPL EVM Sidechain ecosystem, providing real-time notifications and detailed information about each proposal.

## Features
- **Automated Proposal Updates**: Automatically scrapes and updates the latest proposals from the XRPL EVM Sidechain.
- **Detailed Proposal Information**: Retrieves and displays comprehensive proposal data including titles, states, submission times, voting periods, proposers, and detailed messages.
- **Validator Votes**: Extracts and displays validator votes for each proposal.
- **Real-Time Notifications**: Sends real-time notifications to a designated Discord channel whenever a new proposal is detected.
- **Custom Commands**: Offers a set of commands for users to interact with the bot and retrieve specific proposal information.

## Commands
- **Active Proposals Command**: `!activeproposals`
  - **Description**: Lists all active proposals.
- **Explain AI Command**: `!explainai <proposal_number>`
  - **Description**: Get an AI-generated explanation for a proposal message.
- **Proposal Information Command**: `!proposal <proposal_number>`
  - **Description**: Get detailed information about a specific proposal.
- **Proposal Votes Command**: `!proposalvotes <proposal_number>`
  - **Description**: Get validator votes for a specific proposal.

## Setup

### Prerequisites
- Node.js v16.x or higher
- A Discord bot token
- OpenAI API key
- Configuration file with necessary settings

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/vriveraPeersyst/xrpl-evm-sidechain-proposals-bot.git
    cd xrpl-evm-sidechain-proposals-bot
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a configuration file:
    - Create a `config` directory in the root of the project.
    - Inside the `config` directory, create a `config.json` file with your bot settings.
    - Example `config.json`:
      ```json
      {
        "token": "YOUR_DISCORD_BOT_TOKEN",
        "channelid": "YOUR_DISCORD_CHANNEL_ID",
      "proposalPageUrl": "https://governance.xrplevm.org/xrp/proposals/36",
      "baseProposalUrl": "https://governance.xrplevm.org/xrp/proposals"
      }
      ```

4. Create a `.env` file:
    - In the root of the project, create a `.env` file.
    - Add your OpenAI API key to the `.env` file.
    - Example `.env`:
      ```plaintext
      OPENAI_API_KEY=your_openai_api_key
      ```

5. Run the bot:
    ```bash
    node src/bot.js
    ```

## Contributing
We welcome contributions to enhance the capabilities of the XRPL EVM Sidechain Proposals Discord Bot. Please feel free to submit issues, fork the repository, and send pull requests.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.

## Acknowledgements
Special thanks to the XRPL EVM Sidechain community for their support and contributions.


