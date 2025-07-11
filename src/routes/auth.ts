import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.post('/change-password', AuthController.changePassword);
router.post('/logout', AuthController.logout);
router.delete('/account', AuthController.deleteAccount);

export default router;