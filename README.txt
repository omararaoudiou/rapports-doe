# Package site آماده / Site package

Ce package contient une version consolidée des fichiers fournis.

Modifications appliquées :
- activation du zoom mobile dans `index.html`
- activation du zoom WebView dans `MainActivity.kt`
- déplacement des pages d'administration dans `adm5671/`
- création du dossier `templates/` pour les JSON attendus par `templates.js`
- ajout des templates Word officiels dans `templates_word_officiels/`

Points à vérifier côté intégration finale :
- les exports Word identiques aux modèles officiels nécessitent encore le raccordement complet des placeholders et du moteur DOCX
- les rapports Cradlepoint doivent encore masquer dynamiquement les sections non utilisées lors de l'export
- la ligne "Instant T" colorée doit encore être raccordée dans la génération Word et/ou PDF
