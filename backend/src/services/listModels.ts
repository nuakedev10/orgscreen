import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  );
  const data = await response.json() as any;
  console.log('Available models:');
  data.models.forEach((m: any) => console.log(m.name));
}

listModels();