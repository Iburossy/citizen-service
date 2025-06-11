/**
 * Configuration pour les tokens JWT
 */
module.exports = {
  // Secret pour signer les tokens JWT (à remplacer par une variable d'environnement en production)
  jwtSecret: process.env.JWT_SECRET || 'bolle-secret-key-dev-only',
  
  // Durée de validité des tokens d'accès
  accessTokenExpiry: '1d',
  
  // Durée de validité des tokens de rafraîchissement
  refreshTokenExpiry: '7d',
  
  // Durée de validité des tokens de vérification d'email
  emailVerificationTokenExpiry: '24h',
  
  // Durée de validité des tokens de réinitialisation de mot de passe
  passwordResetTokenExpiry: '1h'
};
