import { Request, Response } from 'express';
import Organization from '../models/Organization';
import Job from '../models/Job';
import Candidate from '../models/Candidate';
import ScreeningResult from '../models/ScreeningResult';
import { runScreening } from '../services/screeningService';

export const triggerScreening = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId, shortlistSize = 10 } = req.body;

    if (!jobId || !organizationId) {
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const [org, job, candidates] = await Promise.all([
      Organization.findById(organizationId),
      Job.findById(jobId),
      Candidate.find({ jobId, organizationId })
    ]);

    if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (candidates.length === 0) { res.status(400).json({ error: 'No candidates found for this job' }); return; }

    await Job.findByIdAndUpdate(jobId, { status: 'screening' });

    const result = await runScreening(org, job, candidates, shortlistSize);

    const screeningResult = new ScreeningResult({
      jobId,
      organizationId,
      shortlistSize,
      candidates: result.shortlist,
      aiModel: 'gemini-2.5-flash',
      promptVersion: 'v1'
    });

    await screeningResult.save();
    await Job.findByIdAndUpdate(jobId, { status: 'closed' });

    res.status(200).json({
      message: 'Screening completed successfully',
      result: screeningResult,
      totalCandidatesScreened: result.totalCandidatesScreened,
      screeningNotes: result.screeningNotes
    });
  } catch (error) {
    console.error('Screening error:', error);
    res.status(500).json({ error: 'Screening failed. Please try again.' });
  }
};

export const getScreeningResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const results = await ScreeningResult.findOne({ jobId }).sort({ createdAt: -1 });

    if (!results) {
      res.status(404).json({ error: 'No screening results found for this job' });
      return;
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch screening results' });
  }
};

export const rerankCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resultId, weights } = req.body;

    const result = await ScreeningResult.findById(resultId);
    if (!result) {
      res.status(404).json({ error: 'Screening result not found' });
      return;
    }

    const reranked = result.candidates.map((candidate: any) => {
      const newScore =
        (candidate.dimensionScores.skills * weights.skills / 100) +
        (candidate.dimensionScores.experience * weights.experience / 100) +
        (candidate.dimensionScores.education * weights.education / 100) +
        (candidate.dimensionScores.cultureFit * weights.cultureFit / 100);

      return { ...candidate.toObject(), overallScore: Math.round(newScore) };
    });

    reranked.sort((a: any, b: any) => b.overallScore - a.overallScore);
    reranked.forEach((c: any, i: number) => { c.rank = i + 1; });

    res.json({ message: 'Candidates reranked successfully', candidates: reranked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rerank candidates' });
  }
};