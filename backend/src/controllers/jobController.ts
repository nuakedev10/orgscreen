import { Request, Response } from 'express';
import Job from '../models/Job';
import Organization from '../models/Organization';

// Create a job
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      title,
      department,
      experienceLevel,
      requiredSkills,
      niceToHaveSkills,
      educationRequirement,
      responsibilities,
      additionalNotes
    } = req.body;

    if (!organizationId || !title) {
      res.status(400).json({ error: 'Organization ID and job title are required' });
      return;
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const job = new Job({
      organizationId,
      title,
      department: department || '',
      experienceLevel: experienceLevel || '',
      requiredSkills: requiredSkills || [],
      niceToHaveSkills: niceToHaveSkills || [],
      educationRequirement: educationRequirement || '',
      responsibilities: responsibilities || [],
      additionalNotes: additionalNotes || '',
      status: 'open'
    });

    await job.save();

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

// Get all jobs for an organization
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organizationId } : {};
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// Get single job
export const getJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id).populate('organizationId');
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

// Update job status
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ message: 'Job updated', job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
};