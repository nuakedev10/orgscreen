import { generateJson } from './geminiService';
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

  console.log(`[screening] Running Gemini screening for ${candidates.length} candidates (shortlist=${shortlistSize})...`);

  // Send to Gemini in strict JSON mode. generateJson throws a descriptive
  // error if the model returns empty / malformed output, which we want to
  // bubble up to the client instead of swallowing.
  const parsed = await generateJson<ScreeningOutput>(prompt);

  // Validate the response has a shortlist
  if (!parsed.shortlist || !Array.isArray(parsed.shortlist)) {
    throw new Error('AI response is missing a "shortlist" array. Model may have truncated.');
  }

  const normalizeRecommendation = (raw: string): string => {
    const r = (raw || '').toLowerCase();
    if (r.includes('strong hire') || r.includes('strongly')) return 'Strong Hire';
    if (r.includes('no hire') || r.includes('reject') || r.includes('not recommend')) return 'No Hire';
    if (r.includes('maybe') || r.includes('consider') || r.includes('potential')) return 'Maybe';
    if (r.includes('hire')) return 'Hire';
    return 'Maybe';
  };

  // Defensive: some candidates may miss fields, fill in safe defaults.
  parsed.shortlist = parsed.shortlist.map((c: any, i: number) => ({
    candidateId: c.candidateId,
    fullName: c.fullName || 'Unknown candidate',
    rank: c.rank ?? i + 1,
    overallScore: Math.max(0, Math.min(100, c.overallScore ?? 0)),
    dimensionScores: {
      skills: c.dimensionScores?.skills ?? 0,
      experience: c.dimensionScores?.experience ?? 0,
      education: c.dimensionScores?.education ?? 0,
      cultureFit: c.dimensionScores?.cultureFit ?? 0,
    },
    strengths: Array.isArray(c.strengths) ? c.strengths : [],
    gaps: Array.isArray(c.gaps) ? c.gaps : [],
    biasFlags: Array.isArray(c.biasFlags) ? c.biasFlags : [],
    recommendation: normalizeRecommendation(c.recommendation),
    reasoning: c.reasoning || '',
  }));

  console.log(`[screening] Complete. Shortlisted ${parsed.shortlist.length} candidates.`);

  return {
    shortlist: parsed.shortlist,
    totalCandidatesScreened: parsed.totalCandidatesScreened ?? candidates.length,
    shortlistSize: parsed.shortlistSize ?? shortlistSize,
    screeningNotes: parsed.screeningNotes || '',
  };
};
