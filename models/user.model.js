const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez fournir un email valide']
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^(\+221|00221|221)?[7][0-9]{8}$/, 'Veuillez fournir un numéro de téléphone sénégalais valide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  role: {
    type: String,
    default: 'citizen'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  region: {
    type: String,
    default: 'Dakar'
  },
  // Localisation actuelle de l'utilisateur (peut être mise à jour dynamiquement)
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [-17.4676, 14.7167] // Coordonnées par défaut pour Dakar
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Adresse complète de l'utilisateur
  address: {
    street: String,
    city: String,
    postalCode: String,
    neighborhood: String
  },
  // Type de document d'identité
  idType: {
    type: String,
    enum: ['Carte d\'identité nationale', 'Passeport', 'Permis de conduire', 'Autre'],
    default: 'Carte d\'identité nationale'
  },
  // Numéro du document d'identité
  idNumber: String,
  
  // Photo de profil de l'utilisateur
  profilePicture: {
    url: String,
    publicId: String, // ID public pour Cloudinary ou autre service de stockage
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Pièce d'identité de l'utilisateur
  idDocument: {
    url: String,
    publicId: String,
    verified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: Date
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  // Préférences de notification
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  // Historique des activités de l'utilisateur
  activityHistory: [{
    type: {
      type: String,
      enum: ['Signalement', 'Commentaire', 'Réaction', 'Participation'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  // Badges et récompenses de l'utilisateur
  badges: [{
    name: String,
    description: String,
    imageUrl: String,
    awardedAt: {
      type: Date,
      default: Date.now
    }
  }],
  points: {
    type: Number,
    default: 0
  },
  badges: [{
    name: String,
    description: String,
    earnedAt: Date
  }],
  profilePicture: String,
  isTemporaryPassword: {
    type: Boolean,
    default: false
  }
}, {
  // Validation personnalisée pour s'assurer qu'au moins un email ou un numéro de téléphone est fourni
  validate: [
    {
      validator: function() {
        return this.email || this.phone;
      },
      message: 'Veuillez fournir au moins un email ou un numéro de téléphone'
    }
  ],
  timestamps: true
});

// Middleware pour hacher le mot de passe avant l'enregistrement
userSchema.pre('save', async function(next) {
  // Seulement hacher le mot de passe s'il a été modifié (ou est nouveau)
  if (!this.isModified('password')) return next();
  
  try {
    // Générer un sel
    const salt = await bcrypt.genSalt(10);
    // Hacher le mot de passe avec le sel
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log(`[USER MODEL] Comparaison de mot de passe pour l'utilisateur: ${this.email}`);
  console.log(`[USER MODEL] Mot de passe candidat: ${candidatePassword.substring(0, 3)}...`);
  console.log(`[USER MODEL] Mot de passe hashé en DB: ${this.password.substring(0, 10)}...`);
  
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log(`[USER MODEL] Résultat de la comparaison: ${isMatch ? 'Succès' : 'Échec'}`);
    return isMatch;
  } catch (error) {
    console.log(`[USER MODEL] Erreur lors de la comparaison du mot de passe:`, error.message);
    return false;
  }
};

// Méthode pour obtenir les informations de base de l'utilisateur (sans données sensibles)
userSchema.methods.getBasicInfo = function() {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isVerified: this.isVerified,
    service: this.service,
    region: this.region,
    currentLocation: this.currentLocation,
    address: this.address,
    idType: this.idType,
    idNumber: this.idNumber,
    profilePicture: this.profilePicture,
    idDocument: this.idDocument ? {
      url: this.idDocument.url,
      verified: this.idDocument.verified,
      uploadedAt: this.idDocument.uploadedAt,
      verifiedAt: this.idDocument.verifiedAt
    } : null,
    points: this.points,
    badges: this.badges,
    notificationPreferences: this.notificationPreferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
