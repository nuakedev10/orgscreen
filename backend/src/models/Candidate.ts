import mongoose, { Document, Schema } from 'mongoose';

// Umurava Talent Profile Schema. Enums match the spec exactly so JSON imports
// can pass straight through.

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type LanguageProficiency = 'Basic' | 'Conversational' | 'Fluent' | 'Native';
export type AvailabilityStatus = 'Available' | 'Open to Opportunities' | 'Not Available';
export type AvailabilityType = 'Full-time' | 'Part-time' | 'Contract';

export interface ISkill {
  name: string;
  level: SkillLevel;
  yearsOfExperience?: number;
}

export interface ILanguage {
  name: string;
  proficiency: LanguageProficiency;
}

export interface IExperience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string;
  technologies?: string[];
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
}

export interface ICertification {
  name: string;
  issuer: string;
  issueDate?: string;
}

export interface IProject {
  name: string;
  description: string;
  technologies?: string[];
  role?: string;
  link?: string;
  startDate?: string;
  endDate?: string;
}

export interface IAvailability {
  status: AvailabilityStatus;
  type: AvailabilityType;
  startDate?: string;
}

export interface ISocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ICandidate extends Document {
  jobId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
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
  fullName?: string;
  resumeText?: string;
  source: 'umurava' | 'upload' | 'json' | 'manual' | 'csv' | 'pdf';
  decisionStatus?: 'hired' | 'maybe' | 'rejected' | null;
  createdAt: Date;
}

const SkillSchema = new Schema<ISkill>({
  name: { type: String, required: true },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    required: true,
  },
  yearsOfExperience: { type: Number, min: 0 },
}, { _id: false });

const LanguageSchema = new Schema<ILanguage>({
  name: { type: String, required: true },
  proficiency: {
    type: String,
    enum: ['Basic', 'Conversational', 'Fluent', 'Native'],
    required: true,
  },
}, { _id: false });

const ExperienceSchema = new Schema<IExperience>({
  company: { type: String, required: true },
  role: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, default: null },
  isCurrent: { type: Boolean, default: false },
  description: { type: String, default: '' },
  technologies: [{ type: String }],
}, { _id: false });

const EducationSchema = new Schema<IEducation>({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  fieldOfStudy: { type: String, default: '' },
  startYear: { type: Number },
  endYear: { type: Number },
}, { _id: false });

const CertificationSchema = new Schema<ICertification>({
  name: { type: String, required: true },
  issuer: { type: String, required: true },
  issueDate: { type: String },
}, { _id: false });

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  technologies: [{ type: String }],
  role: { type: String, default: '' },
  link: { type: String, default: '' },
  startDate: { type: String },
  endDate: { type: String },
}, { _id: false });

const AvailabilitySchema = new Schema<IAvailability>({
  status: {
    type: String,
    enum: ['Available', 'Open to Opportunities', 'Not Available'],
    required: true,
    default: 'Open to Opportunities',
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract'],
    required: true,
    default: 'Full-time',
  },
  startDate: { type: String },
}, { _id: false });

const SocialLinksSchema = new Schema<ISocialLinks>({
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },
}, { _id: false });

const CandidateSchema = new Schema<ICandidate>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  location: { type: String, trim: true },
  headline: { type: String, required: true, trim: true },
  bio: { type: String, default: '' },
  skills: { type: [SkillSchema], default: [] },
  languages: { type: [LanguageSchema], default: [] },
  experience: { type: [ExperienceSchema], default: [] },
  education: { type: [EducationSchema], default: [] },
  certifications: { type: [CertificationSchema], default: [] },
  projects: { type: [ProjectSchema], default: [] },
  availability: {
    type: AvailabilitySchema,
    required: true,
    default: () => ({ status: 'Open to Opportunities', type: 'Full-time' }),
  },
  socialLinks: { type: SocialLinksSchema, default: () => ({}) },
  resumeText: { type: String },
  source: {
    type: String,
    enum: ['umurava', 'upload', 'json', 'manual', 'csv', 'pdf'],
    required: true,
  },
  decisionStatus: {
    type: String,
    enum: ['hired', 'maybe', 'rejected'],
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

CandidateSchema.virtual('fullName').get(function (this: ICandidate) {
  return (this.firstName + ' ' + this.lastName).trim();
});

CandidateSchema.set('toJSON', { virtuals: true });
CandidateSchema.set('toObject', { virtuals: true });

CandidateSchema.index({ jobId: 1, email: 1 });
CandidateSchema.index({ organizationId: 1 });

export default mongoose.model<ICandidate>('Candidate', CandidateSchema);
