# 📧 SmartMerge — Publipostage Google Sheets

**SmartMerge** est un outil de publipostage professionnel intégré directement dans Google Sheets, développé en Google Apps Script. Il permet d'envoyer des campagnes d'e-mails personnalisés depuis votre compte Gmail ou Google Workspace, avec suivi des ouvertures, gestion des désinscriptions et vérification de conformité RGPD.

---

## ✨ Fonctionnalités

- **Publipostage intelligent** — Personnalisez chaque e-mail avec les variables `{{Colonne}}` de votre feuille Google Sheets
- **Éditeur WYSIWYG** — Rédigez vos messages en mode visuel (Quill) ou en HTML brut
- **Modèles sauvegardés** — Enregistrez et rechargez vos modèles d'e-mails en un clic
- **Aperçu en direct** — Visualisez l'e-mail fusionné avec les données réelles avant envoi
- **Suivi des ouvertures** — Pixel de tracking invisible pour mesurer les taux d'ouverture
- **Désinscription automatique** — Lien de désabonnement légal en un clic (RGPD)
- **Liste rouge globale** — Les adresses désinscrites sont bloquées pour tous les envois futurs
- **Vérificateur de conformité (Spam Checker)** — Détecte les risques avant envoi : mots toxiques, majuscules excessives, ratio image/texte, absence de désabonnement...
- **Gestion des quotas** — Adapte automatiquement la vitesse d'envoi selon le type de compte (Gmail : 100/j, Workspace : 1 500/j)
- **Tableau de bord** — Statistiques en temps réel (envoyés, ouverts, quotas restants)
- **Gestion multi-onglets** — Travaillez sur n'importe quel onglet de votre classeur

---

## 🚀 Installation

### Prérequis
- Un compte Google (Gmail ou Google Workspace)
- [Node.js](https://nodejs.org/) et [clasp](https://github.com/google/clasp) installés

```bash
npm install -g @google/clasp
clasp login
```

### Déploiement

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/FabriceFx/smartmerge.git
   cd smartmerge
   ```

2. Liez le projet à votre Google Apps Script :
   ```bash
   # Modifiez .clasp.json avec votre scriptId
   clasp push
   ```

3. Ouvrez votre Google Sheets → **Extensions > Apps Script** → **Déployer > Nouveau déploiement**
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde** *(indispensable pour le tracking et les désinscriptions)*

4. Acceptez les autorisations demandées par Google.

5. Dans Google Sheets, le menu **SmartMerge** apparaît en haut. Cliquez sur **🚀 Lancer l'outil**.

---

## 📋 Structure du projet

| Fichier | Rôle |
|---|---|
| `Menu.js` | Point d'entrée, création du menu Google Sheets |
| `Composer.html` | Interface de rédaction et d'envoi de campagne |
| `Sidebar.html` | Tableau de bord (statistiques, quota, liste rouge) |
| `EmailService.js` | Moteur d'envoi avec throttling adaptatif |
| `SheetService.js` | Lecture/écriture Google Sheets, preflight check |
| `TrackingService.js` | Web App : suivi ouvertures & désinscriptions |
| `TemplateService.js` | Sauvegarde et chargement des modèles |
| `ProgressService.js` | Suivi de progression en temps réel |
| `Utils.js` | Fonctions utilitaires (fusion, validation email) |
| `Guide.html` | Manuel d'utilisation intégré |
| `About.html` | Page À propos |

---

## ⚖️ Conformité RGPD & Anti-Spam

SmartMerge intègre un vérificateur de conformité actif qui analyse votre campagne avant chaque envoi :

- ✅ Présence du lien de désabonnement
- ✅ Identité de l'expéditeur renseignée
- ✅ Détection des mots "toxiques" (gratuit, urgent, offre spéciale...)
- ✅ Abus de majuscules dans l'objet
- ✅ Ratio texte/image équilibré

> **Important :** En B2C (particuliers), le consentement préalable (opt-in) est obligatoire. En B2B (professionnels), l'opt-out est toléré si l'offre est liée à leur activité.

---

## 📊 Quotas d'envoi Google

| Type de compte | Emails / jour | Délai entre envois |
|---|---|---|
| Gmail (`@gmail.com`) | 100 | 2 secondes |
| Google Workspace (domaine pro) | 1 500 | 0,5 seconde |

---

## 📄 Licence

MIT — Libre d'utilisation, de modification et de distribution.

---

*Développé avec ❤️ pour simplifier le publipostage professionnel dans l'écosystème Google.*
