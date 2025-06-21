const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const cloudinaryService = require('./cloudinary.service');

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
      // Utiliser sharp pour redimensionner et compresser l'image
      const outputPath = file.path.replace(/\.[^/.]+$/, '_processed.jpg');
      
      await sharp(file.path)
        .resize(1200, null, { withoutEnlargement: true }) // Max width 1200px
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      // Génération du thumbnail local (pour la compatibilité avec l'ancien système)
      const thumbnailPath = path.join(
        __dirname,
        '../uploads/thumbnails',
        `thumb_${path.basename(file.path)}`
      );
      
      await sharp(file.path)
        .resize(320, 240, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);
      
      // Remplacer l'original par la version traitée
      fs.unlinkSync(file.path);
      fs.renameSync(outputPath, file.path);
      
      // Upload vers Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadFile(file.path, 'photo');
      
      // Retourner à la fois l'URL locale et l'URL Cloudinary
      return {
        type: 'image',
        url: `/uploads/photos/${path.basename(file.path)}`,
        thumbnail: `/uploads/thumbnails/thumb_${path.basename(file.path)}`,
        size: fs.statSync(file.path).size,
        cloudinary_url: cloudinaryResult.url,
        cloudinary_public_id: cloudinaryResult.public_id
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
    return new Promise(async (resolve, reject) => {
      try {
        // Générer un thumbnail pour la vidéo (local pour compatibilité)
        ffmpeg(file.path)
          .screenshots({
            count: 1,
            folder: path.join(__dirname, '../uploads/thumbnails'),
            filename: `thumb_${path.basename(file.path)}.jpg`,
            size: '320x240'
          })
          .on('end', async () => {
            try {
              // Upload vers Cloudinary
              const cloudinaryResult = await cloudinaryService.uploadFile(file.path, 'video');
              
              // Générer un thumbnail Cloudinary
              const thumbnailUrl = cloudinaryService.generateVideoThumbnail(cloudinaryResult.public_id);
              
              resolve({
                type: 'video',
                url: `/uploads/videos/${path.basename(file.path)}`,
                thumbnail: `/uploads/thumbnails/thumb_${path.basename(file.path)}.jpg`,
                size: fs.statSync(file.path).size,
                cloudinary_url: cloudinaryResult.url,
                cloudinary_public_id: cloudinaryResult.public_id,
                cloudinary_thumbnail: thumbnailUrl
              });
            } catch (uploadError) {
              console.error('Erreur lors de l\'upload vers Cloudinary:', uploadError);
              // En cas d'erreur Cloudinary, on retourne quand même les infos locales
              resolve({
                type: 'video',
                url: `/uploads/videos/${path.basename(file.path)}`,
                thumbnail: `/uploads/thumbnails/thumb_${path.basename(file.path)}.jpg`,
                size: fs.statSync(file.path).size,
                cloudinary_error: uploadError.message
              });
            }
          })
          .on('error', async (err) => {
            console.error('Erreur lors de la génération du thumbnail vidéo:', err);
            
            // En cas d'erreur de thumbnail, on essaie quand même d'uploader sur Cloudinary
            try {
              const cloudinaryResult = await cloudinaryService.uploadFile(file.path, 'video');
              
              resolve({
                type: 'video',
                url: `/uploads/videos/${path.basename(file.path)}`,
                thumbnail: null,
                size: fs.statSync(file.path).size,
                cloudinary_url: cloudinaryResult.url,
                cloudinary_public_id: cloudinaryResult.public_id
              });
            } catch (uploadError) {
              // En cas d'échec total, on retourne juste l'URL locale
              resolve({
                type: 'video',
                url: `/uploads/videos/${path.basename(file.path)}`,
                thumbnail: null,
                size: fs.statSync(file.path).size,
                cloudinary_error: uploadError.message
              });
            }
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
      // Upload vers Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadFile(file.path, 'audio');
      
      return {
        type: 'audio',
        url: `/uploads/audio/${path.basename(file.path)}`,
        thumbnail: '/uploads/thumbnails/audio_default.png', // Image par défaut pour l'audio
        size: fs.statSync(file.path).size,
        cloudinary_url: cloudinaryResult.url,
        cloudinary_public_id: cloudinaryResult.public_id
      };
    } catch (error) {
      console.error('Erreur lors du traitement de l\'audio:', error);
      
      // En cas d'erreur Cloudinary, on retourne quand même les infos locales
      return {
        type: 'audio',
        url: `/uploads/audio/${path.basename(file.path)}`,
        thumbnail: '/uploads/thumbnails/audio_default.png',
        size: fs.statSync(file.path).size,
        cloudinary_error: error.message
      };
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
   * @param {string} [publicId] - L'ID public Cloudinary (optionnel)
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteFile(fileUrl, publicId) {
    try {
      let success = true;
      
      // Si un ID public Cloudinary est fourni, supprimer le fichier de Cloudinary
      if (publicId) {
        try {
          // Suppression dans Cloudinary via le service dédié
          await cloudinaryService.deleteFile(publicId);
          console.log(`Fichier supprimé de Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error('Erreur lors de la suppression sur Cloudinary:', cloudinaryError);
          success = false;
        }
      }
      
      // Supprimer aussi le fichier local
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
      } else if (!fileUrl.startsWith('http')) {
        throw new Error('Type de fichier non reconnu');
      }
      
      // Supprimer le fichier local s'il existe
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      } else if (fileUrl.startsWith('http')) {
        // Si c'est une URL externe (Cloudinary), on considère que c'est déjà géré
        return success;
      } else {
        success = false;
      }
      
      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      throw error;
    }
  }
}

module.exports = new UploadService();
