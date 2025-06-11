/**
 * Fonction utilitaire pour gérer les erreurs asynchrones dans les contrôleurs
 * Évite d'avoir à utiliser try/catch dans chaque contrôleur
 * @param {Function} fn - Fonction asynchrone à exécuter
 * @returns {Function} - Middleware Express
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

module.exports = catchAsync;
