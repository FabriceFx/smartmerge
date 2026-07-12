/**
 * Initialise le cache pour une nouvelle campagne
 * @param {number} total 
 */
function initProgress(total) {
  const cache = CacheService.getUserCache();
  cache.put('campaign_progress', JSON.stringify({ current: 0, total: total, status: 'starting' }), 21600);
}

/**
 * Met à jour la progression dans le cache
 * @param {number} current 
 * @param {number} total 
 * @param {string} status 
 */
function updateProgress(current, total, status) {
  const cache = CacheService.getUserCache();
  cache.put('campaign_progress', JSON.stringify({ current, total, status }), 21600);
}

/**
 * Récupère la progression actuelle (appelé par le frontend via polling)
 * @returns {Object} 
 */
function getProgress() {
  const cache = CacheService.getUserCache();
  const data = cache.get('campaign_progress');
  if (data) {
    return JSON.parse(data);
  }
  return null;
}

/**
 * Nettoie le cache
 */
function clearProgress() {
  CacheService.getUserCache().remove('campaign_progress');
}
