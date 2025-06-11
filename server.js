require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const routes = require('./routes');

// Créer les dossiers d'upload s'ils n'existent pas
const uploadsDir = path.join(__dirname, 'uploads');
const uploadFolders = ['photos', 'videos', 'audio', 'thumbnails'];

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

uploadFolders.forEach(folder => {
  const folderPath = path.join(uploadsDir, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
});

// Initialisation de Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
} else {
  console.warn('Firebase credentials not found, authentication features may be limited');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolle-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Routes
app.use('/api/auth', routes);

// Route de base pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Service d\'authentification opérationnel' });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Une erreur est survenue dans le service d\'authentification' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Service d'authentification en cours d'exécution sur le port ${PORT}`);
});
