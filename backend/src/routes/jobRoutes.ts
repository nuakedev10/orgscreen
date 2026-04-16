import { Router } from 'express';
import {
  createJob,
  getJobs,
  getJob,
  updateJob
} from '../controllers/jobController';

const router = Router();

router.post('/', createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.put('/:id', updateJob);

export default router;