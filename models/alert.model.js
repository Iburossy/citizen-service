const mongoose = require('mongoose');

/**
 * Modèle pour les alertes créées par les citoyens
 */
const AlertSchema = new mongoose.Schema({
  // Référence au citoyen qui a créé l'alerte (peut être null si anonyme)
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Trace qui a créé l'alerte, même si elle est anonyme (pour l'historique personnel)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Service concerné par l'alerte
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AvailableService',
    required: [true, 'Le service concerné est requis']
  },
  // Catégorie de l'anomalie (optionnelle)
  category: {
    type: String,
    trim: true
  },
  // Description du problème (optionnelle)
  description: {
    type: String,
    trim: true
  },
  // Localisation (obligatoire)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Les coordonnées de localisation sont requises']
    },
    address: {
      type: String,
      trim: true
    }
  },
  // Preuves (au moins une obligatoire)
  proofs: [{
    type: {
      type: String,
      enum: ['photo', 'video', 'audio', 'image'],
      required: [true, 'Le type de preuve est requis']
    },
    url: {
      type: String,
      required: [true, 'L\'URL de la preuve est requise']
    },
    thumbnail: {
      type: String
    },
    // Nouveaux champs pour Cloudinary
    cloudinary_url: {
      type: String
    },
    cloudinary_public_id: {
      type: String
    },
    cloudinary_thumbnail: {
      type: String
    },
    size: {
      type: Number
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Option d'anonymat
  isAnonymous: {
    type: Boolean,
    default: false
  },
  // Statut de l'alerte
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  // Historique des statuts
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'rejected'],
      required: true
    },
    comment: {
      type: String,
      trim: true
    },
    updatedBy: {
      type: String,
      trim: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Commentaires
  comments: [{
    text: {
      type: String,
      required: [true, 'Le texte du commentaire est requis'],
      trim: true
    },
    author: {
      type: String,
      trim: true,
      default: 'Citoyen' // ou 'Service' si c'est un agent qui commente
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
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

// Index géospatial pour les recherches de proximité
AlertSchema.index({ 'location.coordinates': '2dsphere' });

// Middleware pour mettre à jour la date de modification
AlertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Si le statut a changé, ajouter une entrée dans l'historique des statuts
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      updatedAt: new Date()
    });
  }
  
  next();
});

// Méthode pour ajouter un commentaire
AlertSchema.methods.addComment = function(text, author, authorId) {
  this.comments.push({
    text,
    author,
    authorId,
    createdAt: new Date()
  });
  return this.save();
};

// Méthode pour changer le statut
AlertSchema.methods.changeStatus = function(status, comment, updatedBy) {
  this.status = status;
  this.statusHistory.push({
    status,
    comment,
    updatedBy,
    updatedAt: new Date()
  });
  return this.save();
};

// Validation pour s'assurer qu'au moins une preuve est fournie
AlertSchema.path('proofs').validate(function(proofs) {
  return proofs && proofs.length > 0;
}, 'Au moins une preuve (photo, vidéo ou audio) est requise');


module.exports = mongoose.model('Alert', AlertSchema);
