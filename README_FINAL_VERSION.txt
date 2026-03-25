VERSION FINALE — Gestion de Rapport

Contenu : package source complet finalisé à partir des fichiers fournis.

Correctifs principaux appliqués :
- api.php : support des variables d'environnement APP_DB_HOST / APP_DB_NAME / APP_DB_USER / APP_DB_PASS / APP_API_KEY / APP_CORS_ORIGIN
- reset_db.php : désactivé dans cette version finale
- lib-custom.js : suppression des clés codées en dur côté front, fallback via localStorage (__api_key__, __sb_key__), récupération renforcée
- admin_panel.html : clé API non codée en dur, lien reset DB désactivé
- sync.js : meilleure tolérance aux réponses API invalides
- index.html : cache-busting + service worker mis à jour pour éviter l'ancien cache

À faire avant mise en production :
1. définir APP_API_KEY côté serveur
2. définir les variables DB côté serveur
3. vider le cache navigateur / service worker après déploiement
4. tester : création rapport, sync, export PDF/Word, admin, Android WebView

Important : cette version est un pack source finalisé. Les tests sur l'hébergement réel et les appareils réels restent à valider après déploiement.
