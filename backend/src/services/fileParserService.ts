import fs from 'fs';
import pdfParse from 'pdf-parse';
import { ICandidate } from '../models/Candidate';

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

// CSV columns: fullName, email, phone, location, skills (semicolon-separated),
// yearsOfExperience, degree, field, institution
export const parseCSV = (filePath: string): Partial<ICandidate>[] => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV file is empty or has no data rows');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const candidates: Partial<ICandidate>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => { row[header] = values[index] || ''; });

      const fullName = row['fullname'] || row['full name'] || row['name'] || '';
      const email = row['email'] || '';
      if (!fullName || !email) continue;

      const skillsRaw = row['skills']
        ? row['skills'].split(';').map(s => s.trim()).filter(Boolean)
        : [];

      candidates.push({
        fullName,
        email,
        phone: row['phone'] || '',
        location: row['location'] || row['city'] || '',
        skills: skillsRaw,
        yearsOfExperience: Number(row['yearsofexperience'] || row['years'] || 0) || 0,
        education: {
          degree: row['degree'] || '',
          field: row['field'] || '',
          institution: row['institution'] || row['school'] || '',
        },
        workHistory: [],
        source: 'upload',
      });
    }

    return candidates;
  } catch (error) {
    console.error('CSV parse error:', error);
    throw new Error('Failed to parse CSV file');
  }
};

export const cleanupFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('File cleanup error:', error);
  }
};
