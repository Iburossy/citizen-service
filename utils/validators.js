const Joi = require('joi');

/**
 * Validateurs pour les requêtes d'authentification
 */
class Validators {
  /**
   * Valide les données d'inscription
   * @param {Object} data - Les données à valider
   * @returns {Object} Résultat de la validation
   */
  validateRegistration(data) {
    const schema = Joi.object({
      fullName: Joi.string().min(3).max(50).required()
        .messages({
          'string.empty': 'Le nom complet est requis',
          'string.min': 'Le nom complet doit contenir au moins {#limit} caractères',
          'string.max': 'Le nom complet ne peut pas dépasser {#limit} caractères'
        }),
      email: Joi.string().email().allow('', null)
        .messages({
          'string.email': 'Veuillez fournir un email valide'
        }),
      phone: Joi.string().pattern(/^(\+221|00221|221)?[7][0-9]{8}$/).allow('', null)
        .messages({
          'string.pattern.base': 'Le numéro de téléphone doit être un numéro sénégalais valide'
        }),
      password: Joi.string().min(6).required()
        .messages({
          'string.empty': 'Le mot de passe est requis',
          'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
        .messages({
          'any.only': 'Les mots de passe ne correspondent pas',
          'string.empty': 'La confirmation du mot de passe est requise'
        })
    }).custom((value, helpers) => {
      // Vérifier qu'au moins un email ou un numéro de téléphone est fourni
      if (!value.email && !value.phone) {
        return helpers.error('custom.emailOrPhone', {
          message: 'Veuillez fournir au moins un email ou un numéro de téléphone'
        });
      }
      return value;
    });

    return schema.validate(data, { abortEarly: false });
  }

  /**
   * Valide les données de connexion
   * @param {Object} data - Les données à valider
   * @returns {Object} Résultat de la validation
   */
  validateLogin(data) {
    // Schéma pour la connexion avec email
    const emailSchema = Joi.object({
      email: Joi.string().email().required()
        .messages({
          'string.empty': 'L\'email est requis',
          'string.email': 'Veuillez fournir un email valide'
        }),
      phone: Joi.string().allow('', null),
      password: Joi.string().required()
        .messages({
          'string.empty': 'Le mot de passe est requis'
        })
    });

    // Schéma pour la connexion avec numéro de téléphone
    const phoneSchema = Joi.object({
      email: Joi.string().allow('', null),
      phone: Joi.string().pattern(/^(\+221|00221|221)?[7][0-9]{8}$/).required()
        .messages({
          'string.empty': 'Le numéro de téléphone est requis',
          'string.pattern.base': 'Veuillez fournir un numéro de téléphone sénégalais valide'
        }),
      password: Joi.string().required()
        .messages({
          'string.empty': 'Le mot de passe est requis'
        })
    });

    // Vérifier si les données correspondent à l'un des schémas
    const { error: emailError, value: emailValue } = emailSchema.validate(data, { abortEarly: false });
    if (!emailError) {
      return { error: null, value: emailValue };
    }

    const { error: phoneError, value: phoneValue } = phoneSchema.validate(data, { abortEarly: false });
    if (!phoneError) {
      return { error: null, value: phoneValue };
    }

    // Si aucun schéma ne correspond, retourner une erreur personnalisée
    return {
      error: {
        details: [{
          message: 'Veuillez fournir un email ou un numéro de téléphone valide'
        }]
      },
      value: data
    };
  }

  /**
   * Valide les données de demande de réinitialisation de mot de passe
   * @param {Object} data - Les données à valider
   * @returns {Object} Résultat de la validation
   */
  validateForgotPassword(data) {
    const schema = Joi.object({
      email: Joi.string().email().required()
        .messages({
          'string.empty': 'L\'email est requis',
          'string.email': 'Veuillez fournir un email valide'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  /**
   * Valide les données de réinitialisation de mot de passe
   * @param {Object} data - Les données à valider
   * @returns {Object} Résultat de la validation
   */
  validateResetPassword(data) {
    const schema = Joi.object({
      token: Joi.string().required()
        .messages({
          'string.empty': 'Le token est requis'
        }),
      newPassword: Joi.string().min(6).required()
        .messages({
          'string.empty': 'Le nouveau mot de passe est requis',
          'string.min': 'Le nouveau mot de passe doit contenir au moins {#limit} caractères'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
        .messages({
          'any.only': 'Les mots de passe ne correspondent pas',
          'string.empty': 'La confirmation du mot de passe est requise'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  /**
   * Valide les données de mise à jour du profil
   * @param {Object} data - Les données à valider
   * @returns {Object} Résultat de la validation
   */
  validateUpdateProfile(data) {
    const schema = Joi.object({
      fullName: Joi.string().min(3).max(50)
        .messages({
          'string.min': 'Le nom complet doit contenir au moins {#limit} caractères',
          'string.max': 'Le nom complet ne peut pas dépasser {#limit} caractères'
        }),
      phone: Joi.string().pattern(/^[0-9+]{9,15}$/).allow('', null)
        .messages({
          'string.pattern.base': 'Le numéro de téléphone doit contenir entre 9 et 15 chiffres'
        }),
      region: Joi.string().allow('', null),
      profilePicture: Joi.string().uri().allow('', null)
        .messages({
          'string.uri': 'L\'URL de la photo de profil n\'est pas valide'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  /**
   * Valide les données de changement de mot de passe
   * @param {Object} data - Les données à valider
   * @returns {Object} Résultat de la validation
   */
  validateChangePassword(data) {
    const schema = Joi.object({
      currentPassword: Joi.string().required()
        .messages({
          'string.empty': 'Le mot de passe actuel est requis'
        }),
      newPassword: Joi.string().min(6).required()
        .messages({
          'string.empty': 'Le nouveau mot de passe est requis',
          'string.min': 'Le nouveau mot de passe doit contenir au moins {#limit} caractères'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
        .messages({
          'any.only': 'Les mots de passe ne correspondent pas',
          'string.empty': 'La confirmation du mot de passe est requise'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // La méthode validateCreateServiceAgent a été supprimée car le service d'authentification ne gère plus que les citoyens
}

module.exports = new Validators();
