const express = require('express');
const router = express.Router();
const availableServiceController = require('../controllers/available-service.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Routes pour la gestion des services disponibles
 */

// Routes publiques
router.get('/', availableServiceController.getAllServices);
router.get('/:id', availableServiceController.getServiceById);
router.get('/:id/categories', availableServiceController.getServiceCategories);
router.get('/:id/availability', availableServiceController.checkServiceAvailability);

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware.verifyToken);

// Route d'initialisation (uniquement en développement)
if (process.env.NODE_ENV === 'development') {
  router.post('/initialize', availableServiceController.initializeServices);
}

module.exports = router;
