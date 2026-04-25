import { Request, Response } from 'express';
import Candidate from '../models/Candidate';
import {
  parseCSV,
  parsePDF,
  parseJSONProfile,
  normalizeJSONProfile,
  cleanupFile,
  extractResumeFields,
} from '../services/fileParserService';
import mongoose from 'mongoose';

// Manual + JSON intake. Accepts either a single Umurava-shaped profile object
// or an array. Each profile is normalised through the same path the JSON file
// upload uses.
export const addCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId, candidates, candidate } = req.body;

    if (!jobId || !organizationId) {
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const list: any[] = Array.isArray(candidates)
      ? candidates
      : candidate
        ? [candidate]
        : [];

    if (list.length === 0) {
      res.status(400).json({ error: 'Provide a candidates array or candidate object in the body' });
      return;
    }

    const docs: any[] = [];
    const errors: { index: number; error: string }[] = [];

    list.forEach((entry, idx) => {
      try {
        const normalized = normalizeJSONProfile(entry);
        docs.push({
          ...normalized,
          jobId: new mongoose.Types.ObjectId(jobId),
          organizationId: new mongoose.Types.ObjectId(organizationId),
          source: entry.source || 'manual',
        });
      } catch (e: any) {
        errors.push({ index: idx, error: e.message });
      }
    });

    if (docs.length === 0) {
      res.status(400).json({ error: 'No valid candidates submitted', details: errors });
      return;
    }

    const saved = await Candidate.insertMany(docs);

    res.status(201).json({
      message: saved.length + ' candidate(s) added successfully',
      candidates: saved,
      errors: errors.length ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Add candidates error:', error);
    res.status(500).json({ error: error?.message || 'Failed to add candidates' });
  }
};

// Simplified CSV intake. Required CSV columns: firstName, lastName, email.
export const uploadCSVCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { jobId, organizationId } = req.body;
    if (!jobId || !organizationId) {
      cleanupFile(req.file.path);
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const parsed = parseCSV(req.file.path);
    cleanupFile(req.file.path);

    if (parsed.length === 0) {
      res.status(400).json({
        error: 'No valid rows found. CSV needs firstName, lastName, and email columns.',
      });
      return;
    }

    const candidateDocs = parsed.map((c: any) => ({
      ...c,
      jobId: new mongoose.Types.ObjectId(jobId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      source: 'csv',
    }));

    const saved = await Candidate.insertMany(candidateDocs);

    res.status(201).json({
      message: saved.length + ' candidate(s) imported from CSV',
      candidates: saved,
    });
  } catch (error: any) {
    console.error('CSV upload error:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: error?.message || 'Failed to process CSV file' });
  }
};

// JSON profile upload. Accepts a .json file with one profile or an array.
export const uploadJSONProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { jobId, organizationId } = req.body;
    if (!jobId || !organizationId) {
      cleanupFile(req.file.path);
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    let parsed: any[];
    try {
      parsed = parseJSONProfile(req.file.path);
    } catch (e: any) {
      cleanupFile(req.file.path);
      res.status(400).json({ error: e?.message || 'Invalid JSON profile(s)' });
      return;
    }

    cleanupFile(req.file.path);

    const candidateDocs = parsed.map((c: any) => ({
      ...c,
      jobId: new mongoose.Types.ObjectId(jobId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      source: 'json',
    }));

    const saved = await Candidate.insertMany(candidateDocs);

    res.status(201).json({
      message: saved.length + ' candidate(s) imported from JSON',
      candidates: saved,
    });
  } catch (error: any) {
    console.error('JSON upload error:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: error?.message || 'Failed to process JSON file' });
  }
};

// Single-resume PDF upload (uses Gemini extraction).
export const uploadPDFCandidate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { jobId, organizationId } = req.body;
    if (!jobId || !organizationId) {
      cleanupFile(req.file.path);
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const resumeText = await parsePDF(req.file.path);
    const extracted = await extractResumeFields(resumeText, req.file.originalname);
    cleanupFile(req.file.path);

    const candidate = await Candidate.create({
      jobId: new mongoose.Types.ObjectId(jobId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      firstName: extracted.firstName,
      lastName: extracted.lastName,
      email: extracted.email,
      phone: extracted.phone,
      location: extracted.location,
      headline: extracted.headline,
      bio: extracted.bio,
      skills: extracted.skills,
      languages: extracted.languages,
      experience: extracted.experience,
      education: extracted.education,
      certifications: extracted.certifications,
      projects: extracted.projects,
      availability: extracted.availability,
      socialLinks: extracted.socialLinks,
      resumeText: resumeText.slice(0, 20000),
      source: 'pdf',
    });

    res.status(201).json({ message: 'PDF candidate added successfully', candidate });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: error?.message || 'Failed to process PDF file' });
  }
};

// Bulk PDF resume intake. Sequential to keep API rate gentle.
export const uploadMultiplePDFs = async (req: Request, res: Response): Promise<void> => {
  const files = (req.files as Express.Multer.File[]) || [];

  try {
    if (files.length === 0) {
      res.status(400).json({ error: 'No PDF files uploaded' });
      return;
    }

    const { jobId, organizationId } = req.body;
    if (!jobId || !organizationId) {
      files.forEach(f => cleanupFile(f.path));
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const results: Array<{
      filename: string;
      status: 'parsed' | 'failed';
      candidate?: any;
      reason?: string;
    }> = [];

    for (const file of files) {
      try {
        const resumeText = await parsePDF(file.path);
        const extracted = await extractResumeFields(resumeText, file.originalname);

        const candidate = await Candidate.create({
          jobId: new mongoose.Types.ObjectId(jobId),
          organizationId: new mongoose.Types.ObjectId(organizationId),
          firstName: extracted.firstName,
          lastName: extracted.lastName,
          email: extracted.email,
          phone: extracted.phone,
          location: extracted.location,
          headline: extracted.headline,
          bio: extracted.bio,
          skills: extracted.skills,
          languages: extracted.languages,
          experience: extracted.experience,
          education: extracted.education,
          certifications: extracted.certifications,
          projects: extracted.projects,
          availability: extracted.availability,
          socialLinks: extracted.socialLinks,
          resumeText: resumeText.slice(0, 20000),
          source: 'pdf',
        });

        results.push({
          filename: file.originalname,
          status: 'parsed',
          candidate: {
            _id: candidate._id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            headline: candidate.headline,
            skills: candidate.skills,
          },
        });
      } catch (err: any) {
        console.error('[uploadMultiplePDFs] Failed on ' + file.originalname + ':', err?.message || err);
        results.push({
          filename: file.originalname,
          status: 'failed',
          reason: err?.message || 'Unknown error while parsing resume',
        });
      } finally {
        cleanupFile(file.path);
      }
    }

    const parsedCount = results.filter(r => r.status === 'parsed').length;
    const failedCount = results.length - parsedCount;

    res.status(201).json({
      message: 'Processed ' + results.length + ' resume(s) - ' + parsedCount + ' imported, ' + failedCount + ' failed',
      results,
      parsed: parsedCount,
      failed: failedCount,
    });
  } catch (error: any) {
    console.error('Bulk PDF upload error:', error);
    files.forEach(f => cleanupFile(f.path));
    res.status(500).json({ error: error?.message || 'Failed to process resumes' });
  }
};

export const getCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId } = req.query;
    const filter: any = {};
    if (jobId) filter.jobId = jobId;
    if (organizationId) filter.organizationId = organizationId;
    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.json({ candidates, total: candidates.length });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch candidates' });
  }
};

export const updateCandidateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['hired', 'maybe', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be hired, maybe, or rejected' });
      return;
    }

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { decisionStatus: status },
      { new: true }
    );

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    res.json({ message: 'Status updated', candidate });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update candidate status' });
  }
};
