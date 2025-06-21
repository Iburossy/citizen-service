const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');

/**
 * Routes externes pour l'accès par d'autres services
 * Ces routes sont sécurisées par une clé API
 */

// Middleware pour vérifier la clé API des services
const verifyServiceApiKey = (req, res, next) => {
  const serviceApiKey = req.headers['x-service-key'];
  if (!serviceApiKey || serviceApiKey !== process.env.SERVICE_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
  }
  next();
};

// Appliquer le middleware de vérification de clé API à toutes les routes
router.use(verifyServiceApiKey);

// Route pour récupérer toutes les alertes d'hygiène (pour le service d'hygiène)
router.get('/alerts/hygiene', alertController.getHygieneAlertsForService);

module.exports = router;
