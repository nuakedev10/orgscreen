import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Organization from '../models/Organization';
import Job from '../models/Job';
import Candidate from '../models/Candidate';
import ScreeningResult from '../models/ScreeningResult';

// Create a new organization
export const createOrganization = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      industry,
      cultureValues,
      hiringPriorities,
      idealCandidatePersonas,
      pastJobDescriptions,
      knowledgeBase
    } = req.body;

    if (!name || !industry) {
      res.status(400).json({ error: 'Name and industry are required' });
      return;
    }

    const org = new Organization({
      name,
      industry,
      cultureValues: cultureValues || [],
      hiringPriorities: hiringPriorities || {
        skills: 40,
        experience: 30,
        education: 15,
        cultureFit: 15
      },
      idealCandidatePersonas: idealCandidatePersonas || [],
      pastJobDescriptions: pastJobDescriptions || [],
      knowledgeBase: knowledgeBase || ''
    });

    await org.save();

    res.status(201).json({
      message: 'Organization created successfully',
      organization: org
    });
  } catch (error) {
    console.error('Create org error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
};

// Get all organizations
export const getOrganizations = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    res.json({ organizations: orgs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};

// Get single organization
export const getOrganization = async (req: Request, res: Response): Promise<void> => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json({ organization: org });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
};

// Update organization
export const updateOrganization = async (req: Request, res: Response): Promise<void> => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json({ message: 'Organization updated', organization: org });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' });
  }
};

// Delete organization (and cascade delete its jobs, candidates, screening results)
export const deleteOrganization = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: `Invalid organization id: ${id}` });
      return;
    }

    const org = await Organization.findById(id);
    if (!org) {
      res.status(404).json({ error: 'Organization not found. It may have already been deleted.' });
      return;
    }

    // Cascade: remove all data tied to this organization so we don't leave orphans.
    const [jobsDeleted, candidatesDeleted, resultsDeleted] = await Promise.all([
      Job.deleteMany({ organizationId: id }),
      Candidate.deleteMany({ organizationId: id }),
      ScreeningResult.deleteMany({ organizationId: id })
    ]);

    await Organization.findByIdAndDelete(id);

    console.log(`[delete-org] Deleted org "${org.name}" (${id}) · jobs=${jobsDeleted.deletedCount} candidates=${candidatesDeleted.deletedCount} results=${resultsDeleted.deletedCount}`);

    res.json({
      message: 'Organization and related data deleted',
      deleted: {
        organization: org.name,
        jobs: jobsDeleted.deletedCount,
        candidates: candidatesDeleted.deletedCount,
        screeningResults: resultsDeleted.deletedCount
      }
    });
  } catch (error: any) {
    console.error(`[delete-org] Failed for id=${id}:`, error);
    const message = error?.message || 'Failed to delete organization';
    res.status(500).json({ error: `Failed to delete organization: ${message}` });
  }
};