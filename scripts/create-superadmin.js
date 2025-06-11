/**
 * Script pour créer un compte superadmin
 * Exécuter avec: node scripts/create-superadmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importer le modèle User
const User = require('../models/user.model');

// Fonction pour créer un superadmin
async function createSuperAdmin() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connecté à MongoDB');

    // Vérifier si un superadmin existe déjà
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('Un superadmin existe déjà:');
      console.log(`Email: ${existingSuperAdmin.email}`);
      console.log(`Nom: ${existingSuperAdmin.fullName}`);
      await mongoose.connection.close();
      return;
    }

    // Données du superadmin
    const superadminData = {
      fullName: 'Super Admin',
      email: 'superadmin@bolle.com',
      phone: '+22900000000',
      password: await bcrypt.hash('Superadmin@123', 10),
      role: 'superadmin',
      isVerified: true,
      isActive: true
    };

    // Créer le superadmin
    const superadmin = await User.create(superadminData);
    console.log('Superadmin créé avec succès:');
    console.log(`Email: ${superadmin.email}`);
    console.log(`Mot de passe: Superadmin@123`);
    console.log(`Rôle: ${superadmin.role}`);

    // Fermer la connexion à la base de données
    await mongoose.connection.close();
    console.log('Connexion à MongoDB fermée');
  } catch (error) {
    console.error('Erreur lors de la création du superadmin:', error);
    process.exit(1);
  }
}

// Exécuter la fonction
createSuperAdmin();
