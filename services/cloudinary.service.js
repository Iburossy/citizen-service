const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

/**
 * Service pour la gestion des uploads vers Cloudinary
 */
class CloudinaryService {
  constructor() {
    // Configuration de Cloudinary avec les variables d'environnement
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dpqayer6b',
      api_key: process.env.CLOUDINARY_API_KEY, 
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }

  /**
   * Upload un fichier vers Cloudinary
   * @param {string} filePath - Chemin du fichier local
   * @param {string} fileType - Type de fichier ('photo', 'video', 'audio')
   * @returns {Promise<Object>} - Informations sur le fichier uploadé
   */
  async uploadFile(filePath, fileType) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier n'existe pas: ${filePath}`);
      }

      // Détermine le type de ressource et le dossier pour Cloudinary
      let resourceType = 'image';
      let folder = 'media'; // Utilisation du dossier configuré dans l'upload preset

      if (fileType === 'video') {
        resourceType = 'video';
        folder = 'media'; // Même dossier pour tous les types de fichiers
      } else if (fileType === 'audio') {
        resourceType = 'video'; // Note: audio est uploadé comme type video dans Cloudinary
        folder = 'media'; // Même dossier pour tous les types de fichiers
      }

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: resourceType,
        folder: folder,
        use_filename: true,
        unique_filename: true
      });

      // Retourne les informations sur le fichier uploadé
      return {
        public_id: result.public_id,
        url: result.secure_url,
        resource_type: result.resource_type,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        created_at: result.created_at
      };
    } catch (error) {
      console.error('Erreur lors de l\'upload vers Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Génère un thumbnail pour une vidéo
   * @param {string} publicId - ID public de la vidéo dans Cloudinary
   * @returns {string} - URL du thumbnail
   */
  generateVideoThumbnail(publicId) {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        { width: 320, height: 240, crop: 'fill' },
        { fetch_format: 'auto' }
      ]
    });
  }

  /**
   * Supprime un fichier de Cloudinary
   * @param {string} publicId - ID public du fichier dans Cloudinary
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async deleteFile(publicId) {
    try {
      // Détermine le type de ressource en fonction de l'extension du fichier
      let resourceType = 'image';
      
      // Vérification du type de ressource basée sur l'extension plutôt que sur le dossier
      if (publicId.match(/\.(mp4|mov|avi|webm|mp3|wav|ogg)$/i)) {
        resourceType = 'video';
      }
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la suppression dans Cloudinary:', error);
      throw error;
    }
  }
}

module.exports = new CloudinaryService();
