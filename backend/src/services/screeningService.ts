import { generateContent } from './geminiService';
import { buildScreeningPrompt } from './promptService';
import { IOrganization } from '../models/Organization';
import { IJob } from '../models/Job';
import { ICandidate } from '../models/Candidate';
import { ICandidateScore } from '../models/ScreeningResult';

interface ScreeningOutput {
  shortlist: ICandidateScore[];
  totalCandidatesScreened: number;
  shortlistSize: number;
  screeningNotes: string;
}

export const runScreening = async (
  org: IOrganization,
  job: IJob,
  candidates: ICandidate[],
  shortlistSize: number = 10
): Promise<ScreeningOutput> => {

  if (candidates.length === 0) {
    throw new Error('No candidates provided for screening');
  }

  // Build the full personalized prompt
  const prompt = buildScreeningPrompt(org, job, candidates, shortlistSize);

  console.log(`Running screening for ${candidates.length} candidates...`);

  // Send to Gemini
  const rawResponse = await generateContent(prompt);

  // Clean the response — Gemini sometimes wraps JSON in markdown
  const cleaned = rawResponse
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  // Parse the JSON response
  let parsed: ScreeningOutput;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse Gemini response:', cleaned);
    throw new Error('AI returned an invalid response format. Please try again.');
  }

  // Validate the response has a shortlist
  if (!parsed.shortlist || !Array.isArray(parsed.shortlist)) {
    throw new Error('AI response missing shortlist data');
  }

  console.log(`Screening complete. Shortlisted ${parsed.shortlist.length} candidates.`);

  return parsed;
};