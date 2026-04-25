import fs from 'fs';
import pdfParse from 'pdf-parse';
import {
  ICandidate,
  ISkill,
  ILanguage,
  IExperience,
  IEducation,
  ICertification,
  IProject,
  IAvailability,
  ISocialLinks,
  SkillLevel,
  LanguageProficiency,
  AvailabilityStatus,
  AvailabilityType,
} from '../models/Candidate';
import { generateJson } from './geminiService';

// PDF text extraction
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

// Helpers
const SKILL_LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const LANGUAGE_PROFICIENCIES: LanguageProficiency[] = ['Basic', 'Conversational', 'Fluent', 'Native'];
const AVAIL_STATUSES: AvailabilityStatus[] = ['Available', 'Open to Opportunities', 'Not Available'];
const AVAIL_TYPES: AvailabilityType[] = ['Full-time', 'Part-time', 'Contract'];

const coerceEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  const match = allowed.find(a => a.toLowerCase() === value.toLowerCase());
  return match ?? fallback;
};

const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// Simplified CSV intake. Required columns: firstName, lastName, email, headline.
// Optional: phone, location, bio, skills (semicolon list), linkedin, github, portfolio.
export const parseCSV = (filePath: string): Partial<ICandidate>[] => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());
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

      const firstName = row['firstname'] || row['first name'] || '';
      const lastName = row['lastname'] || row['last name'] || '';
      const email = row['email'] || '';
      if (!firstName || !lastName || !email) continue;

      const skillsRaw = row['skills']
        ? row['skills'].split(';').map(s => s.trim()).filter(Boolean)
        : [];
      const skills: ISkill[] = skillsRaw.map(name => ({
        name,
        level: 'Intermediate' as SkillLevel,
      }));

      candidates.push({
        firstName,
        lastName,
        email,
        phone: row['phone'] || '',
        location: row['location'] || row['city'] || '',
        headline: row['headline'] || row['title'] || (firstName + ' ' + lastName),
        bio: row['bio'] || '',
        skills,
        languages: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        availability: {
          status: 'Open to Opportunities',
          type: 'Full-time',
        },
        socialLinks: {
          linkedin: row['linkedin'] || '',
          github: row['github'] || '',
          portfolio: row['portfolio'] || '',
        },
        source: 'csv',
      });
    }

    return candidates;
  } catch (error) {
    console.error('CSV parse error:', error);
    throw new Error('Failed to parse CSV file');
  }
};

// Validate + normalise a single Umurava-shaped profile
export const normalizeJSONProfile = (raw: any): Partial<ICandidate> => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Profile must be a JSON object.');
  }

  const firstName = String(raw.firstName || '').trim();
  const lastName = String(raw.lastName || '').trim();
  const email = String(raw.email || '').trim();
  const headline = String(raw.headline || '').trim();

  if (!firstName || !lastName) throw new Error('Profile is missing firstName or lastName.');
  if (!email) throw new Error('Profile is missing email.');
  if (!headline) throw new Error('Profile is missing headline.');

  const skills: ISkill[] = arr<any>(raw.skills)
    .map(s => ({
      name: String(s?.name || '').trim(),
      level: coerceEnum<SkillLevel>(s?.level, SKILL_LEVELS, 'Intermediate'),
      yearsOfExperience: Number.isFinite(Number(s?.yearsOfExperience))
        ? Math.max(0, Number(s.yearsOfExperience))
        : undefined,
    }))
    .filter(s => s.name);

  const languages: ILanguage[] = arr<any>(raw.languages)
    .map(l => ({
      name: String(l?.name || '').trim(),
      proficiency: coerceEnum<LanguageProficiency>(
        l?.proficiency,
        LANGUAGE_PROFICIENCIES,
        'Conversational'
      ),
    }))
    .filter(l => l.name);

  const experience: IExperience[] = arr<any>(raw.experience)
    .map(e => ({
      company: String(e?.company || '').trim(),
      role: String(e?.role || '').trim(),
      startDate: String(e?.startDate || '').trim(),
      endDate: e?.endDate ? String(e.endDate).trim() : null,
      isCurrent: Boolean(e?.isCurrent),
      description: String(e?.description || '').trim(),
      technologies: arr<string>(e?.technologies).map(t => String(t).trim()).filter(Boolean),
    }))
    .filter(e => e.company && e.role);

  const education: IEducation[] = arr<any>(raw.education)
    .map(ed => ({
      institution: String(ed?.institution || '').trim(),
      degree: String(ed?.degree || '').trim(),
      fieldOfStudy: String(ed?.fieldOfStudy || ed?.field || '').trim(),
      startYear: Number.isFinite(Number(ed?.startYear)) ? Number(ed.startYear) : undefined,
      endYear: Number.isFinite(Number(ed?.endYear)) ? Number(ed.endYear) : undefined,
    }))
    .filter(ed => ed.institution && ed.degree);

  const certifications: ICertification[] = arr<any>(raw.certifications)
    .map(c => ({
      name: String(c?.name || '').trim(),
      issuer: String(c?.issuer || '').trim(),
      issueDate: c?.issueDate ? String(c.issueDate).trim() : undefined,
    }))
    .filter(c => c.name && c.issuer);

  const projects: IProject[] = arr<any>(raw.projects)
    .map(p => ({
      name: String(p?.name || '').trim(),
      description: String(p?.description || '').trim(),
      technologies: arr<string>(p?.technologies).map(t => String(t).trim()).filter(Boolean),
      role: String(p?.role || '').trim(),
      link: String(p?.link || '').trim(),
      startDate: p?.startDate ? String(p.startDate).trim() : undefined,
      endDate: p?.endDate ? String(p.endDate).trim() : undefined,
    }))
    .filter(p => p.name && p.description);

  const availabilityRaw = raw.availability || {};
  const availability: IAvailability = {
    status: coerceEnum<AvailabilityStatus>(
      availabilityRaw.status,
      AVAIL_STATUSES,
      'Open to Opportunities'
    ),
    type: coerceEnum<AvailabilityType>(availabilityRaw.type, AVAIL_TYPES, 'Full-time'),
    startDate: availabilityRaw.startDate ? String(availabilityRaw.startDate).trim() : undefined,
  };

  const socialLinksRaw = raw.socialLinks || {};
  const socialLinks: ISocialLinks = {
    linkedin: String(socialLinksRaw.linkedin || '').trim(),
    github: String(socialLinksRaw.github || '').trim(),
    portfolio: String(socialLinksRaw.portfolio || '').trim(),
  };

  return {
    firstName,
    lastName,
    email,
    phone: String(raw.phone || '').trim(),
    location: String(raw.location || '').trim(),
    headline,
    bio: String(raw.bio || '').trim(),
    skills,
    languages,
    experience,
    education,
    certifications,
    projects,
    availability,
    socialLinks,
    source: 'json',
  };
};

export const parseJSONProfile = (filePath: string): Partial<ICandidate>[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Uploaded file is not valid JSON.');
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  const out: Partial<ICandidate>[] = [];
  const errors: string[] = [];

  list.forEach((entry, idx) => {
    try {
      out.push(normalizeJSONProfile(entry));
    } catch (e: any) {
      errors.push('Profile ' + (idx + 1) + ': ' + e.message);
    }
  });

  if (out.length === 0 && errors.length) {
    throw new Error(errors.join('; '));
  }

  return out;
};

export const cleanupFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('File cleanup error:', error);
  }
};

// Gemini-powered resume extraction
export interface ExtractedResume {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  headline: string;
  bio?: string;
  skills: ISkill[];
  languages: ILanguage[];
  experience: IExperience[];
  education: IEducation[];
  certifications: ICertification[];
  projects: IProject[];
  availability: IAvailability;
  socialLinks: ISocialLinks;
  resumeSummary: string;
}

const RESUME_EXTRACTION_PROMPT = [
  'You are a resume parser that emits a Umurava Talent Profile.',
  '',
  'Read the resume text and return ONE JSON object that conforms to this schema:',
  '',
  '{',
  '  "firstName": "string",',
  '  "lastName": "string",',
  '  "email": "string",',
  '  "phone": "string",',
  '  "location": "string",',
  '  "headline": "string - short professional title",',
  '  "bio": "2-3 sentence summary",',
  '  "skills": [{ "name": "string", "level": "Beginner|Intermediate|Advanced|Expert", "yearsOfExperience": 0 }],',
  '  "languages": [{ "name": "string", "proficiency": "Basic|Conversational|Fluent|Native" }],',
  '  "experience": [{ "company": "", "role": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM or null", "isCurrent": false, "description": "", "technologies": [] }],',
  '  "education": [{ "institution": "", "degree": "", "fieldOfStudy": "", "startYear": 2018, "endYear": 2022 }],',
  '  "certifications": [{ "name": "", "issuer": "", "issueDate": "YYYY-MM" }],',
  '  "projects": [{ "name": "", "description": "", "technologies": [], "role": "", "link": "", "startDate": "", "endDate": "" }],',
  '  "availability": { "status": "Available|Open to Opportunities|Not Available", "type": "Full-time|Part-time|Contract", "startDate": "" },',
  '  "socialLinks": { "linkedin": "", "github": "", "portfolio": "" },',
  '  "resumeSummary": "string"',
  '}',
  '',
  'Rules:',
  '- Use the exact enum values listed above. Do not translate or pluralise them.',
  '- Infer skill level conservatively. If a skill is mentioned only in passing, mark Beginner.',
  '- For ongoing roles, set isCurrent=true and endDate=null.',
  '- If a section is genuinely absent, return an empty array. Never fabricate.',
  '- Default availability to {"status":"Open to Opportunities","type":"Full-time"} unless stated.',
  '- The headline must be a concise role-based phrase, not a full sentence.',
  '- Output ONLY the JSON object. No markdown, no prose, no code fences.',
  '',
  'Resume text:',
  '"""',
  '{RESUME_TEXT}',
  '"""',
].join('\n');

export const extractResumeFields = async (
  resumeText: string,
  filename?: string
): Promise<ExtractedResume> => {
  const trimmed = (resumeText || '').trim().slice(0, 12000);
  if (!trimmed) {
    throw new Error('Resume ' + (filename || '') + ' appears to be empty after text extraction.');
  }

  const prompt = RESUME_EXTRACTION_PROMPT.replace('{RESUME_TEXT}', trimmed);
  const parsed = await generateJson<ExtractedResume>(prompt);

  const fallbackName = (filename || 'Unknown Candidate').replace(/\.pdf$/i, '');
  const [fbFirst, ...fbRest] = fallbackName.split(/\s+/);

  const skills: ISkill[] = arr<any>(parsed.skills)
    .map(s => ({
      name: String(s?.name || '').trim(),
      level: coerceEnum<SkillLevel>(s?.level, SKILL_LEVELS, 'Intermediate'),
      yearsOfExperience: Number.isFinite(Number(s?.yearsOfExperience))
        ? Math.max(0, Number(s.yearsOfExperience))
        : undefined,
    }))
    .filter(s => s.name)
    .slice(0, 40);

  const languages: ILanguage[] = arr<any>(parsed.languages)
    .map(l => ({
      name: String(l?.name || '').trim(),
      proficiency: coerceEnum<LanguageProficiency>(
        l?.proficiency,
        LANGUAGE_PROFICIENCIES,
        'Conversational'
      ),
    }))
    .filter(l => l.name);

  const experience: IExperience[] = arr<any>(parsed.experience)
    .map(e => ({
      company: String(e?.company || '').trim(),
      role: String(e?.role || '').trim(),
      startDate: String(e?.startDate || '').trim(),
      endDate:
        e?.endDate && String(e.endDate).toLowerCase() !== 'null'
          ? String(e.endDate).trim()
          : null,
      isCurrent: Boolean(e?.isCurrent) || !e?.endDate,
      description: String(e?.description || '').trim(),
      technologies: arr<string>(e?.technologies).map(t => String(t).trim()).filter(Boolean),
    }))
    .filter(e => e.company && e.role)
    .slice(0, 10);

  const education: IEducation[] = arr<any>(parsed.education)
    .map(ed => ({
      institution: String(ed?.institution || '').trim(),
      degree: String(ed?.degree || '').trim(),
      fieldOfStudy: String(ed?.fieldOfStudy || '').trim(),
      startYear: Number.isFinite(Number(ed?.startYear)) ? Number(ed.startYear) : undefined,
      endYear: Number.isFinite(Number(ed?.endYear)) ? Number(ed.endYear) : undefined,
    }))
    .filter(ed => ed.institution && ed.degree);

  const certifications: ICertification[] = arr<any>(parsed.certifications)
    .map(c => ({
      name: String(c?.name || '').trim(),
      issuer: String(c?.issuer || '').trim(),
      issueDate: c?.issueDate ? String(c.issueDate).trim() : undefined,
    }))
    .filter(c => c.name && c.issuer);

  const projects: IProject[] = arr<any>(parsed.projects)
    .map(p => ({
      name: String(p?.name || '').trim(),
      description: String(p?.description || '').trim(),
      technologies: arr<string>(p?.technologies).map(t => String(t).trim()).filter(Boolean),
      role: String(p?.role || '').trim(),
      link: String(p?.link || '').trim(),
      startDate: p?.startDate ? String(p.startDate).trim() : undefined,
      endDate: p?.endDate ? String(p.endDate).trim() : undefined,
    }))
    .filter(p => p.name && p.description);

  const availabilityRaw = (parsed as any).availability || {};
  const availability: IAvailability = {
    status: coerceEnum<AvailabilityStatus>(
      availabilityRaw.status,
      AVAIL_STATUSES,
      'Open to Opportunities'
    ),
    type: coerceEnum<AvailabilityType>(availabilityRaw.type, AVAIL_TYPES, 'Full-time'),
    startDate: availabilityRaw.startDate ? String(availabilityRaw.startDate).trim() : undefined,
  };

  const socialLinksRaw = (parsed as any).socialLinks || {};
  const socialLinks: ISocialLinks = {
    linkedin: String(socialLinksRaw.linkedin || '').trim(),
    github: String(socialLinksRaw.github || '').trim(),
    portfolio: String(socialLinksRaw.portfolio || '').trim(),
  };

  return {
    firstName: parsed.firstName?.trim() || fbFirst || 'Unknown',
    lastName: parsed.lastName?.trim() || fbRest.join(' ') || 'Candidate',
    email: parsed.email?.trim() || '',
    phone: parsed.phone?.trim() || '',
    location: parsed.location?.trim() || '',
    headline: parsed.headline?.trim() || 'Candidate',
    bio: parsed.bio?.trim() || '',
    skills,
    languages,
    experience,
    education,
    certifications,
    projects,
    availability,
    socialLinks,
    resumeSummary: parsed.resumeSummary?.trim() || '',
  };
};
