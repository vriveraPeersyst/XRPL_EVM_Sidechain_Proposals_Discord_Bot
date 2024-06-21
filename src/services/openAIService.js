const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = {
  async getAIExplanation(prompt) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Context: The XRPL EVM Sidechain is a new blockchain built using Cosmos SDK and evmOS, with bridged XRP as the native currency, facilitated through Axelar Network and XRPL CrossChain amendment.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error with OpenAI API:', error);
      throw new Error('Failed to get explanation from OpenAI.');
    }
  },
};
