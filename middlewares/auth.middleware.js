const tokenService = require('../services/token.service');

/**
 * Middleware pour vérifier l'authentification via JWT
 */
class AuthMiddleware {
  /**
   * Vérifie si le token JWT est valide
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   * @param {Function} next - Fonction pour passer au middleware suivant
   */
  verifyToken(req, res, next) {
    console.log(`[AuthMiddleware] verifyToken called for path: ${req.method} ${req.originalUrl}`);
    try {
      // Récupérer le token du header Authorization
      const authHeader = req.headers.authorization;
      console.log('[AuthMiddleware] authHeader:', authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[AuthMiddleware] Token missing or not Bearer. authHeader:', authHeader);
        return res.status(401).json({
          success: false,
          message: 'Accès non autorisé. Token manquant ou mal formaté'
        });
      }
      
      // Extraire le token
      const token = authHeader.split(' ')[1];
      console.log('[AuthMiddleware] Extracted token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'null');
      
      // Vérifier le token
      const decoded = tokenService.verifyToken(token);
      console.log('[AuthMiddleware] Token decoded successfully. User ID:', decoded.sub, 'Role:', decoded.role);
      
      // Ajouter les informations de l'utilisateur à la requête
      req.user = {
        id: decoded.sub, // Utiliser sub comme id pour la compatibilité
        role: decoded.role,
        ...decoded
      };
      
      next();
    } catch (error) {
      const tokenSnippet = req.headers.authorization ? req.headers.authorization.split(' ')[1]?.substring(0,10) + '...' : 'No token in header';
      console.error('[AuthMiddleware] Error verifying token:', error.message, 'Token used (first 10 chars):', tokenSnippet);
      res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token invalide ou expiré. Details: ' + error.message
      });
    }
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   * @param {string[]} roles - Les rôles autorisés
   * @returns {Function} Middleware pour vérifier le rôle
   */
  checkRole(roles) {
    return (req, res, next) => {
      try {
        // Vérifier si l'utilisateur a été authentifié
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Accès non autorisé. Utilisateur non authentifié'
          });
        }
        
        // Vérifier si l'utilisateur a le rôle requis
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Accès interdit. Rôle insuffisant'
          });
        }
        
        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification du rôle'
        });
      }
    };
  }

  // Les méthodes isAdmin et isSuperAdmin ont été supprimées car le service d'authentification ne gère plus que les citoyens
  
  /**
   * Autorise uniquement les rôles spécifiés
   * @param {string[]} roles - Les rôles autorisés
   * @returns {Function} Middleware pour autoriser les rôles
   */
  authorizeRoles(...roles) {
    const self = this;
    return (req, res, next) => {
      return self.checkRole(roles)(req, res, next);
    };
  }

  /**
   * Vérifie si l'utilisateur est un agent de service
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   * @param {Function} next - Fonction pour passer au middleware suivant
   */
  isServiceAgent(req, res, next) {
    return this.checkRole(['agent', 'admin', 'superadmin'])(req, res, next);
  }

  /**
   * Vérifie si l'utilisateur a accès à un service spécifique
   * @param {string} serviceType - Le type de service requis
   * @returns {Function} Middleware pour vérifier l'accès au service
   */
  hasServiceAccess(serviceType) {
    return (req, res, next) => {
      try {
        // Vérifier si l'utilisateur a été authentifié
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Accès non autorisé. Utilisateur non authentifié'
          });
        }
        
        // Les administrateurs ont accès à tous les services
        if (['admin', 'superadmin'].includes(req.user.role)) {
          return next();
        }
        
        // Vérifier si l'agent a accès au service spécifié
        if (req.user.role === 'agent' && req.user.service === serviceType) {
          return next();
        }
        
        res.status(403).json({
          success: false,
          message: 'Accès interdit. Service non autorisé'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification de l\'accès au service'
        });
      }
    };
  }
}

module.exports = new AuthMiddleware();
