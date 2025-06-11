/**
 * Script pour mettre à jour le mot de passe du superadmin
 * Exécuter avec: node scripts/update-superadmin-password.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importer le modèle User
const User = require('../models/user.model');

// Fonction pour mettre à jour le mot de passe du superadmin
async function updateSuperAdminPassword() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connecté à MongoDB');

    // Trouver le superadmin
    const superadmin = await User.findOne({ role: 'superadmin' });
    if (!superadmin) {
      console.log('Aucun superadmin trouvé');
      await mongoose.connection.close();
      return;
    }

    // Nouveau mot de passe
    const newPassword = 'Superadmin@123';
    
    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    superadmin.password = hashedPassword;
    await superadmin.save();
    
    console.log('Mot de passe du superadmin mis à jour avec succès:');
    console.log(`Email: ${superadmin.email}`);
    console.log(`Nouveau mot de passe: ${newPassword}`);

    // Fermer la connexion à la base de données
    await mongoose.connection.close();
    console.log('Connexion à MongoDB fermée');
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe du superadmin:', error);
    process.exit(1);
  }
}

// Exécuter la fonction
updateSuperAdminPassword();
