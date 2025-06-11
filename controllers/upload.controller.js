const uploadService = require('../services/upload.service');

/**
 * Contrôleur pour la gestion des uploads de fichiers
 */
class UploadController {
  /**
   * Télécharge un seul fichier
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async uploadSingleFile(req, res) {
    try {
      // Middleware multer pour traiter le fichier
      uploadService.uploadSingle(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'Erreur lors du téléchargement du fichier'
          });
        }
        
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'Aucun fichier téléchargé'
          });
        }
        
        // Traiter le fichier selon son type
        const processedFile = await uploadService.processFile(req.file);
        
        res.status(200).json({
          success: true,
          message: 'Fichier téléchargé avec succès',
          data: processedFile
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du téléchargement du fichier'
      });
    }
  }

  /**
   * Télécharge plusieurs fichiers
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async uploadMultipleFiles(req, res) {
    try {
      // Middleware multer pour traiter les fichiers
      uploadService.uploadMultiple(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'Erreur lors du téléchargement des fichiers'
          });
        }
        
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Aucun fichier téléchargé'
          });
        }
        
        // Traiter chaque fichier
        const processedFiles = [];
        for (const file of req.files) {
          const processedFile = await uploadService.processFile(file);
          processedFiles.push(processedFile);
        }
        
        res.status(200).json({
          success: true,
          message: `${processedFiles.length} fichiers téléchargés avec succès`,
          data: processedFiles
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du téléchargement des fichiers'
      });
    }
  }

  /**
   * Supprime un fichier
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async deleteFile(req, res) {
    try {
      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'L\'URL du fichier est requise'
        });
      }
      
      const deleted = await uploadService.deleteFile(fileUrl);
      
      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Fichier supprimé avec succès'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la suppression du fichier'
      });
    }
  }
}

module.exports = new UploadController();
