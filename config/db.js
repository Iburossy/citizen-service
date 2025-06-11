const mongoose = require('mongoose');

/**
 * Configuration de la connexion à MongoDB
 */
const connectDB = async () => {
  try {
    // Récupérer l'URI de connexion depuis les variables d'environnement ou utiliser une valeur par défaut
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bolle-auth';
    
    // Options de connexion
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    
    // Connexion à MongoDB
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB connecté: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error(`Erreur de connexion à MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
