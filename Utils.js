/**
 * Échappe les caractères spéciaux pour l'utilisation dans une RegExp
 * @param {string} string 
 * @returns {string} La chaîne échappée
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valide le format d'une adresse e-mail
 * @param {string} email 
 * @returns {boolean}
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 * @param {string} str 
 * @returns {string} La chaîne échappée
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Fonction interne pour fusionner les variables d'une ligne dans un texte
 */
function mergeTemplate(template, row, headers) {
  let result = template;
  for (let j = 0; j < headers.length; j++) {
    const regex = new RegExp(`{{${escapeRegExp(String(headers[j]))}}}`, 'gi');
    let val = row[j] !== undefined ? row[j] : '';
    
    // Formatage des dates
    if (val instanceof Date) {
      val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    }
    
    // Échappement HTML avant insertion
    val = escapeHtml(val);
    
    result = result.replace(regex, val);
  }
  return result;
}
