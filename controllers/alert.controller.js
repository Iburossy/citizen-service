const alertService = require('../services/alert.service');
const uploadService = require('../services/upload.service');

/**
 * Contrôleur pour la gestion des alertes
 */
class AlertController {
  /**
   * Crée une nouvelle alerte
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async createAlert(req, res) {
    console.log('[AlertController] createAlert called');
    console.log('[AlertController] Request body:', JSON.stringify(req.body));
    console.log('[AlertController] Request files:', req.files);
    console.log('[AlertController] Request headers:', req.headers);
    
    try {
      // Extraction des données avec description optionnelle
      const { serviceId, category, coordinates, address, isAnonymous } = req.body;
      const description = req.body.description || "";
      console.log('[AlertController] Extracted data:', { serviceId, category, description, coordinates, address, isAnonymous });
      
      // Vérifier que les coordonnées sont fournies (obligatoires)
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        console.log('[AlertController] Invalid coordinates:', coordinates);
        return res.status(400).json({
          success: false,
          message: 'Les coordonnées de localisation sont requises (format: [longitude, latitude])'
        });
      }
      
      // Accepter les preuves soit depuis les fichiers uploadés, soit depuis le JSON
      console.log('[AlertController] Processing proofs');
      let proofs = [];
      
      // Si des fichiers sont présents, on les traite
      if (req.files && req.files.length > 0) {
        console.log('[AlertController] Processing', req.files.length, 'uploaded files');
        for (const file of req.files) {
          const processedFile = await uploadService.processFile(file);
          proofs.push(processedFile);
        }
      }
      // Si des preuves sont fournies dans le JSON, on les utilise directement
      else if (req.body.proofs && Array.isArray(req.body.proofs) && req.body.proofs.length > 0) {
        console.log('[AlertController] Using proofs from JSON:', req.body.proofs);
        proofs = req.body.proofs;
      }
      // Si aucune preuve n'est fournie, on accepte quand même pour le débogage
      else {
        console.log('[AlertController] No proofs provided, continuing for debugging');
      }
      
      // Créer l'alerte
      const citizenId = req.user ? req.user.sub : null;
      
      const alertData = {
        serviceId,
        category,
        description, // maintenant optionnel, peut être une chaîne vide
        coordinates,
        address,
        isAnonymous: isAnonymous === 'true' || isAnonymous === true,
        proofs
      };
      
      const alert = await alertService.createAlert(alertData, citizenId);
      
      res.status(201).json({
        success: true,
        message: 'Alerte créée avec succès',
        data: alert
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la création de l\'alerte'
      });
    }
  }

  /**
   * Récupère les alertes d'un citoyen
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getMyAlerts(req, res) {
    try {
      console.log('[AlertController] getMyAlerts: Début de la récupération des alertes');
      console.log('[AlertController] getMyAlerts: Contenu de req.user:', JSON.stringify(req.user));
      
      // Vérifier que l'utilisateur est bien authentifié
      if (!req.user) {
        console.error('[AlertController] getMyAlerts: Utilisateur non authentifié');
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non authentifié'
        });
      }
      
      // Vérifier que l'ID de l'utilisateur est présent
      const citizenId = req.user.sub || req.user.id;
      console.log(`[AlertController] getMyAlerts: ID citoyen extrait: ${citizenId}`);
      
      if (!citizenId) {
        console.error('[AlertController] getMyAlerts: ID citoyen manquant dans le token');
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur manquant dans le token'
        });
      }
      
      console.log(`[AlertController] getMyAlerts: Appel du service avec citizenId: ${citizenId}`);
      const alerts = await alertService.getAlertsByCitizen(citizenId);
      console.log(`[AlertController] getMyAlerts: ${alerts.length} alertes récupérées`);
      
      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des alertes'
      });
    }
  }

  /**
   * Récupère une alerte par son ID
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getAlertById(req, res) {
    try {
      console.log('[AlertController] getAlertById: Début de la récupération du détail de l\'alerte');
      console.log('[AlertController] getAlertById: Contenu de req.user:', JSON.stringify(req.user));
      
      const { id } = req.params;
      console.log(`[AlertController] getAlertById: ID de l'alerte demandée: ${id}`);
      
      // Vérifier que l'utilisateur est bien authentifié
      if (!req.user) {
        console.error('[AlertController] getAlertById: Utilisateur non authentifié');
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non authentifié'
        });
      }
      
      // Vérifier que l'ID de l'utilisateur est présent
      const citizenId = req.user.sub || req.user.id;
      console.log(`[AlertController] getAlertById: ID citoyen extrait: ${citizenId}`);
      
      if (!citizenId) {
        console.error('[AlertController] getAlertById: ID citoyen manquant dans le token');
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur manquant dans le token'
        });
      }
      
      console.log(`[AlertController] getAlertById: Appel du service avec alertId: ${id} et citizenId: ${citizenId}`);
      const alert = await alertService.getAlertById(id, citizenId);
      console.log(`[AlertController] getAlertById: Alerte récupérée avec succès`);
      
      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || 'Alerte non trouvée'
      });
    }
  }

  /**
   * Ajoute un commentaire à une alerte
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const citizenId = req.user.sub;
      
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Le texte du commentaire est requis'
        });
      }
      
      const alert = await alertService.addComment(id, text, citizenId);
      
      res.status(200).json({
        success: true,
        message: 'Commentaire ajouté avec succès',
        data: alert
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de l\'ajout du commentaire'
      });
    }
  }

  /**
   * Récupère les alertes à proximité
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getAlertsNearby(req, res) {
    try {
      const { longitude, latitude, distance } = req.query;
      
      if (!longitude || !latitude) {
        return res.status(400).json({
          success: false,
          message: 'Les coordonnées (longitude, latitude) sont requises'
        });
      }
      
      const coordinates = [parseFloat(longitude), parseFloat(latitude)];
      const maxDistance = distance ? parseInt(distance) : 5000; // 5km par défaut
      
      const alerts = await alertService.getAlertsNearby(coordinates, maxDistance);
      
      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la recherche d\'alertes à proximité'
      });
    }
  }

  /**
   * Récupère toutes les alertes d'hygiène pour le service d'hygiène
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getHygieneAlertsForService(req, res) {
    try {
      console.log('[AlertController] getHygieneAlertsForService called');
      
      // Récupérer toutes les alertes de la catégorie hygiène
      const alerts = await alertService.getAlertsByCategory('hygiene');
      
      console.log(`[AlertController] Found ${alerts.length} hygiene alerts`);
      
      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('[AlertController] Error getting hygiene alerts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des alertes d\'hygiène'
      });
    }
  }

  /**
   * Webhook pour recevoir un commentaire externe (appelé par les services)
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async receiveExternalComment(req, res) {
    try {
      const { alertId, text, authorType, authorName } = req.body;
      
      // Vérifier l'authentification du service (via une clé API)
      const serviceApiKey = req.headers['x-service-key'];
      const validKeys = [
        process.env.SERVICE_API_KEY,
        'hygiene-service-key-2025', // Clé par défaut du service d'hygiène
        'bolle-inter-service-secure-key-2025' // Clé de service inter-services
      ];
      
      console.log(`[AlertController] Vérification de la clé API pour commentaire: ${serviceApiKey}`);
      
      if (!serviceApiKey || !validKeys.includes(serviceApiKey)) {
        console.log(`[AlertController] Échec d'authentification avec la clé: ${serviceApiKey}`);
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }
      
      console.log(`[AlertController] Authentification réussie pour le webhook de commentaire`);
      
      if (!alertId || !text) {
        return res.status(400).json({
          success: false,
          message: 'L\'ID de l\'alerte et le texte du commentaire sont requis'
        });
      }
      
      // Utiliser le service d'alertes pour trouver l'alerte
      const alert = await alertService.getAlertById(alertId);
      
      // Ajouter le commentaire via la méthode du modèle
      const authorDisplay = authorName || (authorType === 'agent' ? 'Agent service hygiène' : 'Service hygiène');
      await alert.addComment(text, authorDisplay);
      
      res.status(200).json({
        success: true,
        message: 'Commentaire ajouté avec succès',
        data: alert
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de l\'ajout du commentaire externe'
      });
    }
  }

  /**
   * Webhook pour mettre à jour le statut d'une alerte (appelé par les services)
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async updateAlertStatus(req, res) {
    try {
      const { alertId, status, comment, updatedBy } = req.body;
      
      // Vérifier l'authentification du service (via une clé API)
      const serviceApiKey = req.headers['x-service-key'];
      const validKeys = [
        process.env.SERVICE_API_KEY,
        'hygiene-service-key-2025' // Clé par défaut du service d'hygiène
      ];
      
      console.log(`[AlertController] Vérification de la clé API: ${serviceApiKey}`);
      
      if (!serviceApiKey || !validKeys.includes(serviceApiKey)) {
        console.log(`[AlertController] Échec d'authentification avec la clé: ${serviceApiKey}`);
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }
      
      console.log(`[AlertController] Authentification réussie pour le webhook`);
      
      if (!alertId || !status) {
        return res.status(400).json({
          success: false,
          message: 'L\'ID de l\'alerte et le statut sont requis'
        });
      }
      
      const alert = await alertService.updateAlertStatus(alertId, status, comment, updatedBy);
      
      res.status(200).json({
        success: true,
        message: 'Statut de l\'alerte mis à jour avec succès',
        data: alert
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du statut'
      });
    }
  }
}

module.exports = new AlertController();
