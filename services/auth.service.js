const User = require('../models/user.model');
const tokenService = require('./token.service');
const emailService = require('../utils/email');
const crypto = require('crypto');

/**
 * Service pour la gestion de l'authentification
 */
class AuthService {
  /**
   * Inscrit un nouvel utilisateur citoyen
   * @param {Object} userData - Les données de l'utilisateur
   * @returns {Object} L'utilisateur créé et les tokens
   */
  async register(userData) {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Créer le nouvel utilisateur
      const user = new User({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: 'citizen',
        // Générer un token de vérification d'email
        verificationToken: crypto.randomBytes(32).toString('hex')
      });

      // Sauvegarder l'utilisateur
      await user.save();

      // Envoyer un email de vérification
      try {
        await emailService.sendVerificationEmail(
          user.email,
          user.fullName,
          user.verificationToken
        );
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
        // Ne pas bloquer l'inscription si l'email échoue
      }

      // Générer les tokens d'authentification
      const tokens = tokenService.generateAuthTokens(user);

      return {
        user: user.getBasicInfo(),
        tokens
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Connecte un utilisateur avec email ou numéro de téléphone
   * @param {string} identifier - L'email ou le numéro de téléphone de l'utilisateur
   * @param {string} password - Le mot de passe de l'utilisateur
   * @returns {Object} L'utilisateur et les tokens
   */
  async login(identifier, password) {
    try {
      console.log(`[AUTH SERVICE] Tentative de connexion avec identifiant: ${identifier}`);
      
      // Déterminer si l'identifiant est un email ou un numéro de téléphone
      const isEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(identifier);
      const isPhone = /^(\+221|00221)?[7][0-9]{8}$/.test(identifier);
      
      // Créer le filtre de recherche approprié
      let filter = {};
      if (isEmail) {
        console.log(`[AUTH SERVICE] Connexion avec email: ${identifier}`);
        filter = { email: identifier };
      } else if (isPhone) {
        console.log(`[AUTH SERVICE] Connexion avec numéro de téléphone: ${identifier}`);
        
        // Créer plusieurs variantes du numéro de téléphone pour la recherche
        let phoneVariants = [];
        
        // Numéro tel quel
        phoneVariants.push(identifier);
        
        // Variante avec +221
        if (identifier.startsWith('7')) {
          phoneVariants.push(`+221${identifier}`);
        } else if (identifier.startsWith('221')) {
          phoneVariants.push(`+${identifier}`);
        } else if (identifier.startsWith('+221')) {
          // Déjà au format +221
        } else if (identifier.startsWith('00221')) {
          phoneVariants.push(`+221${identifier.substring(5)}`);
        }
        
        // Variante sans préfixe
        if (identifier.startsWith('+221')) {
          phoneVariants.push(identifier.substring(4));
        } else if (identifier.startsWith('00221')) {
          phoneVariants.push(identifier.substring(5));
        } else if (identifier.startsWith('221')) {
          phoneVariants.push(identifier.substring(3));
        }
        
        console.log(`[AUTH SERVICE] Variantes du numéro de téléphone à rechercher:`, phoneVariants);
        
        // Rechercher avec toutes les variantes possibles
        filter = { phone: { $in: phoneVariants } };
      } else {
        console.log(`[AUTH SERVICE] Format d'identifiant non reconnu: ${identifier}`);
        throw new Error('Format d\'identifiant non reconnu');
      }
      
      // Trouver l'utilisateur par email ou numéro de téléphone
      const user = await User.findOne(filter);
      console.log(`[AUTH SERVICE] Utilisateur trouvé: ${user ? 'Oui' : 'Non'}`);
      
      if (!user) {
        console.log(`[AUTH SERVICE] Aucun utilisateur trouvé avec l'identifiant: ${identifier}`);
        throw new Error('Identifiant ou mot de passe incorrect');
      }
      
      console.log(`[AUTH SERVICE] Rôle de l'utilisateur: ${user.role}`);
      console.log(`[AUTH SERVICE] Statut actif: ${user.isActive}`);
      
      // Vérifier si l'utilisateur est actif
      if (!user.isActive) {
        console.log(`[AUTH SERVICE] Compte désactivé pour l'email: ${email}`);
        throw new Error('Compte désactivé. Veuillez contacter l\'administrateur');
      }

      // Vérifier le mot de passe
      console.log(`[AUTH SERVICE] Vérification du mot de passe pour l'utilisateur: ${user.email}`);
      const isPasswordValid = await user.comparePassword(password);
      console.log(`[AUTH SERVICE] Mot de passe valide: ${isPasswordValid ? 'Oui' : 'Non'}`);
      
      if (!isPasswordValid) {
        console.log(`[AUTH SERVICE] Mot de passe incorrect pour l'email: ${email}`);
        throw new Error('Email ou mot de passe incorrect');
      }

      // Mettre à jour la date de dernière connexion
      user.lastLogin = new Date();
      await user.save();

      // Générer les tokens d'authentification
      const tokens = tokenService.generateAuthTokens(user);

      return {
        user: user.getBasicInfo(),
        tokens,
        isTemporaryPassword: user.isTemporaryPassword
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vérifie le compte d'un utilisateur avec le code unique
   * @param {string} email - L'email de l'utilisateur
   * @param {string} phone - Le numéro de téléphone de l'utilisateur
   * @param {string} code - Le code de vérification
   * @returns {Object} L'utilisateur vérifié
   */
  async verifyAccount(email, phone, code) {
    try {
      console.log(`Tentative de vérification pour ${email} avec le code ${code}`);
      
      // Trouver l'utilisateur par email et téléphone
      const user = await User.findOne({ email, phone });
      if (!user) {
        console.error(`Utilisateur non trouvé pour ${email} et ${phone}`);
        throw new Error('Utilisateur non trouvé');
      }

      console.log(`Utilisateur trouvé: ${user.fullName}, token: ${user.verificationToken}`);
      
      // Vérifier le code (nous utilisons les 6 premiers caractères du token comme code)
      const expectedCode = user.verificationToken.substring(0, 6);
      console.log(`Code attendu: ${expectedCode}, code fourni: ${code}`);
      
      if (expectedCode !== code) {
        console.error(`Code invalide pour ${email}: attendu ${expectedCode}, reçu ${code}`);
        throw new Error('Code de vérification invalide');
      }

      // Marquer l'utilisateur comme vérifié
      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();
      
      console.log(`Compte vérifié avec succès pour ${email}`);

      return user.getBasicInfo();
    } catch (error) {
      console.error(`Erreur lors de la vérification du compte: ${error.message}`);
      throw error;
    }
  }

  /**
   * Renvoie les codes de vérification à l'utilisateur
   * @param {string} email - L'email de l'utilisateur
   * @param {string} phone - Le numéro de téléphone de l'utilisateur
   * @returns {boolean} Succès de l'opération
   */
  async resendVerificationCodes(email, phone) {
    try {
      // Trouver l'utilisateur par email et téléphone
      const user = await User.findOne({ email, phone });
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Générer un nouveau token de vérification dans tous les cas
      // pour s'assurer que l'utilisateur reçoit un nouveau code
      user.verificationToken = crypto.randomBytes(32).toString('hex');
      await user.save();
      
      // Récupérer les 6 premiers caractères du token comme code de vérification
      const verificationCode = user.verificationToken.substring(0, 6);
      console.log(`Code de vérification pour ${email}: ${verificationCode}`);

      // Envoyer un email de vérification avec le code
      try {
        await emailService.sendVerificationEmail(
          user.email,
          user.fullName,
          verificationCode
        );
        console.log(`Email de vérification envoyé à ${email} avec le code ${verificationCode}`);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
        // Ne pas bloquer l'opération si l'email échoue
      }

      // Ici, vous pourriez ajouter la logique pour envoyer un SMS avec le code
      // Utiliser un service comme Twilio ou autre
      console.log(`SMS de vérification serait envoyé à ${phone} avec le code ${verificationCode}`);

      return true;
    } catch (error) {
      console.error('Erreur lors du renvoi des codes de vérification:', error);
      throw error;
    }
  }

  /**
   * Vérifie l'email d'un utilisateur
   * @param {string} token - Le token de vérification
   * @returns {Object} L'utilisateur vérifié
   */
  async verifyEmail(token) {
    try {
      // Trouver l'utilisateur par token de vérification
      const user = await User.findOne({ verificationToken: token });
      if (!user) {
        throw new Error('Token de vérification invalide');
      }

      // Marquer l'utilisateur comme vérifié
      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      return user.getBasicInfo();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Demande de réinitialisation de mot de passe
   * @param {string} email - L'email de l'utilisateur
   * @returns {string} Le token de réinitialisation
   */
  async requestPasswordReset(email) {
    try {
      // Trouver l'utilisateur par email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Aucun compte associé à cet email');
      }

      // Générer un token de réinitialisation
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
      await user.save();

      // Envoyer un email de réinitialisation
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          user.fullName,
          resetToken
        );
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', emailError);
        // Ne pas bloquer la demande si l'email échoue
      }

      return resetToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur
   * @param {string} token - Le token de réinitialisation
   * @param {string} newPassword - Le nouveau mot de passe
   * @returns {Object} L'utilisateur mis à jour
   */
  async resetPassword(token, newPassword) {
    try {
      // Trouver l'utilisateur par token de réinitialisation
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Token invalide ou expiré');
      }

      // Mettre à jour le mot de passe
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.isTemporaryPassword = false;
      await user.save();

      return user.getBasicInfo();
    } catch (error) {
      throw error;
    }
  }

  // La méthode createServiceAgent a été supprimée car le service d'authentification ne gère plus que les citoyens

  /**
   * Récupère les informations d'un utilisateur
   * @param {string} userId - L'ID de l'utilisateur
   * @returns {Object} Les informations de l'utilisateur
   */
  async getUserInfo(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return user.getBasicInfo();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Met à jour les informations d'un utilisateur
   * @param {string} userId - L'ID de l'utilisateur
   * @param {Object} updateData - Les données à mettre à jour
   * @returns {Object} L'utilisateur mis à jour
   */
  async updateUserInfo(userId, updateData) {
    try {
      // Vérifier si l'utilisateur existe
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Champs autorisés à mettre à jour
      const allowedUpdates = ['fullName', 'phone', 'region', 'profilePicture'];
      
      // Appliquer les mises à jour autorisées
      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          user[field] = updateData[field];
        }
      });

      // Sauvegarder les modifications
      await user.save();

      return user.getBasicInfo();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change le mot de passe d'un utilisateur
   * @param {string} userId - L'ID de l'utilisateur
   * @param {string} currentPassword - Le mot de passe actuel
   * @param {string} newPassword - Le nouveau mot de passe
   * @returns {Object} L'utilisateur mis à jour
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Vérifier si l'utilisateur existe
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier le mot de passe actuel
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Mettre à jour le mot de passe
      user.password = newPassword;
      user.isTemporaryPassword = false;
      await user.save();

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
