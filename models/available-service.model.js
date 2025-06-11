const mongoose = require('mongoose');

/**
 * Modèle pour les services disponibles pour les citoyens
 * Représente les services comme Hygiène, Police, etc.
 */
const AvailableServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du service est requis'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: 'default-service-icon.png'
  },
  color: {
    type: String,
    default: '#1E88E5'
  },
  endpoint: {
    type: String,
    required: [true, 'L\'endpoint du service est requis'],
    trim: true
  },
  apiUrl: {
    type: String,
    required: [true, 'L\'URL de l\'API du service est requise'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  categories: [{
    name: {
      type: String,
      required: [true, 'Le nom de la catégorie est requis'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour mettre à jour la date de modification
AvailableServiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour vérifier si le service est disponible
AvailableServiceSchema.methods.checkAvailability = async function() {
  try {
    // Cette fonction pourrait être implémentée pour vérifier si le service est en ligne
    // Par exemple, en faisant une requête à son endpoint de santé
    return true;
  } catch (error) {
    console.error(`Erreur lors de la vérification de disponibilité du service ${this.name}:`, error);
    return false;
  }
};

module.exports = mongoose.model('AvailableService', AvailableServiceSchema);
