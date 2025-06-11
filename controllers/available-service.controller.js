const availableServiceService = require('../services/available-service.service');

/**
 * Contrôleur pour la gestion des services disponibles
 */
class AvailableServiceController {
  /**
   * Récupère tous les services actifs
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getAllServices(req, res) {
    try {
      const services = await availableServiceService.getAllActiveServices();
      
      res.status(200).json({
        success: true,
        data: services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des services'
      });
    }
  }

  /**
   * Récupère un service par son ID
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getServiceById(req, res) {
    try {
      const { id } = req.params;
      
      const service = await availableServiceService.getServiceById(id);
      
      res.status(200).json({
        success: true,
        data: service
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || 'Service non trouvé'
      });
    }
  }

  /**
   * Récupère les catégories d'un service
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getServiceCategories(req, res) {
    try {
      const { id } = req.params;
      
      const categories = await availableServiceService.getServiceCategories(id);
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || 'Catégories non trouvées'
      });
    }
  }

  /**
   * Vérifie la disponibilité d'un service
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async checkServiceAvailability(req, res) {
    try {
      const { id } = req.params;
      
      const isAvailable = await availableServiceService.checkServiceAvailability(id);
      
      res.status(200).json({
        success: true,
        data: {
          isAvailable
        }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification de disponibilité'
      });
    }
  }

  /**
   * Initialise les services disponibles
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async initializeServices(req, res) {
    try {
      const services = await availableServiceService.initializeAvailableServices();
      
      res.status(200).json({
        success: true,
        message: `${services.length} services ont été initialisés`,
        data: services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'initialisation des services'
      });
    }
  }
}

module.exports = new AvailableServiceController();
