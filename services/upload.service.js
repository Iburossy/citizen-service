const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

/**
 * Service pour la gestion des uploads de fichiers (preuves)
 */
class UploadService {
  constructor() {
    // Créer les dossiers de stockage s'ils n'existent pas
    this.createStorageFolders();
    
    // Configurer multer pour les différents types de fichiers
    this.configureMulter();
  }

  /**
   * Crée les dossiers de stockage s'ils n'existent pas
   */
  createStorageFolders() {
    const baseDir = path.join(__dirname, '../uploads');
    const folders = ['photos', 'videos', 'audio', 'thumbnails'];
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir);
    }
    
    folders.forEach(folder => {
      const folderPath = path.join(baseDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
    });
  }

  /**
   * Configure multer pour les différents types de fichiers
   */
  configureMulter() {
    // Configuration du stockage
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        let folder = 'photos';
        
        if (file.mimetype.startsWith('video/')) {
          folder = 'videos';
        } else if (file.mimetype.startsWith('audio/')) {
          folder = 'audio';
        }
        
        cb(null, path.join(__dirname, `../uploads/${folder}`));
      },
      filename: (req, file, cb) => {
        // Générer un nom de fichier unique
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
      }
    });
    
    // Filtre pour les types de fichiers autorisés
    const fileFilter = (req, file, cb) => {
      // Types MIME autorisés
      const allowedMimeTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        // Vidéos
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Type de fichier non autorisé'), false);
      }
    };
    
    // Créer les middlewares multer
    this.upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB
      }
    });
    
    // Middleware pour un seul fichier
    this.uploadSingle = this.upload.single('file');
    
    // Middleware pour plusieurs fichiers (max 5)
    this.uploadMultiple = this.upload.array('files', 5);
  }

  /**
   * Traite une image téléchargée (redimensionnement, compression)
   * @param {Object} file - Le fichier téléchargé
   * @returns {Promise<Object>} Informations sur le fichier traité
   */
  async processImage(file) {
    try {
      const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', `thumb_${path.basename(file.path)}`);
      
      // Créer un thumbnail
      await sharp(file.path)
        .resize(300, 300, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      // Optimiser l'image originale
      const optimizedPath = file.path;
      await sharp(file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(optimizedPath + '.tmp');
      
      fs.unlinkSync(file.path);
      fs.renameSync(optimizedPath + '.tmp', optimizedPath);
      
      return {
        type: 'photo',
        url: `/uploads/photos/${path.basename(file.path)}`,
        thumbnail: `/uploads/thumbnails/thumb_${path.basename(file.path)}`,
        size: fs.statSync(file.path).size
      };
    } catch (error) {
      console.error('Erreur lors du traitement de l\'image:', error);
      throw error;
    }
  }

  /**
   * Traite une vidéo téléchargée (génération de thumbnail)
   * @param {Object} file - Le fichier téléchargé
   * @returns {Promise<Object>} Informations sur le fichier traité
   */
  async processVideo(file) {
    return new Promise((resolve, reject) => {
      try {
        const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', `thumb_${path.basename(file.path)}.jpg`);
        
        // Générer un thumbnail à partir de la vidéo
        ffmpeg(file.path)
          .screenshots({
            count: 1,
            folder: path.join(__dirname, '../uploads/thumbnails'),
            filename: `thumb_${path.basename(file.path)}.jpg`,
            size: '320x240'
          })
          .on('end', () => {
            resolve({
              type: 'video',
              url: `/uploads/videos/${path.basename(file.path)}`,
              thumbnail: `/uploads/thumbnails/thumb_${path.basename(file.path)}.jpg`,
              size: fs.statSync(file.path).size
            });
          })
          .on('error', (err) => {
            console.error('Erreur lors de la génération du thumbnail vidéo:', err);
            // En cas d'erreur, on retourne quand même les infos sans thumbnail
            resolve({
              type: 'video',
              url: `/uploads/videos/${path.basename(file.path)}`,
              thumbnail: null,
              size: fs.statSync(file.path).size
            });
          });
      } catch (error) {
        console.error('Erreur lors du traitement de la vidéo:', error);
        reject(error);
      }
    });
  }

  /**
   * Traite un fichier audio téléchargé
   * @param {Object} file - Le fichier téléchargé
   * @returns {Promise<Object>} Informations sur le fichier traité
   */
  async processAudio(file) {
    try {
      return {
        type: 'audio',
        url: `/uploads/audio/${path.basename(file.path)}`,
        thumbnail: '/uploads/thumbnails/audio_default.png', // Image par défaut pour l'audio
        size: fs.statSync(file.path).size
      };
    } catch (error) {
      console.error('Erreur lors du traitement de l\'audio:', error);
      throw error;
    }
  }

  /**
   * Traite un fichier téléchargé selon son type
   * @param {Object} file - Le fichier téléchargé
   * @returns {Promise<Object>} Informations sur le fichier traité
   */
  async processFile(file) {
    try {
      if (file.mimetype.startsWith('image/')) {
        return await this.processImage(file);
      } else if (file.mimetype.startsWith('video/')) {
        return await this.processVideo(file);
      } else if (file.mimetype.startsWith('audio/')) {
        return await this.processAudio(file);
      } else {
        throw new Error('Type de fichier non pris en charge');
      }
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      throw error;
    }
  }

  /**
   * Supprime un fichier
   * @param {string} fileUrl - L'URL du fichier à supprimer
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteFile(fileUrl) {
    try {
      // Extraire le chemin du fichier à partir de l'URL
      const fileName = path.basename(fileUrl);
      let filePath;
      
      if (fileUrl.includes('/photos/')) {
        filePath = path.join(__dirname, '../uploads/photos', fileName);
        
        // Supprimer aussi le thumbnail
        const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', `thumb_${fileName}`);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      } else if (fileUrl.includes('/videos/')) {
        filePath = path.join(__dirname, '../uploads/videos', fileName);
        
        // Supprimer aussi le thumbnail
        const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', `thumb_${fileName}.jpg`);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      } else if (fileUrl.includes('/audio/')) {
        filePath = path.join(__dirname, '../uploads/audio', fileName);
      } else {
        throw new Error('Type de fichier non reconnu');
      }
      
      // Supprimer le fichier s'il existe
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      throw error;
    }
  }
}

module.exports = new UploadService();
