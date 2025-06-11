const AvailableService = require('../models/available-service.model');
const axios = require('axios');

/**
 * Service pour la gestion des services disponibles pour les citoyens
 */
class AvailableServiceService {
  /**
   * Récupère tous les services actifs
   * @returns {Promise<Array>} Liste des services actifs
   */
  async getAllActiveServices() {
    try {
      return await AvailableService.find({ isActive: true });
    } catch (error) {
      console.error('Erreur lors de la récupération des services actifs:', error);
      throw error;
    }
  }

  /**
   * Récupère un service par son ID
   * @param {string} serviceId - L'ID du service
   * @returns {Promise<Object>} Le service trouvé
   */
  async getServiceById(serviceId) {
    try {
      const service = await AvailableService.findById(serviceId);
      if (!service) {
        throw new Error('Service non trouvé');
      }
      return service;
    } catch (error) {
      console.error(`Erreur lors de la récupération du service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les catégories d'un service
   * @param {string} serviceId - L'ID du service
   * @returns {Promise<Array>} Liste des catégories du service
   */
  async getServiceCategories(serviceId) {
    try {
      const service = await this.getServiceById(serviceId);
      return service.categories || [];
    } catch (error) {
      console.error(`Erreur lors de la récupération des catégories du service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie la disponibilité d'un service
   * @param {string} serviceId - L'ID du service
   * @returns {Promise<boolean>} Disponibilité du service
   */
  async checkServiceAvailability(serviceId) {
    try {
      const service = await this.getServiceById(serviceId);
      
      // Tenter de contacter le service via son endpoint de santé
      try {
        const healthEndpoint = `${service.apiUrl}/health`;
        const response = await axios.get(healthEndpoint, { timeout: 5000 });
        
        // Mettre à jour le statut de disponibilité
        service.isAvailable = response.status === 200;
        await service.save();
        
        return service.isAvailable;
      } catch (error) {
        console.error(`Erreur lors de la vérification de disponibilité du service ${service.name}:`, error.message);
        
        // En cas d'erreur, marquer le service comme indisponible
        service.isAvailable = false;
        await service.save();
        
        return false;
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification de disponibilité du service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Initialise les services disponibles dans la base de données
   * Cette méthode est utilisée pour pré-remplir la base de données avec les services existants
   * @returns {Promise<Array>} Liste des services initialisés
   */
  async initializeAvailableServices() {
    try {
      // Vérifier si des services existent déjà
      const existingServices = await AvailableService.find();
      if (existingServices.length > 0) {
        console.log('Des services sont déjà initialisés dans la base de données');
        return existingServices;
      }

      // Liste des services à initialiser
      const servicesToInitialize = [
        {
          name: 'Service d\'Hygiène',
          description: 'Signaler des problèmes d\'hygiène, de déchets ou d\'insalubrité',
          icon: 'hygiene-icon.png',
          color: '#FFD600', // Jaune
          endpoint: 'hygiene',
          apiUrl: process.env.HYGIENE_SERVICE_URL || 'http://localhost:3008',
          categories: [
            { name: 'Déchets', description: 'Déchets non collectés ou dépôts sauvages' },
            { name: 'Restaurant insalubre', description: 'Problèmes d\'hygiène dans un restaurant' },
            { name: 'Eau insalubre', description: 'Problèmes liés à la qualité de l\'eau' },
            { name: 'Nuisibles', description: 'Présence de rats, cafards ou autres nuisibles' },
            { name: 'Autre', description: 'Autre problème d\'hygiène' }
          ]
        },
        {
          name: 'Police Nationale',
          description: 'Signaler des problèmes de sécurité ou des infractions',
          icon: 'police-icon.png',
          color: '#00695C', // Vert foncé
          endpoint: 'police',
          apiUrl: process.env.POLICE_SERVICE_URL || 'http://localhost:3010',
          categories: [
            { name: 'Vol', description: 'Signaler un vol' },
            { name: 'Agression', description: 'Signaler une agression' },
            { name: 'Vandalisme', description: 'Signaler un acte de vandalisme' },
            { name: 'Circulation', description: 'Problème de circulation ou stationnement' },
            { name: 'Autre', description: 'Autre problème de sécurité' }
          ]
        },
        {
          name: 'Douanes',
          description: 'Signaler des problèmes liés aux douanes ou au commerce illégal',
          icon: 'douane-icon.png',
          color: '#D84315', // Orange foncé
          endpoint: 'douane',
          apiUrl: process.env.DOUANE_SERVICE_URL || 'http://localhost:3011',
          categories: [
            { name: 'Contrebande', description: 'Suspicion de contrebande' },
            { name: 'Produits contrefaits', description: 'Vente de produits contrefaits' },
            { name: 'Commerce illégal', description: 'Activité commerciale non déclarée' },
            { name: 'Autre', description: 'Autre problème lié aux douanes' }
          ]
        },
        {
          name: 'Gendarmerie',
          description: 'Signaler des problèmes de sécurité en zone rurale ou périurbaine',
          icon: 'gendarmerie-icon.png',
          color: '#004D40', // Vert très foncé
          endpoint: 'gendarmerie',
          apiUrl: process.env.GENDARMERIE_SERVICE_URL || 'http://localhost:3012',
          categories: [
            { name: 'Sécurité routière', description: 'Problème de sécurité routière' },
            { name: 'Ordre public', description: 'Trouble à l\'ordre public' },
            { name: 'Environnement', description: 'Atteinte à l\'environnement' },
            { name: 'Autre', description: 'Autre problème relevant de la gendarmerie' }
          ]
        }
      ];

      // Créer les services dans la base de données
      const createdServices = await AvailableService.insertMany(servicesToInitialize);
      console.log(`${createdServices.length} services ont été initialisés dans la base de données`);
      
      return createdServices;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des services disponibles:', error);
      throw error;
    }
  }
}

module.exports = new AvailableServiceService();
