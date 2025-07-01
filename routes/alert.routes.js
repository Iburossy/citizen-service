const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const uploadController = require('../controllers/upload.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Routes pour la gestion des alertes
 */

// Webhook pour les mises à jour de statut (appelé par les services)
// Cette route doit être définie AVANT le middleware d'authentification pour être accessible sans token JWT
router.post('/webhook/status', alertController.updateAlertStatus);

// Webhook pour les commentaires (appelé par les services)
router.post('/webhook/comments', alertController.receiveExternalComment);

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware.verifyToken);

// Routes pour les alertes
router.post('/', alertController.createAlert);
router.get('/me', alertController.getMyAlerts);
router.get('/nearby', alertController.getAlertsNearby);
router.get('/:id', alertController.getAlertById);
router.post('/:id/comments', alertController.addComment);

// Routes pour les uploads
router.post('/upload', uploadController.uploadSingleFile);
router.post('/uploads', uploadController.uploadMultipleFiles);
router.delete('/upload', uploadController.deleteFile);

module.exports = router;
