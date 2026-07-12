/**
 * Sauvegarde un modèle d'e-mail pour l'utilisateur actif
 * Utilise une clé par modèle pour éviter la limite de 9Ko
 * @param {string} name - Nom du modèle
 * @param {Object} data - { subject, body }
 */
function saveTemplate(name, data) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(`template_${name}`, JSON.stringify(data));
  return getTemplates();
}

/**
 * Récupère tous les modèles sauvegardés
 * @returns {Object} Dictionnaire des modèles
 */
function getTemplates() {
  const props = PropertiesService.getUserProperties();
  const allProps = props.getProperties();
  const templates = {};
  
  for (const key in allProps) {
    if (key.startsWith('template_')) {
      const name = key.replace('template_', '');
      try {
        templates[name] = JSON.parse(allProps[key]);
      } catch (e) {
        console.error("Erreur parsing template", key);
      }
    }
  }
  return templates;
}

/**
 * Supprime un modèle
 * @param {string} name 
 */
function deleteTemplate(name) {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(`template_${name}`);
  return getTemplates();
}
