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

/**
 * Envoie un e-mail avec mécanisme de relance (Exponential Backoff)
 * En cas de micro-coupure Google, retente automatiquement jusqu'à maxRetries fois.
 * Délais : 2s → 4s → 8s...
 * @param {string} emailAddress 
 * @param {string} subject 
 * @param {string} body 
 * @param {Object} options 
 * @param {number} maxRetries 
 */
function sendEmailWithRetry(emailAddress, subject, body, options, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      GmailApp.sendEmail(emailAddress, subject, body, options);
      return; // Succès
    } catch (e) {
      attempt++;
      if (attempt >= maxRetries) throw e; // Échec définitif après tous les essais
      Utilities.sleep(Math.pow(2, attempt) * 1000); // Backoff : 2s, 4s, 8s...
    }
  }
}
