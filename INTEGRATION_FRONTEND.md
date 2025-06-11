# Guide d'intégration du backend Citizen-Service avec le frontend Flutter Citoyen

Ce document explique comment intégrer le backend `citizen-service` avec l'application frontend Flutter `citoyen`.

## Table des matières

1. [Configuration du backend](#configuration-du-backend)
2. [Configuration du frontend](#configuration-du-frontend)
3. [Authentification](#authentification)
4. [Gestion des alertes](#gestion-des-alertes)
5. [Dépannage](#dépannage)

## Configuration du backend

### Prérequis

- Node.js (v14 ou supérieur)
- MongoDB (v4.4 ou supérieur)
- npm ou yarn

### Installation et démarrage

1. Assurez-vous que MongoDB est en cours d'exécution
2. Configurez les variables d'environnement dans le fichier `.env` :
   ```
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/bolle-auth
   JWT_SECRET=bolle-secret-key-change-in-production
   SERVICE_API_KEY=bolle-inter-service-secure-key-2025
   BACKEND_URL=http://localhost:3001
   ```

3. Installez les dépendances et démarrez le serveur :
   ```bash
   cd backend/citizen-service
   npm install
   npm run dev
   ```

4. Le serveur devrait maintenant être accessible à l'adresse `http://localhost:3001`

## Configuration du frontend

### Mise à jour des points d'API

Dans votre application Flutter, vous devez mettre à jour les points d'API pour qu'ils pointent vers le nouveau backend `citizen-service`.

1. Ouvrez le fichier de configuration de l'API dans votre projet Flutter :

```dart
// lib/core/api/api_constants.dart ou fichier similaire
class ApiConstants {
  // Remplacez l'ancienne URL par l'URL du nouveau backend
  static const String baseUrl = 'http://10.0.2.2:3001/api/';
  // Pour les appareils physiques, utilisez l'adresse IP de votre ordinateur
  // static const String baseUrl = 'http://192.168.1.X:3001/api/v1';
  
  // Points d'API
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String profile = '/auth/profile';
  static const String alerts = '/alerts';
  // ... autres points d'API
}
```

> **Note** : `10.0.2.2` est l'adresse spéciale qui permet à l'émulateur Android d'accéder à l'hôte local (localhost) de votre machine.

### Configuration des modèles de données

Assurez-vous que vos modèles de données dans Flutter correspondent aux modèles utilisés par le backend `citizen-service`.

## Authentification

Le backend `citizen-service` prend en charge l'authentification flexible avec email ou numéro de téléphone. Voici comment l'intégrer :

### Inscription

```dart
Future<void> register({
  required String fullName,
  String? email,
  String? phone,
  required String password,
  required String confirmPassword,
}) async {
  // Vérifier qu'au moins un email ou un numéro de téléphone est fourni
  if (email == null && phone == null) {
    throw Exception('Veuillez fournir un email ou un numéro de téléphone');
  }
  
  final response = await http.post(
    Uri.parse('${ApiConstants.baseUrl}${ApiConstants.register}'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'fullName': fullName,
      'email': email,
      'phone': phone,
      'password': password,
      'confirmPassword': confirmPassword,
    }),
  );
  
  if (response.statusCode == 201) {
    // Inscription réussie
    final data = jsonDecode(response.body);
    // Stocker le token JWT
    await _saveToken(data['data']['tokens']['access']['token']);
    return data['data']['user'];
  } else {
    // Gérer les erreurs
    final error = jsonDecode(response.body);
    throw Exception(error['message'] ?? 'Erreur lors de l\'inscription');
  }
}
```

### Connexion

```dart
Future<void> login({
  String? email,
  String? phone,
  required String password,
}) async {
  // Vérifier qu'au moins un email ou un numéro de téléphone est fourni
  if (email == null && phone == null) {
    throw Exception('Veuillez fournir un email ou un numéro de téléphone');
  }
  
  final response = await http.post(
    Uri.parse('${ApiConstants.baseUrl}${ApiConstants.login}'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'email': email,
      'phone': phone,
      'password': password,
    }),
  );
  
  if (response.statusCode == 200) {
    // Connexion réussie
    final data = jsonDecode(response.body);
    // Stocker le token JWT
    await _saveToken(data['data']['tokens']['access']['token']);
    return data['data']['user'];
  } else {
    // Gérer les erreurs
    final error = jsonDecode(response.body);
    throw Exception(error['message'] ?? 'Erreur lors de la connexion');
  }
}
```

### Stockage du token JWT

```dart
Future<void> _saveToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', token);
}

Future<String?> getToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('auth_token');
}
```

### Ajout d'un intercepteur HTTP pour les requêtes authentifiées

```dart
class AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  }
}

// Utilisation avec Dio
final dio = Dio();
dio.interceptors.add(AuthInterceptor());
```

## Gestion des alertes

### Création d'une alerte

```dart
Future<void> createAlert({
  required String category,
  required String title,
  required String description,
  required bool isAnonymous,
  required String priority,
  required Map<String, dynamic> location,
  required List<Map<String, dynamic>> attachments,
}) async {
  final response = await dio.post(
    '${ApiConstants.baseUrl}${ApiConstants.alerts}',
    data: {
      'category': category,
      'title': title,
      'description': description,
      'isAnonymous': isAnonymous,
      'priority': priority,
      'location': location,
      'attachments': attachments,
    },
  );
  
  if (response.statusCode == 201) {
    return response.data['data']['alert'];
  } else {
    throw Exception('Erreur lors de la création de l\'alerte');
  }
}
```

### Récupération des alertes

```dart
Future<List<dynamic>> getMyAlerts() async {
  final response = await dio.get(
    '${ApiConstants.baseUrl}${ApiConstants.alerts}/my',
  );
  
  if (response.statusCode == 200) {
    return response.data['data'];
  } else {
    throw Exception('Erreur lors de la récupération des alertes');
  }
}
```

### Récupération des alertes à proximité

```dart
Future<List<dynamic>> getAlertsNearby({
  required double latitude,
  required double longitude,
  double maxDistance = 5000, // en mètres
}) async {
  final response = await dio.get(
    '${ApiConstants.baseUrl}${ApiConstants.alerts}/nearby',
    queryParameters: {
      'lat': latitude,
      'lng': longitude,
      'maxDistance': maxDistance,
    },
  );
  
  if (response.statusCode == 200) {
    return response.data['data'];
  } else {
    throw Exception('Erreur lors de la récupération des alertes à proximité');
  }
}
```

## Dépannage

### Problèmes de connexion au backend

1. **Vérifiez que le serveur backend est en cours d'exécution**
   ```bash
   cd backend/citizen-service
   npm run dev
   ```

2. **Vérifiez l'URL du backend dans votre application Flutter**
   - Pour l'émulateur Android : `http://10.0.2.2:3001`
   - Pour un appareil physique : `http://VOTRE_IP_LOCALE:3001`

3. **Vérifiez les permissions réseau dans votre application Flutter**
   
   Dans `android/app/src/main/AndroidManifest.xml` :
   ```xml
   <manifest ...>
     <uses-permission android:name="android.permission.INTERNET" />
     <!-- autres permissions -->
   </manifest>
   ```

### Problèmes d'authentification

1. **Vérifiez que vous envoyez les bonnes informations d'identification**
   - Email ou numéro de téléphone
   - Mot de passe correct

2. **Vérifiez que le token JWT est correctement stocké et utilisé**
   - Utilisez un intercepteur HTTP pour ajouter automatiquement le token à chaque requête

3. **Vérifiez les logs du serveur pour plus de détails sur les erreurs**

### Problèmes de création d'alertes

1. **Vérifiez que vous êtes bien authentifié**
   - Le token JWT doit être valide et inclus dans les en-têtes de la requête

2. **Vérifiez que vous envoyez toutes les informations requises**
   - Catégorie, titre, description, localisation, etc.

3. **Vérifiez le format des coordonnées de localisation**
   - Le format GeoJSON est attendu : `{ "type": "Point", "coordinates": [longitude, latitude] }`
   - Notez que l'ordre est [longitude, latitude] et non [latitude, longitude]

---

Pour toute question ou problème supplémentaire, veuillez consulter la documentation du backend ou contacter l'équipe de développement.
