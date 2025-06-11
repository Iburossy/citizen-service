/**
 * Script pour réinitialiser complètement le mot de passe du superadmin
 * Exécuter avec: node scripts/reset-superadmin-password.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importer le modèle User
const User = require('../models/user.model');

// Fonction pour réinitialiser le mot de passe du superadmin
async function resetSuperAdminPassword() {
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

    // Afficher les informations actuelles
    console.log('Informations du superadmin:');
    console.log(`ID: ${superadmin._id}`);
    console.log(`Email: ${superadmin.email}`);
    console.log(`Mot de passe actuel (hashé): ${superadmin.password}`);
    
    // Nouveau mot de passe en texte clair
    const plainPassword = 'Superadmin@123';
    
    // Hacher le nouveau mot de passe avec bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    // Mettre à jour directement dans la base de données pour éviter tout middleware
    const result = await User.updateOne(
      { _id: superadmin._id },
      { $set: { password: hashedPassword } }
    );
    
    if (result.modifiedCount === 1) {
      console.log('Mot de passe réinitialisé avec succès');
      console.log(`Nouveau mot de passe: ${plainPassword}`);
      console.log(`Nouveau hash: ${hashedPassword}`);
    } else {
      console.log('Échec de la réinitialisation du mot de passe');
    }

    // Fermer la connexion à la base de données
    await mongoose.connection.close();
    console.log('Connexion à MongoDB fermée');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    process.exit(1);
  }
}

// Exécuter la fonction
resetSuperAdminPassword();
