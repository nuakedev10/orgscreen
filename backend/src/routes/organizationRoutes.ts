import { Router } from 'express';
import {
  createOrganization,
  getOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization
} from '../controllers/organizationController';

const router = Router();

router.post('/', createOrganization);
router.get('/', getOrganizations);
router.get('/:id', getOrganization);
router.put('/:id', updateOrganization);
router.delete('/:id', deleteOrganization);

export default router;