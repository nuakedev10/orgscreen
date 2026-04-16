import dotenv from 'dotenv';
dotenv.config();

import { generateContent } from './geminiService';

const test = async () => {
  try {
    console.log('Testing Gemini connection...');
    const response = await generateContent(
      'Say exactly this and nothing else: OrgScreen AI is ready.'
    );
    console.log('Gemini response:', response);
  } catch (error) {
    console.error('Gemini test failed:', error);
  }
};

test();