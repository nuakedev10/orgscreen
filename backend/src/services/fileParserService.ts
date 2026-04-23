import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { ICandidate } from '../models/Candidate';
import mongoose from 'mongoose';
import { generateJson } from './geminiService';

// Reads text content out of a PDF file
export const parsePDF = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parse error:', error);
    throw new Error('Failed to parse PDF file');
  }
};

// Parses a CSV file into an array of candidate objects
export const parseCSV = (filePath: string): Partial<ICandidate>[] => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const candidates: Partial<ICandidate>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      candidates.push({
        fullName: row['fullname'] || row['name'] || row['full name'] || '',
        email: row['email'] || '',
        phone: row['phone'] || '',
        location: row['location'] || row['city'] || '',
        skills: row['skills'] ? row['skills'].split(';').map(s => s.trim()) : [],
        yearsOfExperience: parseInt(row['experience'] || row['years'] || '0'),
        education: {
          degree: row['degree'] || '',
          field: row['field'] || row['major'] || '',
          institution: row['institution'] || row['university'] || row['school'] || ''
        },
        workHistory: [],
        source: 'upload' as const
      });
    }

    return candidates.filter(c => c.fullName && c.email);
  } catch (error) {
    console.error('CSV parse error:', error);
    throw new Error('Failed to parse CSV file');
  }
};

// Cleans up uploaded files after processing
export const cleanupFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('File cleanup error:', error);
  }
};

// ---------------------------------------------------------------------------
// AI-powered resume extraction. Takes raw resume text (from pdf-parse) and
// returns a normalized candidate object. We do this per-resume so Gemini has
// a small, focused prompt and returns clean JSON every time.
// ---------------------------------------------------------------------------
export interface ExtractedResume {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  skills: string[];
  yearsOfExperience: number;
  education: {
    degree: string;
    field: string;
    institution: string;
  };
  workHistory: Array<{
    role: string;
    company: string;
    duration: string;
    description: string;
  }>;
  resumeSummary: string;
}

const RESUME_EXTRACTION_PROMPT = `You are a resume parser. Extract structured candidate data from the resume text below.

Return ONLY a single JSON object with this exact shape:
{
  "fullName": "string — full legal name as it appears on the resume",
  "email": "string — primary email, or empty string if none found",
  "phone": "string — phone number with country code if available, else empty string",
  "location": "string — city, country (or just country) if stated, else empty string",
  "skills": ["array", "of", "technical", "and", "professional", "skills"],
  "yearsOfExperience": 0,
  "education": {
    "degree": "string — highest degree, e.g. BSc, MSc, PhD",
    "field": "string — field of study, e.g. Computer Science",
    "institution": "string — university / institution name"
  },
  "workHistory": [
    {
      "role": "job title",
      "company": "employer",
      "duration": "e.g. 2020 - 2023 or Jan 2020 - Present",
      "description": "one-sentence summary of responsibilities and impact"
    }
  ],
  "resumeSummary": "string — 1-2 sentence summary of the candidate's profile and strongest selling point"
}

Rules:
- Infer yearsOfExperience conservatively from work history durations. If unclear, estimate, never return null.
- Skills should include programming languages, frameworks, tools, and named professional skills (e.g. "stakeholder management").
- Do NOT invent data. Leave strings empty and arrays empty when information is truly not present.
- Limit workHistory to the 5 most recent / most relevant entries.
- Output ONLY the JSON object, no prose, no markdown.

Resume text:
"""
{RESUME_TEXT}
"""`;

export const extractResumeFields = async (
  resumeText: string,
  filename?: string
): Promise<ExtractedResume> => {
  // Truncate very long resumes to keep prompt size reasonable (~12k chars
  // is plenty for a resume — Gemini 2.5 Flash handles far more but we want
  // to stay cheap and fast).
  const trimmed = (resumeText || '').trim().slice(0, 12000);

  if (!trimmed) {
    throw new Error(`Resume ${filename || ''} appears to be empty after text extraction.`);
  }

  const prompt = RESUME_EXTRACTION_PROMPT.replace('{RESUME_TEXT}', trimmed);

  const parsed = await generateJson<ExtractedResume>(prompt);

  // Normalize + defaults so downstream code never crashes on a missing field.
  return {
    fullName: parsed.fullName?.trim() || filename?.replace(/\.pdf$/i, '') || 'Unknown Candidate',
    email: parsed.email?.trim() || '',
    phone: parsed.phone?.trim() || '',
    location: parsed.location?.trim() || '',
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean).slice(0, 40) : [],
    yearsOfExperience: Number.isFinite(parsed.yearsOfExperience)
      ? Math.max(0, Math.round(parsed.yearsOfExperience))
      : 0,
    education: {
      degree: parsed.education?.degree?.trim() || '',
      field: parsed.education?.field?.trim() || '',
      institution: parsed.education?.institution?.trim() || '',
    },
    workHistory: Array.isArray(parsed.workHistory)
      ? parsed.workHistory.slice(0, 8).map(w => ({
          role: w.role?.trim() || '',
          company: w.company?.trim() || '',
          duration: w.duration?.trim() || '',
          description: w.description?.trim() || '',
        }))
      : [],
    resumeSummary: parsed.resumeSummary?.trim() || '',
  };
};
