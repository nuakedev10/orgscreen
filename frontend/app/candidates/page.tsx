'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { addCandidates, uploadCSV, uploadJSON, uploadMultiplePDFs, getCandidates, getJob } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  X,
  Upload,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  FileCheck2,
  FileWarning,
  Loader2,
  FileSpreadsheet,
  FileCode,
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  Languages as LanguagesIcon,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
type LanguageProficiency = 'Basic' | 'Conversational' | 'Fluent' | 'Native';
type AvailabilityStatus = 'Available' | 'Open to Opportunities' | 'Not Available';
type AvailabilityType = 'Full-time' | 'Part-time' | 'Contract';

type SkillEntry = { name: string; level: SkillLevel; yearsOfExperience: string };
type LanguageEntry = { name: string; proficiency: LanguageProficiency };
type ExperienceEntry = {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  technologies: string;
};
type EducationEntry = {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
};
type CertificationEntry = { name: string; issuer: string; issueDate: string };
type ProjectEntry = {
  name: string;
  description: string;
  technologies: string;
  role: string;
  link: string;
  startDate: string;
  endDate: string;
};

type ManualCandidate = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  bio: string;
  skills: SkillEntry[];
  languages: LanguageEntry[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  availability: { status: AvailabilityStatus; type: AvailabilityType; startDate: string };
  socialLinks: { linkedin: string; github: string; portfolio: string };
};

type UploadResult = {
  filename: string;
  status: 'parsed' | 'failed';
  candidate?: any;
  reason?: string;
};

const emptySkill = (): SkillEntry => ({ name: '', level: 'Intermediate', yearsOfExperience: '' });
const emptyLanguage = (): LanguageEntry => ({ name: '', proficiency: 'Conversational' });
const emptyExperience = (): ExperienceEntry => ({
  company: '',
  role: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
  technologies: '',
});
const emptyEducation = (): EducationEntry => ({
  institution: '',
  degree: '',
  fieldOfStudy: '',
  startYear: '',
  endYear: '',
});
const emptyCertification = (): CertificationEntry => ({ name: '', issuer: '', issueDate: '' });
const emptyProject = (): ProjectEntry => ({
  name: '',
  description: '',
  technologies: '',
  role: '',
  link: '',
  startDate: '',
  endDate: '',
});

const emptyCandidate = (): ManualCandidate => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  headline: '',
  bio: '',
  skills: [emptySkill()],
  languages: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [emptyProject()],
  availability: { status: 'Open to Opportunities', type: 'Full-time', startDate: '' },
  socialLinks: { linkedin: '', github: '', portfolio: '' },
});

function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || '';
  const orgId = searchParams.get('orgId') || '';

  const [job, setJob] = useState<any>(null);
  const [existing, setExisting] = useState<any[]>([]);
  const [candidate, setCandidate] = useState<ManualCandidate>(emptyCandidate());
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [mode, setMode] = useState<'resumes' | 'json' | 'csv' | 'manual'>('resumes');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [jsonUploading, setJsonUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!jobId || !orgId) return;
    getJob(jobId).then(res => setJob(res.data.job)).catch(() => {});
    getCandidates(jobId).then(res => setExisting(res.data.candidates || [])).catch(() => {});
  }, [jobId, orgId]);

  const updateBasic = (field: keyof ManualCandidate, value: any) => {
    setCandidate({ ...candidate, [field]: value });
  };

  const updateAvailability = (field: keyof ManualCandidate['availability'], value: string) => {
    setCandidate({ ...candidate, availability: { ...candidate.availability, [field]: value as any } });
  };

  const updateSocial = (field: keyof ManualCandidate['socialLinks'], value: string) => {
    setCandidate({ ...candidate, socialLinks: { ...candidate.socialLinks, [field]: value } });
  };

  const updateListItem = <K extends 'skills' | 'languages' | 'experience' | 'education' | 'certifications' | 'projects'>(
    list: K,
    index: number,
    field: string,
    value: any
  ) => {
    const next = [...candidate[list]] as any[];
    next[index] = { ...next[index], [field]: value };
    setCandidate({ ...candidate, [list]: next as any });
  };

  const addListItem = (list: 'skills' | 'languages' | 'experience' | 'education' | 'certifications' | 'projects') => {
    const factory = {
      skills: emptySkill,
      languages: emptyLanguage,
      experience: emptyExperience,
      education: emptyEducation,
      certifications: emptyCertification,
      projects: emptyProject,
    }[list];
    setCandidate({ ...candidate, [list]: [...candidate[list], factory()] as any });
  };

  const removeListItem = (
    list: 'skills' | 'languages' | 'experience' | 'education' | 'certifications' | 'projects',
    index: number
  ) => {
    const next = (candidate[list] as any[]).filter((_, i) => i !== index);
    setCandidate({ ...candidate, [list]: next as any });
  };

  const handleSaveManual = async () => {
    setError('');
    setSuccess('');

    if (!candidate.firstName.trim() || !candidate.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!candidate.email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!candidate.headline.trim()) {
      setError('Headline is required (a short professional title).');
      return;
    }

    const cleanSkills = candidate.skills
      .filter(s => s.name.trim())
      .map(s => ({
        name: s.name.trim(),
        level: s.level,
        yearsOfExperience: s.yearsOfExperience ? Number(s.yearsOfExperience) : undefined,
      }));

    if (cleanSkills.length === 0) {
      setError('Add at least one skill.');
      return;
    }

    const cleanProjects = candidate.projects
      .filter(p => p.name.trim() && p.description.trim())
      .map(p => ({
        name: p.name.trim(),
        description: p.description.trim(),
        technologies: p.technologies.split(',').map(t => t.trim()).filter(Boolean),
        role: p.role.trim() || undefined,
        link: p.link.trim() || undefined,
        startDate: p.startDate.trim() || undefined,
        endDate: p.endDate.trim() || undefined,
      }));

    if (cleanProjects.length === 0) {
      setError('Add at least one project (name + description).');
      return;
    }

    const payload = {
      firstName: candidate.firstName.trim(),
      lastName: candidate.lastName.trim(),
      email: candidate.email.trim(),
      phone: candidate.phone.trim() || undefined,
      location: candidate.location.trim() || undefined,
      headline: candidate.headline.trim(),
      bio: candidate.bio.trim() || undefined,
      skills: cleanSkills,
      languages: candidate.languages
        .filter(l => l.name.trim())
        .map(l => ({ name: l.name.trim(), proficiency: l.proficiency })),
      experience: candidate.experience
        .filter(e => e.company.trim() && e.role.trim())
        .map(e => ({
          company: e.company.trim(),
          role: e.role.trim(),
          startDate: e.startDate.trim(),
          endDate: e.isCurrent ? null : (e.endDate.trim() || null),
          isCurrent: e.isCurrent,
          description: e.description.trim(),
          technologies: e.technologies.split(',').map(t => t.trim()).filter(Boolean),
        })),
      education: candidate.education
        .filter(ed => ed.institution.trim() && ed.degree.trim())
        .map(ed => ({
          institution: ed.institution.trim(),
          degree: ed.degree.trim(),
          fieldOfStudy: ed.fieldOfStudy.trim() || undefined,
          startYear: ed.startYear ? Number(ed.startYear) : undefined,
          endYear: ed.endYear ? Number(ed.endYear) : undefined,
        })),
      certifications: candidate.certifications
        .filter(c => c.name.trim() && c.issuer.trim())
        .map(c => ({
          name: c.name.trim(),
          issuer: c.issuer.trim(),
          issueDate: c.issueDate.trim() || undefined,
        })),
      projects: cleanProjects,
      availability: {
        status: candidate.availability.status,
        type: candidate.availability.type,
        startDate: candidate.availability.startDate.trim() || undefined,
      },
      socialLinks: {
        linkedin: candidate.socialLinks.linkedin.trim() || undefined,
        github: candidate.socialLinks.github.trim() || undefined,
        portfolio: candidate.socialLinks.portfolio.trim() || undefined,
      },
      source: 'manual',
    };

    setSaving(true);
    try {
      const res = await addCandidates({ jobId, organizationId: orgId, candidate: payload });
      setSuccess(res.data.message || 'Candidate added.');
      setCandidate(emptyCandidate());
      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      console.error('addCandidates failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to add candidate.');
    } finally {
      setSaving(false);
    }
  };

  // ----- PDF intake -----
  const pickPDFs = (fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const rejected = Array.from(fileList).length - picked.length;
    if (rejected > 0) setError(rejected + ' file(s) were skipped - only PDFs are accepted.');
    const keyed = new Map<string, File>();
    [...pdfFiles, ...picked].forEach(f => keyed.set(f.name + '__' + f.size, f));
    setPdfFiles(Array.from(keyed.values()).slice(0, 25));
  };

  const removePDF = (index: number) => setPdfFiles(pdfFiles.filter((_, i) => i !== index));

  const handleUploadPDFs = async () => {
    setError('');
    setSuccess('');
    setUploadResults([]);
    if (pdfFiles.length === 0) { setError('Drop at least one resume PDF first.'); return; }
    const formData = new FormData();
    pdfFiles.forEach(f => formData.append('files', f));
    formData.append('jobId', jobId);
    formData.append('organizationId', orgId);
    setUploading(true);
    try {
      const res = await uploadMultiplePDFs(formData);
      setSuccess(res.data.message || 'Processed ' + pdfFiles.length + ' resume(s).');
      setUploadResults(res.data.results || []);
      setPdfFiles([]);
      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to process resumes.');
      if (err?.response?.data?.results) setUploadResults(err.response.data.results);
    } finally {
      setUploading(false);
    }
  };

  // ----- CSV intake -----
  const pickCSV = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv) { setError('Please pick a .csv file.'); return; }
    setError('');
    setCsvFile(file);
  };

  const handleUploadCSV = async () => {
    setError('');
    setSuccess('');
    if (!csvFile) { setError('Pick a CSV file first.'); return; }
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('jobId', jobId);
    formData.append('organizationId', orgId);
    setCsvUploading(true);
    try {
      const res = await uploadCSV(formData);
      const count = res.data.candidates?.length || 0;
      setSuccess(res.data.message || count + ' candidate(s) imported from CSV.');
      setCsvFile(null);
      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to import CSV.');
    } finally {
      setCsvUploading(false);
    }
  };

  // ----- JSON intake -----
  const pickJSON = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
    if (!isJson) { setError('Please pick a .json file.'); return; }
    setError('');
    setJsonFile(file);
  };

  const handleUploadJSON = async () => {
    setError('');
    setSuccess('');
    if (!jsonFile) { setError('Pick a JSON file first.'); return; }
    const formData = new FormData();
    formData.append('file', jsonFile);
    formData.append('jobId', jobId);
    formData.append('organizationId', orgId);
    setJsonUploading(true);
    try {
      const res = await uploadJSON(formData);
      const count = res.data.candidates?.length || 0;
      setSuccess(res.data.message || count + ' profile(s) imported.');
      setJsonFile(null);
      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to import JSON profile(s).');
    } finally {
      setJsonUploading(false);
    }
  };

  const goToScreening = () => {
    router.push('/screen?jobId=' + jobId + '&orgId=' + orgId);
  };

  if (!jobId || !orgId) {
    return (
      <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '32px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="card-white" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={28} color="var(--danger)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Missing job context</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
            Open this page from a specific job - the URL needs <code>?jobId=...&amp;orgId=...</code>.
          </p>
          <Link href="/jobs/new"><button className="btn-primary">Post a new job</button></Link>
        </div>
      </main>
    );
  }

  const labelStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' };
  const sectionStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '14px', background: '#fff' };
  const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '32px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: 'var(--ink)' }}>Add Candidates</h1>
        <p style={{ color: 'var(--muted)' }}>
          {job ? (<>For role: <strong style={{ color: 'var(--ink)' }}>{job.title}</strong>{job.department ? ' / ' + job.department : ''}</>) : (<>Job ID: {jobId}</>)}
        </p>
      </div>

      <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        jobId: {jobId.slice(-6)} / orgId: {orgId.slice(-6)} / already added: {existing.length}
      </div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(184,52,31,0.25)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: '500', margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div style={{ background: 'var(--success-soft)', border: '1px solid rgba(47,143,93,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="var(--success)" />
          <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '500', margin: 0 }}>{success}</p>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setMode('resumes')} className={mode === 'resumes' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={16} /> PDF resumes
        </button>
        <button type="button" onClick={() => setMode('json')} className={mode === 'json' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCode size={16} /> Umurava JSON
        </button>
        <button type="button" onClick={() => setMode('csv')} className={mode === 'csv' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={16} /> CSV
        </button>
        <button type="button" onClick={() => setMode('manual')} className={mode === 'manual' ? 'btn-primary' : 'btn-secondary'} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} /> Manual
        </button>
      </div>

      {mode === 'resumes' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>Bulk resume ingest</h2>
            <span className="pill pill-gold" style={{ fontSize: '11px' }}><Sparkles size={11} /> AI auto-extracts</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '16px', lineHeight: 1.55 }}>
            Drop up to 25 resume PDFs at once. Gemini reads each one and extracts a full Umurava-shaped
            profile - basics, skills with levels, languages, work experience, education, certifications,
            projects, and availability.
          </p>

          <label
            ref={dropRef}
            htmlFor="pdf-files"
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)'; }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; pickPDFs(e.dataTransfer.files); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: '14px', padding: '40px 24px', cursor: 'pointer', background: 'var(--surface-soft)', marginBottom: '16px', transition: 'all 0.15s ease' }}
          >
            <FileUp size={34} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: '4px', fontSize: '15.5px' }}>Drop resumes here or click to browse</p>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>PDF only / up to 25 files / 15MB each</p>
            <input id="pdf-files" type="file" accept=".pdf,application/pdf" multiple onChange={e => pickPDFs(e.target.files)} style={{ display: 'none' }} />
          </label>

          {pdfFiles.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pdfFiles.length} file{pdfFiles.length === 1 ? '' : 's'} ready
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                {pdfFiles.map((f, i) => (
                  <div key={f.name + '-' + i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}>
                    <FileText size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: 'var(--muted-2)', fontSize: '11.5px', flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => removePDF(i)} aria-label={'Remove ' + f.name} className="icon-btn" style={{ padding: '4px' }}><X size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="button" className="btn-primary" onClick={handleUploadPDFs} disabled={uploading || pdfFiles.length === 0} style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {uploading ? (<><Loader2 size={16} className="spin" /> AI is reading {pdfFiles.length} resume{pdfFiles.length === 1 ? '' : 's'}...</>) : (<><Sparkles size={16} /> Extract & import {pdfFiles.length || ''} resume{pdfFiles.length === 1 ? '' : 's'}</>)}
          </button>

          {uploadResults.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extraction report</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uploadResults.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: r.status === 'parsed' ? 'var(--success-soft)' : 'var(--danger-soft)', border: '1px solid ' + (r.status === 'parsed' ? 'rgba(47,143,93,0.25)' : 'rgba(184,52,31,0.25)'), borderRadius: '10px', fontSize: '13px' }}>
                    {r.status === 'parsed' ? <FileCheck2 size={15} color="var(--success)" style={{ flexShrink: 0 }} /> : <FileWarning size={15} color="var(--danger)" style={{ flexShrink: 0 }} />}
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{r.filename}</span>
                    <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.status === 'parsed'
                        ? ((r.candidate?.firstName || '') + ' ' + (r.candidate?.lastName || '') + ' / ' + (r.candidate?.headline || 'No headline') + ' / ' + (r.candidate?.skills?.length || 0) + ' skills')
                        : r.reason || 'Failed to parse'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'json' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>Umurava JSON profiles</h2>
            <span className="pill pill-indigo" style={{ fontSize: '11px' }}><FileCode size={11} /> Native shape</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '16px', lineHeight: 1.55 }}>
            The canonical intake. Drop a single .json file containing one Umurava Talent Profile object,
            or an array of them. Required fields: firstName, lastName, email, headline. Each profile must
            include at least one skill and one project per spec.
          </p>

          <label
            htmlFor="json-file"
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)'; }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; pickJSON(e.dataTransfer.files); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: '14px', padding: '40px 24px', cursor: 'pointer', background: 'var(--surface-soft)', marginBottom: '16px', transition: 'all 0.15s ease' }}
          >
            <FileCode size={34} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: '4px', fontSize: '15.5px' }}>Drop JSON profile(s) here or click to browse</p>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>.json only / one file / single profile or array</p>
            <input id="json-file" type="file" accept=".json,application/json" onChange={e => pickJSON(e.target.files)} style={{ display: 'none' }} />
          </label>

          {jsonFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
              <FileCode size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{jsonFile.name}</span>
              <span style={{ color: 'var(--muted-2)', fontSize: '11.5px', flexShrink: 0 }}>{(jsonFile.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => setJsonFile(null)} aria-label={'Remove ' + jsonFile.name} className="icon-btn" style={{ padding: '4px' }}><X size={13} /></button>
            </div>
          )}

          <button type="button" className="btn-primary" onClick={handleUploadJSON} disabled={jsonUploading || !jsonFile} style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {jsonUploading ? (<><Loader2 size={16} className="spin" /> Importing JSON...</>) : (<><FileCode size={16} /> Import profile(s)</>)}
          </button>
        </div>
      )}

      {mode === 'csv' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>Quick CSV import</h2>
            <span className="pill pill-indigo" style={{ fontSize: '11px' }}><FileSpreadsheet size={11} /> Basic info only</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '16px', lineHeight: 1.55 }}>
            Drop a single .csv with one candidate per row. Use this for fast bulk-add of basic info -
            for richer profiles, use JSON upload or PDF resumes. Header row required (case-insensitive):
          </p>

          <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink)', overflowX: 'auto' }}>
            firstName, lastName, email, headline, phone, location, bio, skills, linkedin, github, portfolio
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '12.5px', marginBottom: '16px', lineHeight: 1.5 }}>
            Required: <strong style={{ color: 'var(--ink)' }}>firstName</strong>, <strong style={{ color: 'var(--ink)' }}>lastName</strong>, <strong style={{ color: 'var(--ink)' }}>email</strong>.
            Skills go in one cell separated by <code>;</code>, e.g. <code>Python;SQL;Airflow</code> - they default to Intermediate level.
            Rows missing required fields are skipped.
          </p>

          <label
            htmlFor="csv-file"
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)'; }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; pickCSV(e.dataTransfer.files); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: '14px', padding: '40px 24px', cursor: 'pointer', background: 'var(--surface-soft)', marginBottom: '16px', transition: 'all 0.15s ease' }}
          >
            <FileSpreadsheet size={34} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: '4px', fontSize: '15.5px' }}>Drop a CSV here or click to browse</p>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>.csv only / one file</p>
            <input id="csv-file" type="file" accept=".csv,text/csv" onChange={e => pickCSV(e.target.files)} style={{ display: 'none' }} />
          </label>

          {csvFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
              <FileSpreadsheet size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{csvFile.name}</span>
              <span style={{ color: 'var(--muted-2)', fontSize: '11.5px', flexShrink: 0 }}>{(csvFile.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => setCsvFile(null)} aria-label={'Remove ' + csvFile.name} className="icon-btn" style={{ padding: '4px' }}><X size={13} /></button>
            </div>
          )}

          <button type="button" className="btn-primary" onClick={handleUploadCSV} disabled={csvUploading || !csvFile} style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {csvUploading ? (<><Loader2 size={16} className="spin" /> Importing CSV...</>) : (<><FileSpreadsheet size={16} /> Import candidates from CSV</>)}
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontWeight: '700', fontSize: '17px' }}>Manual entry - Umurava Talent Profile</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
              Build a single full profile. Required: name, email, headline, at least one skill, at least one project.
            </p>
          </div>

          {/* Basic info */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><Users size={14} /> Basic info</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>First name *</label>
                <input className="input" value={candidate.firstName} onChange={e => updateBasic('firstName', e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <label style={labelStyle}>Last name *</label>
                <input className="input" value={candidate.lastName} onChange={e => updateBasic('lastName', e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input className="input" value={candidate.email} onChange={e => updateBasic('email', e.target.value)} placeholder="jane@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input className="input" value={candidate.phone} onChange={e => updateBasic('phone', e.target.value)} placeholder="+250 ..." />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Location</label>
                <input className="input" value={candidate.location} onChange={e => updateBasic('location', e.target.value)} placeholder="Kigali, Rwanda" />
              </div>
              <div>
                <label style={labelStyle}>Headline *</label>
                <input className="input" value={candidate.headline} onChange={e => updateBasic('headline', e.target.value)} placeholder="Full-stack engineer focused on fintech" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea className="input" rows={3} value={candidate.bio} onChange={e => updateBasic('bio', e.target.value)} placeholder="2-3 sentence professional summary in the candidate's voice..." />
            </div>
          </div>

          {/* Skills */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><Sparkles size={14} /> Skills *</p>
            {candidate.skills.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                <input className="input" value={s.name} onChange={e => updateListItem('skills', i, 'name', e.target.value)} placeholder="e.g. Python" />
                <select className="input" value={s.level} onChange={e => updateListItem('skills', i, 'level', e.target.value as SkillLevel)}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                </select>
                <input className="input" type="number" min="0" value={s.yearsOfExperience} onChange={e => updateListItem('skills', i, 'yearsOfExperience', e.target.value)} placeholder="Years" />
                <button type="button" onClick={() => removeListItem('skills', i)} className="icon-btn" aria-label="Remove skill" style={{ padding: '0 8px' }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('skills')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Plus size={13} /> Add skill
            </button>
          </div>

          {/* Languages */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><LanguagesIcon size={14} /> Languages</p>
            {candidate.languages.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>None added.</p>}
            {candidate.languages.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                <input className="input" value={l.name} onChange={e => updateListItem('languages', i, 'name', e.target.value)} placeholder="e.g. Kinyarwanda" />
                <select className="input" value={l.proficiency} onChange={e => updateListItem('languages', i, 'proficiency', e.target.value as LanguageProficiency)}>
                  <option>Basic</option><option>Conversational</option><option>Fluent</option><option>Native</option>
                </select>
                <button type="button" onClick={() => removeListItem('languages', i)} className="icon-btn" aria-label="Remove language" style={{ padding: '0 8px' }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('languages')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Plus size={13} /> Add language
            </button>
          </div>

          {/* Experience */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><Briefcase size={14} /> Work experience</p>
            {candidate.experience.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>None added.</p>}
            {candidate.experience.map((e, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px', background: 'var(--surface-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Role {i + 1}</span>
                  <button type="button" onClick={() => removeListItem('experience', i)} className="icon-btn" aria-label="Remove experience" style={{ padding: '0 6px' }}><X size={13} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input className="input" value={e.role} onChange={ev => updateListItem('experience', i, 'role', ev.target.value)} placeholder="Role / title" />
                  <input className="input" value={e.company} onChange={ev => updateListItem('experience', i, 'company', ev.target.value)} placeholder="Company" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input className="input" value={e.startDate} onChange={ev => updateListItem('experience', i, 'startDate', ev.target.value)} placeholder="Start (YYYY-MM)" />
                  <input className="input" value={e.endDate} onChange={ev => updateListItem('experience', i, 'endDate', ev.target.value)} placeholder="End (YYYY-MM)" disabled={e.isCurrent} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                    <input type="checkbox" checked={e.isCurrent} onChange={ev => updateListItem('experience', i, 'isCurrent', ev.target.checked)} />
                    Current
                  </label>
                </div>
                <input className="input" value={e.technologies} onChange={ev => updateListItem('experience', i, 'technologies', ev.target.value)} placeholder="Technologies (comma-separated)" style={{ marginBottom: '8px' }} />
                <textarea className="input" rows={2} value={e.description} onChange={ev => updateListItem('experience', i, 'description', ev.target.value)} placeholder="What you did and what you shipped..." />
              </div>
            ))}
            <button type="button" onClick={() => addListItem('experience')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Plus size={13} /> Add work experience
            </button>
          </div>

          {/* Education */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><GraduationCap size={14} /> Education</p>
            {candidate.education.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>None added.</p>}
            {candidate.education.map((ed, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px', background: 'var(--surface-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Education {i + 1}</span>
                  <button type="button" onClick={() => removeListItem('education', i)} className="icon-btn" aria-label="Remove education" style={{ padding: '0 6px' }}><X size={13} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input className="input" value={ed.degree} onChange={ev => updateListItem('education', i, 'degree', ev.target.value)} placeholder="Degree (BSc, MSc...)" />
                  <input className="input" value={ed.fieldOfStudy} onChange={ev => updateListItem('education', i, 'fieldOfStudy', ev.target.value)} placeholder="Field of study" />
                </div>
                <input className="input" value={ed.institution} onChange={ev => updateListItem('education', i, 'institution', ev.target.value)} placeholder="Institution" style={{ marginBottom: '8px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input className="input" type="number" value={ed.startYear} onChange={ev => updateListItem('education', i, 'startYear', ev.target.value)} placeholder="Start year" />
                  <input className="input" type="number" value={ed.endYear} onChange={ev => updateListItem('education', i, 'endYear', ev.target.value)} placeholder="End year" />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('education')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Plus size={13} /> Add education
            </button>
          </div>

          {/* Certifications */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><Award size={14} /> Certifications</p>
            {candidate.certifications.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>None added.</p>}
            {candidate.certifications.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                <input className="input" value={c.name} onChange={e => updateListItem('certifications', i, 'name', e.target.value)} placeholder="Certification name" />
                <input className="input" value={c.issuer} onChange={e => updateListItem('certifications', i, 'issuer', e.target.value)} placeholder="Issuer" />
                <input className="input" value={c.issueDate} onChange={e => updateListItem('certifications', i, 'issueDate', e.target.value)} placeholder="YYYY-MM" />
                <button type="button" onClick={() => removeListItem('certifications', i)} className="icon-btn" aria-label="Remove certification" style={{ padding: '0 8px' }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('certifications')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Plus size={13} /> Add certification
            </button>
          </div>

          {/* Projects */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><FolderGit2 size={14} /> Projects *</p>
            {candidate.projects.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px', background: 'var(--surface-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Project {i + 1}</span>
                  <button type="button" onClick={() => removeListItem('projects', i)} className="icon-btn" aria-label="Remove project" style={{ padding: '0 6px' }}><X size={13} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input className="input" value={p.name} onChange={e => updateListItem('projects', i, 'name', e.target.value)} placeholder="Project name" />
                  <input className="input" value={p.role} onChange={e => updateListItem('projects', i, 'role', e.target.value)} placeholder="Your role (e.g. Lead developer)" />
                </div>
                <textarea className="input" rows={2} value={p.description} onChange={e => updateListItem('projects', i, 'description', e.target.value)} placeholder="What it does and what you shipped..." style={{ marginBottom: '8px' }} />
                <input className="input" value={p.technologies} onChange={e => updateListItem('projects', i, 'technologies', e.target.value)} placeholder="Technologies (comma-separated)" style={{ marginBottom: '8px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input className="input" value={p.link} onChange={e => updateListItem('projects', i, 'link', e.target.value)} placeholder="Link" />
                  <input className="input" value={p.startDate} onChange={e => updateListItem('projects', i, 'startDate', e.target.value)} placeholder="Start (YYYY-MM)" />
                  <input className="input" value={p.endDate} onChange={e => updateListItem('projects', i, 'endDate', e.target.value)} placeholder="End (YYYY-MM)" />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('projects')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Plus size={13} /> Add project
            </button>
          </div>

          {/* Availability */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><CheckCircle2 size={14} /> Availability</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <select className="input" value={candidate.availability.status} onChange={e => updateAvailability('status', e.target.value)}>
                <option>Available</option>
                <option>Open to Opportunities</option>
                <option>Not Available</option>
              </select>
              <select className="input" value={candidate.availability.type} onChange={e => updateAvailability('type', e.target.value)}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
              <input className="input" value={candidate.availability.startDate} onChange={e => updateAvailability('startDate', e.target.value)} placeholder="Available from (YYYY-MM)" />
            </div>
          </div>

          {/* Social */}
          <div style={sectionStyle}>
            <p style={sectionTitle}><Globe size={14} /> Links</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <input className="input" value={candidate.socialLinks.linkedin} onChange={e => updateSocial('linkedin', e.target.value)} placeholder="LinkedIn" />
              <input className="input" value={candidate.socialLinks.github} onChange={e => updateSocial('github', e.target.value)} placeholder="GitHub" />
              <input className="input" value={candidate.socialLinks.portfolio} onChange={e => updateSocial('portfolio', e.target.value)} placeholder="Portfolio" />
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={handleSaveManual} disabled={saving} style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '8px' }}>
            {saving ? 'Saving candidate...' : 'Save candidate'}
          </button>
        </div>
      )}

      {/* Existing candidates */}
      <div className="card-white" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontWeight: '700' }}>Candidates added to this job ({existing.length})</h2>
        </div>

        {existing.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No candidates yet. Add at least one before running AI screening.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {existing.map(c => {
              const fullName = (c.firstName || c.fullName || '') + (c.lastName ? ' ' + c.lastName : '');
              const skillNames = Array.isArray(c.skills) ? c.skills.map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean) : [];
              return (
                <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <div>
                    <p style={{ fontWeight: '600', margin: 0 }}>{fullName.trim() || c.email}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
                      {c.headline ? c.headline + ' / ' : ''}
                      {c.email}
                      {c.location ? ' / ' + c.location : ''}
                      {skillNames.length ? ' / ' + skillNames.slice(0, 4).join(', ') + (skillNames.length > 4 ? '...' : '') : ''}
                    </p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>{c.source}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button type="button" className="btn-primary" onClick={goToScreening} disabled={existing.length === 0} style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <Sparkles size={18} /> Continue to AI screening
      </button>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

export default function CandidatesPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--muted)' }}>Loading...</div>}>
      <CandidatesPage />
    </Suspense>
  );
}
