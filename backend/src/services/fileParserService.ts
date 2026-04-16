import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { ICandidate } from '../models/Candidate';
import mongoose from 'mongoose';

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