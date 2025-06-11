const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const validators = require('../utils/validators');

/**
 * Contrôleur pour les opérations d'authentification
 */
class AuthController {
  /**
   * Inscription d'un nouvel utilisateur citoyen
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async register(req, res) {
    try {
      // Valider les données d'inscription
      const { error, value } = validators.validateRegistration(req.body);
      
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: errorMessages 
        });
      }
      
      const { fullName, email, phone, password } = value;
      
      // Appeler le service d'authentification pour l'inscription
      const result = await authService.register({
        fullName,
        email,
        phone,
        password
      });
      
      // Envoyer la réponse
      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de l\'inscription'
      });
    }
  }

  /**
   * Connexion d'un utilisateur
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async login(req, res) {
    try {
      console.log(`[AUTH CONTROLLER] Tentative de connexion - Body:`, req.body);
      
      // Valider les données de connexion
      const { error, value } = validators.validateLogin(req.body);
      
      if (error) {
        console.log(`[AUTH CONTROLLER] Erreur de validation:`, error.details);
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: errorMessages 
        });
      }
      
      console.log(`[AUTH CONTROLLER] Données de connexion valides:`, value);
      
      // Déterminer l'identifiant (email ou téléphone) et le mot de passe
      const { email, phone, password } = value;
      const identifier = email || phone;
      
      // Appeler le service d'authentification pour la connexion
      console.log(`[AUTH CONTROLLER] Appel du service d'authentification pour ${identifier}`);
      const result = await authService.login(identifier, password);
      console.log(`[AUTH CONTROLLER] Résultat de la connexion:`, { user: result.user ? 'Utilisateur trouvé' : 'Aucun utilisateur', tokens: result.tokens ? 'Tokens générés' : 'Aucun token' });
      
      // Envoyer la réponse
      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: result.user,
          tokens: result.tokens,
          isTemporaryPassword: result.isTemporaryPassword
        }
      });
      console.log(`[AUTH CONTROLLER] Réponse envoyée avec succès pour ${email}`);
    } catch (error) {
      console.log(`[AUTH CONTROLLER] Erreur lors de la connexion:`, error.message);
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }
  }

  /**
   * Connexion anonyme (génère un token temporaire)
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async loginAnonymous(req, res) {
    try {
      // Générer un ID temporaire
      const tempId = `anon_${Date.now()}`;
      
      // Générer un token avec des droits limités
      const token = tokenService.generateToken({
        sub: tempId,
        role: 'anonymous',
        isAnonymous: true
      }, '24h');
      
      // Envoyer la réponse
      res.status(200).json({
        success: true,
        message: 'Connexion anonyme réussie',
        data: {
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la connexion anonyme'
      });
    }
  }

  /**
   * Vérification d'un token
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async verifyToken(req, res) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Token requis' 
        });
      }
      
      // Vérifier le token
      const decoded = tokenService.verifyToken(token);
      
      res.status(200).json({
        success: true,
        message: 'Token valide',
        data: {
          userId: decoded.sub,
          role: decoded.role
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message || 'Token invalide'
      });
    }
  }

  /**
   * Vérification du compte utilisateur avec code unique
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async verifyAccount(req, res) {
    try {
      console.log('Requête de vérification reçue:', req.body);
      const { email, phone, emailCode, smsCode } = req.body;
      
      console.log(`Données de vérification: email=${email}, phone=${phone}, emailCode=${emailCode}, smsCode=${smsCode}`);
      
      if (!email || !phone || !emailCode || !smsCode) {
        console.log('Données manquantes pour la vérification');
        return res.status(400).json({ 
          success: false, 
          message: 'Email, téléphone et codes de vérification requis' 
        });
      }
      
      // Pour simplifier, nous utilisons un seul code
      // Vérifier que les deux codes sont identiques
      if (emailCode !== smsCode) {
        console.log(`Les codes ne correspondent pas: emailCode=${emailCode}, smsCode=${smsCode}`);
        return res.status(400).json({
          success: false,
          message: 'Les codes de vérification doivent être identiques'
        });
      }
      
      console.log(`Tentative de vérification pour ${email} avec le code ${emailCode}`);
      // Vérifier le compte
      const user = await authService.verifyAccount(email, phone, emailCode);
      console.log('Vérification réussie, utilisateur:', user);
      
      res.status(200).json({
        success: true,
        message: 'Compte vérifié avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification du compte'
      });
    }
  }

  /**
   * Renvoi des codes de vérification
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async resendVerificationCodes(req, res) {
    try {
      console.log('Requête de renvoi des codes reçue:', req.body);
      const { email, phone } = req.body;
      
      console.log(`Données pour le renvoi des codes: email=${email}, phone=${phone}`);
      
      if (!email || !phone) {
        console.log('Données manquantes pour le renvoi des codes');
        return res.status(400).json({ 
          success: false, 
          message: 'Email et téléphone requis' 
        });
      }
      
      console.log(`Tentative de renvoi des codes pour ${email}`);
      // Renvoyer les codes
      const success = await authService.resendVerificationCodes(email, phone);
      console.log(`Renvoi des codes réussi: ${success}`);
      
      res.status(200).json({
        success: true,
        message: 'Codes de vérification renvoyés avec succès'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors du renvoi des codes de vérification'
      });
    }
  }

  /**
   * Vérification de l'email d'un utilisateur
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Token de vérification requis' 
        });
      }
      
      // Vérifier l'email
      const user = await authService.verifyEmail(token);
      
      res.status(200).json({
        success: true,
        message: 'Email vérifié avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification de l\'email'
      });
    }
  }

  /**
   * Demande de réinitialisation de mot de passe
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async forgotPassword(req, res) {
    try {
      // Valider les données de demande de réinitialisation
      const { error, value } = validators.validateForgotPassword(req.body);
      
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: errorMessages 
        });
      }
      
      const { email } = value;
      
      // Demander la réinitialisation du mot de passe
      const resetToken = await authService.requestPasswordReset(email);
      
      // Dans une application réelle, envoyer un email avec le lien de réinitialisation
      // Pour l'instant, nous retournons simplement le token
      
      res.status(200).json({
        success: true,
        message: 'Instructions de réinitialisation envoyées par email',
        data: {
          resetToken // À supprimer en production, uniquement pour le développement
        }
      });
    } catch (error) {
      // Même en cas d'erreur, nous retournons un succès pour éviter les attaques par énumération
      res.status(200).json({
        success: true,
        message: 'Si un compte existe avec cet email, des instructions de réinitialisation ont été envoyées'
      });
    }
  }

  /**
   * Réinitialisation du mot de passe
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async resetPassword(req, res) {
    try {
      // Valider les données de réinitialisation de mot de passe
      const { error, value } = validators.validateResetPassword(req.body);
      
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: errorMessages 
        });
      }
      
      const { token, newPassword } = value;
      
      // Réinitialiser le mot de passe
      const user = await authService.resetPassword(token, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la réinitialisation du mot de passe'
      });
    }
  }

  /**
   * Récupération du profil utilisateur
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async getProfile(req, res) {
    try {
      // L'ID de l'utilisateur est extrait du token par le middleware d'authentification
      const userId = req.user.sub;
      
      // Récupérer les informations de l'utilisateur
      const user = await authService.getUserInfo(userId);
      
      res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération du profil'
      });
    }
  }

  /**
   * Mise à jour du profil utilisateur
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async updateProfile(req, res) {
    try {
      // Valider les données de mise à jour du profil
      const { error, value } = validators.validateUpdateProfile(req.body);
      
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: errorMessages 
        });
      }
      
      // L'ID de l'utilisateur est extrait du token par le middleware d'authentification
      const userId = req.user.sub;
      
      // Mettre à jour les informations de l'utilisateur
      const user = await authService.updateUserInfo(userId, value);
      
      res.status(200).json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du profil'
      });
    }
  }

  /**
   * Déconnexion (côté client, invalidation du token)
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async logout(req, res) {
    // Dans une implémentation plus complète, nous ajouterions le token à une liste noire
    // Pour l'instant, nous retournons simplement un succès
    
    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }

  // La méthode createServiceAgent a été supprimée car le service d'authentification ne gère plus que les citoyens

  /**
   * Changement de mot de passe
   * @param {Object} req - La requête HTTP
   * @param {Object} res - La réponse HTTP
   */
  async changePassword(req, res) {
    try {
      // Valider les données de changement de mot de passe
      const { error, value } = validators.validateChangePassword(req.body);
      
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: errorMessages 
        });
      }
      
      const { currentPassword, newPassword } = value;
      
      // L'ID de l'utilisateur est extrait du token par le middleware d'authentification
      const userId = req.user.sub;
      
      // Changer le mot de passe
      await authService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Mot de passe changé avec succès'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors du changement de mot de passe'
      });
    }
  }
}

module.exports = new AuthController();
