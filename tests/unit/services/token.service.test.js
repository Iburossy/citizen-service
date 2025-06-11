const jwt = require('jsonwebtoken');
const tokenService = require('../../../services/token.service');
const config = require('../../../config/jwt');

// Mock de jwt
jest.mock('jsonwebtoken');

describe('Token Service', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('devrait générer un token JWT avec les paramètres corrects', () => {
      // Arrange
      const payload = { sub: 'user123', role: 'citizen' };
      const expiresIn = '2h';
      jwt.sign.mockReturnValue('mock-token');

      // Act
      const result = tokenService.generateToken(payload, expiresIn);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(payload, config.jwtSecret, { expiresIn });
      expect(result).toBe('mock-token');
    });

    it('devrait utiliser la durée par défaut si non spécifiée', () => {
      // Arrange
      const payload = { sub: 'user123', role: 'citizen' };
      jwt.sign.mockReturnValue('mock-token');

      // Act
      const result = tokenService.generateToken(payload);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(payload, config.jwtSecret, { expiresIn: '1d' });
      expect(result).toBe('mock-token');
    });
  });

  describe('generateAuthTokens', () => {
    it('devrait générer un token d\'accès et un token de rafraîchissement', () => {
      // Arrange
      const user = { _id: 'user123', role: 'citizen', service: null };
      jwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      // Act
      const result = tokenService.generateAuthTokens(user);

      // Assert
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
    });
  });

  describe('verifyToken', () => {
    it('devrait vérifier un token valide', () => {
      // Arrange
      const token = 'valid-token';
      const decoded = { sub: 'user123', role: 'citizen' };
      jwt.verify.mockReturnValue(decoded);

      // Act
      const result = tokenService.verifyToken(token);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, config.jwtSecret);
      expect(result).toEqual(decoded);
    });

    it('devrait lancer une erreur si le token est invalide', () => {
      // Arrange
      const token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Token invalide');
      });

      // Act & Assert
      expect(() => tokenService.verifyToken(token)).toThrow('Token invalide ou expiré');
      expect(jwt.verify).toHaveBeenCalledWith(token, config.jwtSecret);
    });
  });

  describe('decodeToken', () => {
    it('devrait décoder un token sans vérifier sa validité', () => {
      // Arrange
      const token = 'some-token';
      const decoded = { sub: 'user123', role: 'citizen' };
      jwt.decode.mockReturnValue(decoded);

      // Act
      const result = tokenService.decodeToken(token);

      // Assert
      expect(jwt.decode).toHaveBeenCalledWith(token);
      expect(result).toEqual(decoded);
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('devrait générer un token de vérification d\'email', () => {
      // Arrange
      const userId = 'user123';
      jwt.sign.mockReturnValue('verification-token');

      // Act
      const result = tokenService.generateEmailVerificationToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith({ sub: userId }, config.jwtSecret, { expiresIn: '24h' });
      expect(result).toBe('verification-token');
    });
  });

  describe('generatePasswordResetToken', () => {
    it('devrait générer un token de réinitialisation de mot de passe', () => {
      // Arrange
      const userId = 'user123';
      jwt.sign.mockReturnValue('reset-token');

      // Act
      const result = tokenService.generatePasswordResetToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith({ sub: userId }, config.jwtSecret, { expiresIn: '1h' });
      expect(result).toBe('reset-token');
    });
  });
});
