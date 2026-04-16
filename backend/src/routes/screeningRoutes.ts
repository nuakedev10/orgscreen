import { Router } from 'express';
import {
  triggerScreening,
  getScreeningResults,
  rerankCandidates
} from '../controllers/screeningController';

const router = Router();

router.post('/trigger', triggerScreening);
router.get('/results/:jobId', getScreeningResults);
router.post('/rerank', rerankCandidates);

export default router;