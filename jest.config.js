module.exports = {
  // Répertoire où Jest doit chercher les fichiers de test
  testMatch: ['**/tests/**/*.test.js'],

  // Environnement de test
  testEnvironment: 'node',

  // Couverture de code
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middlewares/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Timeout pour les tests
  testTimeout: 10000,

  // Affichage détaillé des tests
  verbose: true
};
