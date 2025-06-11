const jwt = require('jsonwebtoken');
const config = require('../config/jwt');

/**
 * Service pour la gestion des tokens JWT
 */
class TokenService {
  /**
   * Génère un token JWT pour l'utilisateur
   * @param {Object} payload - Les données à inclure dans le token
   * @param {string} expiresIn - Durée de validité du token (par défaut: '1d')
   * @returns {string} Le token JWT généré
   */
  generateToken(payload, expiresIn = '1d') {
    return jwt.sign(payload, config.jwtSecret, { expiresIn });
  }

  /**
   * Génère un token d'accès et un token de rafraîchissement
   * @param {Object} user - L'utilisateur pour lequel générer les tokens
   * @returns {Object} Les tokens générés
   */
  generateAuthTokens(user) {
    const payload = {
      sub: user._id,
      role: user.role
    };

    const accessToken = this.generateToken(payload);
    const refreshToken = this.generateToken(payload, '7d');

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Vérifie un token JWT
   * @param {string} token - Le token à vérifier
   * @returns {Object} Les données décodées du token
   * @throws {Error} Si le token est invalide
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('Token invalide ou expiré');
    }
  }

  /**
   * Décode un token JWT sans vérifier sa validité
   * @param {string} token - Le token à décoder
   * @returns {Object} Les données décodées du token
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Génère un token de vérification d'email
   * @param {string} userId - L'ID de l'utilisateur
   * @returns {string} Le token de vérification
   */
  generateEmailVerificationToken(userId) {
    return this.generateToken({ sub: userId }, '24h');
  }

  /**
   * Génère un token de réinitialisation de mot de passe
   * @param {string} userId - L'ID de l'utilisateur
   * @returns {string} Le token de réinitialisation
   */
  generatePasswordResetToken(userId) {
    return this.generateToken({ sub: userId }, '1h');
  }
}

module.exports = new TokenService();
