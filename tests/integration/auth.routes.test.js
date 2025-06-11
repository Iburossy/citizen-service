const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const routes = require('../../routes');
const User = require('../../models/user.model');
const tokenService = require('../../services/token.service');

// Créer une application Express pour les tests
const app = express();
app.use(express.json());
app.use('/', routes);

// Mock des services externes
jest.mock('../../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendAgentCredentialsEmail: jest.fn().mockResolvedValue(true)
}));

describe('Auth Routes - Tests d\'intégration', () => {
  let mongoServer;
  let adminToken;

  // Avant tous les tests
  beforeAll(async () => {
    // Connexion à la base de données de test
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolle-auth-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Créer un utilisateur admin pour les tests
    const admin = new User({
      fullName: 'Admin Test',
      email: 'admin@test.com',
      password: 'adminpassword',
      role: 'admin',
      isVerified: true
    });

    await admin.save();

    // Générer un token pour l'admin
    adminToken = tokenService.generateToken({
      sub: admin._id,
      role: 'admin',
      service: null
    });
  });

  // Après tous les tests
  afterAll(async () => {
    // Supprimer toutes les données de test
    await User.deleteMany({});
    
    // Fermer la connexion à la base de données
    await mongoose.connection.close();
  });

  // Avant chaque test
  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await User.deleteMany({ role: { $ne: 'admin' } });
  });

  describe('POST /register', () => {
    it('devrait créer un nouvel utilisateur avec des données valides', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscription réussie');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('devrait rejeter une inscription avec un email déjà utilisé', async () => {
      // Créer d'abord un utilisateur
      const existingUser = new User({
        fullName: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
        role: 'citizen'
      });

      await existingUser.save();

      // Tenter de créer un utilisateur avec le même email
      const userData = {
        fullName: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cet email est déjà utilisé');
    });

    it('devrait rejeter une inscription avec des données invalides', async () => {
      const userData = {
        fullName: 'T', // Trop court
        email: 'invalid-email', // Email invalide
        password: 'pass', // Mot de passe trop court
        confirmPassword: 'different' // Ne correspond pas
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /login', () => {
    it('devrait authentifier un utilisateur avec des identifiants valides', async () => {
      // Créer d'abord un utilisateur
      const user = new User({
        fullName: 'Login Test',
        email: 'login@example.com',
        password: 'password123',
        role: 'citizen',
        isVerified: true
      });

      await user.save();

      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('devrait rejeter une connexion avec un email inexistant', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email ou mot de passe incorrect');
    });

    it('devrait rejeter une connexion avec un mot de passe incorrect', async () => {
      // Créer d'abord un utilisateur
      const user = new User({
        fullName: 'Wrong Password',
        email: 'wrong@example.com',
        password: 'correctpassword',
        role: 'citizen'
      });

      await user.save();

      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email ou mot de passe incorrect');
    });
  });

  describe('Routes protégées', () => {
    let userToken;
    let userId;

    beforeEach(async () => {
      // Créer un utilisateur pour les tests
      const user = new User({
        fullName: 'Protected Routes',
        email: 'protected@example.com',
        password: 'password123',
        role: 'citizen',
        isVerified: true
      });

      await user.save();
      userId = user._id;

      // Générer un token pour l'utilisateur
      userToken = tokenService.generateToken({
        sub: userId,
        role: 'citizen',
        service: null
      });
    });

    it('devrait permettre l\'accès au profil avec un token valide', async () => {
      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(userId.toString());
    });

    it('devrait refuser l\'accès sans token', async () => {
      const response = await request(app)
        .get('/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Accès non autorisé');
    });

    it('devrait refuser l\'accès avec un token invalide', async () => {
      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Accès non autorisé');
    });
  });

  describe('Routes admin', () => {
    it('devrait permettre à un admin de créer un agent de service', async () => {
      const agentData = {
        fullName: 'Agent Test',
        email: 'agent@test.com',
        phone: '123456789',
        service: 'Police',
        region: 'Dakar'
      };

      const response = await request(app)
        .post('/admin/create-agent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent de service créé avec succès');
      expect(response.body.data.agent).toBeDefined();
      expect(response.body.data.agent.email).toBe(agentData.email);
      expect(response.body.data.agent.service).toBe(agentData.service);
      expect(response.body.data.agent.role).toBe('agent');
    });

    it('devrait refuser à un non-admin de créer un agent', async () => {
      // Créer un utilisateur citoyen
      const citizen = new User({
        fullName: 'Citizen Test',
        email: 'citizen@test.com',
        password: 'password123',
        role: 'citizen',
        isVerified: true
      });

      await citizen.save();

      // Générer un token pour le citoyen
      const citizenToken = tokenService.generateToken({
        sub: citizen._id,
        role: 'citizen',
        service: null
      });

      const agentData = {
        fullName: 'Unauthorized Agent',
        email: 'unauthorized@test.com',
        service: 'Police'
      };

      const response = await request(app)
        .post('/admin/create-agent')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(agentData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Accès interdit');
    });
  });
});
