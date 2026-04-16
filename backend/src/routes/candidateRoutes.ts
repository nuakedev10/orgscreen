import { Router } from 'express';
import {
  addCandidates,
  uploadCSVCandidates,
  uploadPDFCandidate,
  getCandidates
} from '../controllers/candidateController';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', addCandidates);
router.post('/upload/csv', upload.single('file'), uploadCSVCandidates);
router.post('/upload/pdf', upload.single('file'), uploadPDFCandidate);
router.get('/', getCandidates);

export default router;