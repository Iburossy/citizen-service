const authService = require('../../../services/auth.service');
const tokenService = require('../../../services/token.service');
const emailService = require('../../../utils/email');
const User = require('../../../models/user.model');

// Mocks
jest.mock('../../../services/token.service');
jest.mock('../../../utils/email');
jest.mock('../../../models/user.model');

describe('Auth Service', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
  });

  describe('registerCitizen', () => {
    it('devrait créer un nouvel utilisateur et envoyer un email de vérification', async () => {
      // Arrange
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user123',
        fullName: userData.fullName,
        email: userData.email,
        verificationToken: 'verification-token',
        save: jest.fn().mockResolvedValue(true),
        getBasicInfo: jest.fn().mockReturnValue({
          id: 'user123',
          fullName: userData.fullName,
          email: userData.email
        })
      };

      User.findOne.mockResolvedValue(null); // Aucun utilisateur existant
      User.mockImplementation(() => mockUser);

      tokenService.generateAuthTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });

      emailService.sendVerificationEmail.mockResolvedValue(true);

      // Act
      const result = await authService.registerCitizen(userData);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User).toHaveBeenCalledWith(expect.objectContaining({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: 'citizen'
      }));
      expect(mockUser.save).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        userData.email,
        userData.fullName,
        mockUser.verificationToken
      );
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        user: mockUser.getBasicInfo(),
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      });
    });

    it('devrait rejeter si l\'email existe déjà', async () => {
      // Arrange
      const userData = {
        fullName: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue({ email: userData.email }); // Email existant

      // Act & Assert
      await expect(authService.registerCitizen(userData)).rejects.toThrow('Cet email est déjà utilisé');
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('devrait authentifier un utilisateur avec des identifiants valides', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      const mockUser = {
        _id: 'user123',
        email,
        comparePassword: jest.fn().mockResolvedValue(true),
        lastLogin: null,
        isTemporaryPassword: false,
        save: jest.fn().mockResolvedValue(true),
        getBasicInfo: jest.fn().mockReturnValue({
          id: 'user123',
          email
        })
      };

      User.findOne.mockResolvedValue(mockUser);

      tokenService.generateAuthTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(password);
      expect(mockUser.save).toHaveBeenCalled();
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        user: mockUser.getBasicInfo(),
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        },
        isTemporaryPassword: false
      });
      expect(mockUser.lastLogin).toBeInstanceOf(Date);
    });

    it('devrait rejeter si l\'utilisateur n\'existe pas', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';

      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(email, password)).rejects.toThrow('Email ou mot de passe incorrect');
      expect(User.findOne).toHaveBeenCalledWith({ email });
    });

    it('devrait rejeter si le mot de passe est incorrect', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';

      const mockUser = {
        email,
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.login(email, password)).rejects.toThrow('Email ou mot de passe incorrect');
      expect(User.findOne).toHaveBeenCalledWith({ email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(password);
    });
  });

  describe('verifyEmail', () => {
    it('devrait vérifier l\'email d\'un utilisateur avec un token valide', async () => {
      // Arrange
      const token = 'valid-verification-token';

      const mockUser = {
        _id: 'user123',
        verificationToken: token,
        isVerified: false,
        save: jest.fn().mockResolvedValue(true),
        getBasicInfo: jest.fn().mockReturnValue({
          id: 'user123',
          isVerified: true
        })
      };

      User.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authService.verifyEmail(token);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ verificationToken: token });
      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.verificationToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser.getBasicInfo());
    });

    it('devrait rejeter si le token est invalide', async () => {
      // Arrange
      const token = 'invalid-token';

      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.verifyEmail(token)).rejects.toThrow('Token de vérification invalide');
      expect(User.findOne).toHaveBeenCalledWith({ verificationToken: token });
    });
  });

  // Ajoutez d'autres tests pour les méthodes restantes...
});
