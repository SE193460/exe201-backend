import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import {
  getMyLifestyleProfile,
  updateMyLifestyleProfile,
  getMyRoommatePreferences,
  updateMyRoommatePreferences,
} from '../controllers/lifestyleController';
import { softFilter } from '../controllers/softFilterController';

const router = Router();

router.use(requireAuth);

// Lifestyle profile
router.get('/lifestyle-profile',    getMyLifestyleProfile);
router.put('/lifestyle-profile',    updateMyLifestyleProfile);

// Roommate preferences
router.get('/roommate-preferences', getMyRoommatePreferences);
router.put('/roommate-preferences', updateMyRoommatePreferences);

// Soft filter
router.post('/soft-filter', softFilter);

export default router;
