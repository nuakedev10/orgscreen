import { IOrganization } from '../models/Organization';
import { IJob } from '../models/Job';
import { ICandidate } from '../models/Candidate';

// Builds the organization context block injected into every prompt
export const buildOrgContext = (org: IOrganization): string => {
  const weights = org.hiringPriorities;

  return `
=== ORGANIZATION PROFILE ===
Name: ${org.name}
Industry: ${org.industry}

Core Values & Culture:
${org.cultureValues.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Hiring Priorities (Scoring Weights):
- Technical Skills: ${weights.skills}%
- Work Experience: ${weights.experience}%
- Education: ${weights.education}%
- Culture Fit: ${weights.cultureFit}%

Ideal Candidate Personas:
${org.idealCandidatePersonas.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${org.pastJobDescriptions.length > 0 ? `
Historical Context (Past Roles They Have Hired For):
${org.pastJobDescriptions.slice(0, 3).join('\n---\n')}
` : ''}

${org.knowledgeBase ? `
Additional Organizational Knowledge:
${org.knowledgeBase}
` : ''}
=== END ORGANIZATION PROFILE ===
`.trim();
};

// Builds the job context block
export const buildJobContext = (job: IJob): string => {
  return `
=== JOB REQUIREMENTS ===
Role: ${job.title}
Department: ${job.department}
Experience Level: ${job.experienceLevel}
Education Required: ${job.educationRequirement}

Required Skills:
${job.requiredSkills.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Nice-to-Have Skills:
${job.niceToHaveSkills.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Key Responsibilities:
${job.responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${job.additionalNotes ? `Additional Notes: ${job.additionalNotes}` : ''}
=== END JOB REQUIREMENTS ===
`.trim();
};

export const formatCandidate = (candidate: ICandidate, index: number): string => {
  const skills = (candidate.skills || []).length
    ? candidate.skills.join(', ')
    : 'Not specified';

  const workHistory = (candidate.workHistory || []).length
    ? candidate.workHistory
        .map(e => `  - ${e.role} at ${e.company} (${e.duration}): ${e.description}`)
        .join('\n')
    : '  Not provided';

  const edu = candidate.education;
  const education = (edu?.degree || edu?.institution)
    ? `  - ${edu.degree}${edu.field ? ' in ' + edu.field : ''}, ${edu.institution}`
    : '  Not provided';

  return `
CANDIDATE ${index + 1}:
ID: ${candidate._id}
Name: ${candidate.fullName}
Email: ${candidate.email}
Location: ${candidate.location || 'Not specified'}
Years of Experience: ${candidate.yearsOfExperience ?? 'Not specified'}
Skills: ${skills}
Work History:
${workHistory}
Education:
${education}
${candidate.resumeText ? 'Resume Excerpt: ' + candidate.resumeText.substring(0, 600) + '...' : ''}
`.trim();
};

// Builds the full master screening prompt
export const buildScreeningPrompt = (
  org: IOrganization,
  job: IJob,
  candidates: ICandidate[],
  shortlistSize: number
): string => {
  const orgContext = buildOrgContext(org);
  const jobContext = buildJobContext(job);
  const candidateList = candidates
    .map((c, i) => formatCandidate(c, i))
    .join('\n\n---\n\n');

  return `
You are an expert AI talent screener working exclusively for ${org.name}.
You deeply understand this organization's culture, values, and hiring standards.
Your job is to screen candidates and return a shortlist of the top ${shortlistSize} best fits.

${orgContext}

${jobContext}

=== CANDIDATES TO SCREEN ===
${candidateList}
=== END CANDIDATES ===

=== SCREENING INSTRUCTIONS ===
1. Evaluate every candidate against the job requirements and the organization's profile above.
2. Score each candidate from 0 to 100 across four dimensions using the organization's weights:
   - Skills Match (${org.hiringPriorities.skills}% weight)
   - Experience Depth (${org.hiringPriorities.experience}% weight)
   - Education Fit (${org.hiringPriorities.education}% weight)
   - Culture Alignment (${org.hiringPriorities.cultureFit}% weight)
3. Calculate a weighted overall score for each candidate.
4. Return only the top ${shortlistSize} candidates ranked by overall score.
5. For each shortlisted candidate, provide clear recruiter-friendly reasoning.
6. Flag any candidate who may have been disadvantaged by non-linear career paths,
   career gaps, or geography. These are common in African talent pools and should
   not be penalized unfairly.
7. Use the candidate's projects, certifications, and detailed skill levels as
   first-class evidence. A strong portfolio of relevant projects can outweigh a
   shorter formal work history.

=== RESPONSE FORMAT ===
You MUST respond with valid JSON only. No extra text, no markdown, no explanation outside the JSON.

{
  "shortlist": [
    {
      "candidateId": "the candidate ID from above",
      "fullName": "candidate full name",
      "rank": 1,
      "overallScore": 87,
      "dimensionScores": {
        "skills": 90,
        "experience": 85,
        "education": 80,
        "cultureFit": 88
      },
      "strengths": [
        "Strong Python and data engineering background",
        "Led cross-functional teams in similar industry"
      ],
      "gaps": [
        "No direct experience with fintech regulations"
      ],
      "biasFlags": [
        "Career gap of 8 months likely due to relocation - should not be penalized"
      ],
      "recommendation": "Strong Hire",
      "reasoning": "Concise recruiter-facing rationale tied to the organisation's mission, the job requirements, and concrete evidence from the candidate's experience, projects, and skill levels."
    }
  ],
  "totalCandidatesScreened": ${candidates.length},
  "shortlistSize": ${shortlistSize},
  "screeningNotes": "Any overall observations about the candidate pool"
}
`.trim();
};
