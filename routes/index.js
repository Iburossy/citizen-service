const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const serviceRoutes = require('./service.routes');
const alertRoutes = require('./alert.routes');

// Route de santé (health check)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login-anonymous', authController.loginAnonymous);
router.post('/verify-token', authController.verifyToken);
router.post('/verify-account', authController.verifyAccount);
router.post('/resend-verification-codes', authController.resendVerificationCodes);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Routes protégées
router.use(authMiddleware.verifyToken);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/logout', authController.logout);

// Aucune route admin ou superadmin - Service recentré sur les citoyens uniquement

// Routes pour les services disponibles
router.use('/services', serviceRoutes);

// Routes pour les alertes
router.use('/alerts', alertRoutes);

module.exports = router;
