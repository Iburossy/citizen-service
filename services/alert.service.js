const Alert = require('../models/alert.model');
const AvailableService = require('../models/available-service.model');
const axios = require('axios');

/**
 * Service pour la gestion des alertes créées par les citoyens
 */
class AlertService {
  /**
   * Crée une nouvelle alerte
   * @param {Object} alertData - Les données de l'alerte
   * @param {string} citizenId - L'ID du citoyen (null si anonyme)
   * @returns {Promise<Object>} L'alerte créée
   */
  async createAlert(alertData, citizenId = null) {
    try {
      // Vérifier si le service existe et est actif
      const service = await AvailableService.findById(alertData.serviceId);
      if (!service || !service.isActive) {
        throw new Error('Service non trouvé ou inactif');
      }

      // Créer la nouvelle alerte
      const alert = new Alert({
        citizenId: alertData.isAnonymous ? null : citizenId,
        // Stocker l'ID du créateur même pour les alertes anonymes (champ séparé)
        createdBy: citizenId, // Nouveau champ pour tracer qui a créé l'alerte, même si anonyme
        service: service._id,
        category: alertData.category,
        description: alertData.description,
        location: {
          type: 'Point',
          coordinates: alertData.coordinates, // [longitude, latitude]
          address: alertData.address
        },
        proofs: alertData.proofs,
        isAnonymous: alertData.isAnonymous,
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          comment: 'Alerte créée',
          updatedAt: new Date()
        }]
      });

      // Sauvegarder l'alerte
      await alert.save();

      // Transmettre l'alerte au service concerné
      await this.forwardAlertToService(alert, service);

      return alert;
    } catch (error) {
      console.error('Erreur lors de la création de l\'alerte:', error);
      throw error;
    }
  }

  /**
   * Transmet une alerte au service concerné
   * @param {Object} alert - L'alerte à transmettre
   * @param {Object} service - Le service concerné
   * @returns {Promise<Object>} Résultat de la transmission
   */
  async forwardAlertToService(alert, service) {
    try {
      console.log(`[AlertService] Forwarding alert ${alert._id} to service ${service.name}`);
      
      // Préparer les données à envoyer au service
      const alertData = {
        alertId: alert._id,
        _id: alert._id, // L'ID mongoDB complet pour l'import
        title: service.name || "Alerte d'hygiène",
        category: alert.category,
        description: alert.description,
        location: alert.location,
        proofs: alert.proofs,
        isAnonymous: alert.isAnonymous,
        citizenId: alert.citizenId,
        status: alert.status || 'new',
        priority: 'medium',
        createdAt: alert.createdAt,
        updatedAt: new Date()
      };

      console.log(`[AlertService] Alert data to forward:`, JSON.stringify(alertData));
      console.log(`[AlertService] Forwarding to endpoint: ${service.apiUrl}/alerts`);
      
      // 1. Envoyer l'alerte au service standard via son API
      const endpoint = `${service.apiUrl}/alerts`;
      let response;
      
      try {
        response = await axios.post(endpoint, alertData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': process.env.SERVICE_API_KEY // Clé d'API pour l'authentification
          },
          timeout: 10000 // 10 secondes
        });
        console.log(`[AlertService] Response from service:`, response.data);
      } catch (error) {
        console.error(`[AlertService] Error forwarding to standard endpoint: ${error.message}`);
      }
      
      // 2. Pour les alertes d'hygiène, envoyer également au nouvel endpoint d'importation
      if (service.name === 'hygiene' || service.endpoint === 'hygiene') {
        try {
          const importEndpoint = `${service.apiUrl}/import/alert`;
          console.log(`[AlertService] Forwarding hygiene alert to import endpoint: ${importEndpoint}`);
          
          const importResponse = await axios.post(importEndpoint, alertData, {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.HYGIENE_IMPORT_API_KEY // Clé spécifique pour l'importation
            },
            timeout: 10000 // 10 secondes
          });
          
          console.log(`[AlertService] Response from import endpoint:`, importResponse.data);
        } catch (importError) {
          console.error(`[AlertService] Error forwarding to import endpoint: ${importError.message}`);
          // Ne pas arrêter le processus si l'envoi au nouvel endpoint échoue
        }
      }

      // Mettre à jour l'alerte avec l'ID de référence du service (si disponible)
      if (response && response.data && response.data.serviceReferenceId) {
        alert.serviceReferenceId = response.data.serviceReferenceId;
        await alert.save();
      }

      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la transmission de l'alerte au service ${service.name}:`, error);
      
      // Même en cas d'erreur, l'alerte est créée dans notre système
      // Elle pourra être retransmise ultérieurement
      
      // Ajouter un commentaire sur l'échec de transmission
      alert.addComment(
        `Échec de la transmission au service. Raison: ${error.message}`,
        'Système',
        null
      );
      
      throw error;
    }
  }

  /**
   * Récupère toutes les alertes d'une catégorie spécifique
   * @param {string} category - La catégorie des alertes à récupérer
   * @returns {Promise<Array>} Liste des alertes
   */
  async getAlertsByCategory(category) {
    try {
      console.log(`[AlertService] Getting alerts for category: ${category}`);
      
      // Construire la requête de recherche
      const query = { category };
      
      // Récupérer les alertes avec leurs preuves
      const alerts = await Alert.find(query)
        .sort({ createdAt: -1 })
        .populate('service', 'name endpoint apiUrl')
        // Assurer que les preuves (proofs) sont incluses
        .populate('proofs');
      
      console.log(`[AlertService] Found ${alerts.length} alerts for category ${category}`);
      
      return alerts;
    } catch (error) {
      console.error(`[AlertService] Error getting alerts for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les alertes d'un citoyen (y compris ses alertes anonymes)
   * @param {string} citizenId - L'ID du citoyen
   * @returns {Promise<Array>} Liste des alertes du citoyen
   */
  async getAlertsByCitizen(citizenId) {
    try {
      console.log(`[AlertService] getAlertsByCitizen: Recherche des alertes pour le citoyen avec ID: ${citizenId}`);
      
      // Vérifier que l'ID est valide
      if (!citizenId) {
        console.error('[AlertService] getAlertsByCitizen: ID citoyen non fourni ou invalide');
        return [];
      }
      
      // Construire une requête qui récupère:
      // 1. Les alertes où citizenId correspond à l'ID de l'utilisateur (alertes non anonymes)
      // 2. Les alertes où createdBy correspond à l'ID de l'utilisateur (alertes anonymes créées par l'utilisateur)
      const query = {
        $or: [
          { citizenId: citizenId },
          { createdBy: citizenId }
        ]
      };
      
      console.log(`[AlertService] getAlertsByCitizen: Exécution de la requête avec $or: ${JSON.stringify(query)}`);
      
      // Vérifier si des alertes existent pour cet ID (sans filtre)
      const allAlerts = await Alert.find({});
      console.log(`[AlertService] getAlertsByCitizen: Nombre total d'alertes dans la base: ${allAlerts.length}`);
      
      // Afficher les IDs citoyens et createdBy de toutes les alertes pour débogage
      const citizenIds = allAlerts.map(a => ({ citizenId: a.citizenId, createdBy: a.createdBy }));
      console.log(`[AlertService] getAlertsByCitizen: IDs dans les alertes: ${JSON.stringify(citizenIds)}`);
      
      // Récupérer les alertes du citoyen avec la nouvelle requête
      const alerts = await Alert.find(query)
        .populate('service', 'name icon color')
        .sort({ createdAt: -1 });
      
      console.log(`[AlertService] getAlertsByCitizen: ${alerts.length} alertes trouvées pour le citoyen ${citizenId}`);
      
      // Afficher les détails des alertes trouvées
      if (alerts.length > 0) {
        console.log(`[AlertService] getAlertsByCitizen: Détails des alertes trouvées:`);
        alerts.forEach((alert, index) => {
          console.log(`[AlertService] Alerte ${index + 1}: ID=${alert._id}, anonyme=${alert.isAnonymous}, citizenId=${alert.citizenId}, createdBy=${alert.createdBy}`);
        });
      } else {
        console.log(`[AlertService] getAlertsByCitizen: Aucune alerte trouvée. Vérification du format de l'ID...`);
        console.log(`[AlertService] getAlertsByCitizen: Type de citizenId: ${typeof citizenId}`);
        console.log(`[AlertService] getAlertsByCitizen: Longueur de citizenId: ${citizenId.length}`);
      }
      
      return alerts;
    } catch (error) {
      console.error(`[AlertService] Erreur lors de la récupération des alertes du citoyen ${citizenId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère une alerte par son ID
   * @param {string} alertId - L'ID de l'alerte
   * @param {string} citizenId - L'ID du citoyen (pour vérification)
   * @returns {Promise<Object>} L'alerte trouvée
   */
  async getAlertById(alertId, citizenId = null) {
    try {
      console.log(`[AlertService] getAlertById: Recherche de l'alerte ${alertId} pour l'utilisateur ${citizenId}`);
      
      // D'abord, récupérer l'alerte sans filtre pour vérifier ensuite les droits d'accès
      const alert = await Alert.findById(alertId)
        .populate('service', 'name icon color endpoint apiUrl')
        .populate('citizenId', 'fullName email phone');
        
      if (!alert) {
        console.log(`[AlertService] getAlertById: Alerte ${alertId} non trouvée`);
        throw new Error('Alerte non trouvée');
      }
      
      console.log(`[AlertService] getAlertById: Alerte trouvée - citizenId: ${alert.citizenId}, createdBy: ${alert.createdBy}, isAnonymous: ${alert.isAnonymous}`);
      
      // Si un citizenId est fourni, vérifier que l'utilisateur a le droit d'accéder à cette alerte
      // Soit parce qu'il est le propriétaire (citizenId), soit parce qu'il l'a créée (createdBy)
      if (citizenId) {
        // Vérifier si l'alerte a un citizenId qui est un objet MongoDB ou une chaîne
        let hasAccessByCitizenId = false;
        if (alert.citizenId) {
          if (typeof alert.citizenId === 'object' && alert.citizenId._id) {
            // Si c'est un objet MongoDB populaté
            hasAccessByCitizenId = alert.citizenId._id.toString() === citizenId.toString();
          } else {
            // Si c'est un ID simple
            hasAccessByCitizenId = alert.citizenId.toString() === citizenId.toString();
          }
        }
        
        // Vérifier si l'alerte a un createdBy qui correspond à l'utilisateur
        let hasAccessByCreatedBy = false;
        if (alert.createdBy) {
          hasAccessByCreatedBy = alert.createdBy.toString() === citizenId.toString();
        }
        
        const hasAccess = hasAccessByCitizenId || hasAccessByCreatedBy;
        
        console.log(`[AlertService] getAlertById: Vérification d'accès pour l'utilisateur ${citizenId}:`);
        console.log(`[AlertService] getAlertById: - Par citizenId: ${hasAccessByCitizenId}`);
        console.log(`[AlertService] getAlertById: - Par createdBy: ${hasAccessByCreatedBy}`);
        console.log(`[AlertService] getAlertById: - Accès final: ${hasAccess}`);
        
        if (!hasAccess) {
          throw new Error('Accès non autorisé à cette alerte');
        }
      }
      
      return alert;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'alerte ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Ajoute un commentaire à une alerte
   * @param {string} alertId - L'ID de l'alerte
   * @param {string} text - Le texte du commentaire
   * @param {string} citizenId - L'ID du citoyen
   * @returns {Promise<Object>} L'alerte mise à jour
   */
  async addComment(alertId, text, citizenId) {
    try {
      const alert = await this.getAlertById(alertId, citizenId);
      
      await alert.addComment(text, 'Citoyen', citizenId);
      
      // Transmettre le commentaire au service concerné
      try {
        const service = await AvailableService.findById(alert.service);
        
        const endpoint = `${service.apiUrl}/alerts/${alert.serviceReferenceId || alert._id}/comments`;
        await axios.post(endpoint, {
          text,
          authorType: 'citizen',
          citizenId
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': process.env.SERVICE_API_KEY
          }
        });
      } catch (error) {
        console.error(`Erreur lors de la transmission du commentaire au service:`, error);
        // Ne pas bloquer l'ajout du commentaire dans notre système
      }
      
      return alert;
    } catch (error) {
      console.error(`Erreur lors de l'ajout du commentaire à l'alerte ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les alertes à proximité d'une localisation
   * @param {Array} coordinates - Coordonnées [longitude, latitude]
   * @param {number} maxDistance - Distance maximale en mètres
   * @returns {Promise<Array>} Liste des alertes à proximité
   */
  async getAlertsNearby(coordinates, maxDistance = 5000) {
    try {
      return await Alert.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates
            },
            $maxDistance: maxDistance
          }
        },
        // Ne pas inclure les alertes anonymes dans les recherches de proximité
        isAnonymous: false
      })
      .populate('service', 'name icon color')
      .sort({ createdAt: -1 })
      .limit(50); // Limiter le nombre de résultats
    } catch (error) {
      console.error('Erreur lors de la recherche d\'alertes à proximité:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une alerte (généralement appelé par le webhook du service)
   * @param {string} alertId - L'ID de l'alerte
   * @param {string} status - Le nouveau statut
   * @param {string} comment - Commentaire sur le changement de statut
   * @param {string} updatedBy - Qui a mis à jour le statut
   * @returns {Promise<Object>} L'alerte mise à jour
   */
  async updateAlertStatus(alertId, status, comment, updatedBy) {
    try {
      const alert = await Alert.findById(alertId);
      
      if (!alert) {
        throw new Error('Alerte non trouvée');
      }
      
      await alert.changeStatus(status, comment, updatedBy);
      
      return alert;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut de l'alerte ${alertId}:`, error);
      throw error;
    }
  }
}

module.exports = new AlertService();
