import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import {
  getMyLifestyleProfile,
  updateMyLifestyleProfile,
  getMyRoommatePreferences,
  updateMyRoommatePreferences,
  deleteMyRoommatePreferences,
} from '../controllers/lifestyleController';
import { softFilter } from '../controllers/softFilterController';

const router = Router();

// NOTE: this router is mounted at "/api", so a global router.use(requireAuth)
// would also gate every other /api/* route registered afterwards. Apply
// requireAuth per route instead.

// Lifestyle profile
router.get('/lifestyle-profile',    requireAuth, getMyLifestyleProfile);
router.put('/lifestyle-profile',    requireAuth, updateMyLifestyleProfile);

// Roommate preferences
router.get('/roommate-preferences', requireAuth, getMyRoommatePreferences);
router.put('/roommate-preferences', requireAuth, updateMyRoommatePreferences);
router.delete('/roommate-preferences', requireAuth, deleteMyRoommatePreferences);

// Soft filter (works for logged-in users and anonymous visitors who pass
// inline preferences; HAS_ROOM inside the controller still requires auth).
router.post('/soft-filter', softFilter);

export default router;
