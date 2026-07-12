/**
 * Fonction déclenchée par l'appel de l'URL de la Web App (pixel de suivi et désinscription)
 * Utilise getActiveSpreadsheet pour sécuriser l'accès (confiné au fichier hôte).
 * @param {Object} e - Paramètres de la requête HTTP
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'ping') {
    return ContentService.createTextOutput("pong");
  }
  
  const trackingId = e.parameter.id;
  const tabName = e.parameter.tab;
  
  if (!action || !trackingId || !tabName) {
    return ContentService.createTextOutput("Paramètres manquants.");
  }
  
  try {
    const docId = e.parameter.docId;
    const doc = docId
      ? SpreadsheetApp.openById(docId)
      : SpreadsheetApp.getActiveSpreadsheet(); // Fallback pour compatibilité
    if (!doc) throw new Error("Document non lié.");
    
    const sheet = doc.getSheetByName(tabName);
    
    if (sheet) {
      const numRows = sheet.getLastRow();
      const numCols = sheet.getLastColumn();
      
      if (numRows > 1) {
        const headers = sheet.getRange(1, 1, 1, numCols).getValues()[0];
        const idColIndex = headers.indexOf('ID Tracking');
        
        if (idColIndex !== -1) {
          const idData = sheet.getRange(2, idColIndex + 1, numRows - 1, 1).getValues();
          
          // Recherche optimisée avec findIndex
          const flatIds = idData.map(row => row[0]);
          const found = flatIds.findIndex(id => id === trackingId);
          const targetRowIndex = found !== -1 ? found + 2 : -1;
          
          if (targetRowIndex !== -1) {
            
            // LOGIQUE DE DÉSINCRIPTION
            if (action === 'unsubscribe') {
              const unsubColIndex = headers.indexOf('Statut Désinscription');
              if (unsubColIndex !== -1) {
                sheet.getRange(targetRowIndex, unsubColIndex + 1).setValue('Désinscrit');
                
                // Ajouter à la Blacklist globale
                const emailToBlacklist = e.parameter.email;
                if (emailToBlacklist) {
                  let blacklistSheet = doc.getSheetByName('SmartMerge_Blacklist');
                  if (!blacklistSheet) {
                    blacklistSheet = doc.insertSheet('SmartMerge_Blacklist');
                    blacklistSheet.hideSheet();
                    blacklistSheet.appendRow(['Email', 'Date de désinscription']);
                    blacklistSheet.getRange('A1:B1').setFontWeight('bold');
                  }
                  blacklistSheet.appendRow([emailToBlacklist.toString().toLowerCase().trim(), new Date()]);
                }
                
                return renderHtmlMessage("Vous avez été désinscrit avec succès. Vous ne recevrez plus de messages de notre part.", true);
              } else {
                return renderHtmlMessage("Impossible de vous désinscrire (colonne introuvable).", false);
              }
            }
            
            // LOGIQUE DE TRACKING (Ouverture)
            if (action === 'track') {
              const openColIndex = headers.indexOf('Date d\'ouverture');
              if (openColIndex !== -1) {
                const openRange = sheet.getRange(targetRowIndex, openColIndex + 1);
                const currentVal = openRange.getValue();
                
                if (currentVal === '-' || currentVal === '') {
                  const currentDate = new Date();
                  openRange.setValue(currentDate);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Erreur WebApp", err);
  }
  
  // Si c'est une désinscription qui a échoué (ou catch)
  if (action === 'unsubscribe') {
    return renderHtmlMessage("Une erreur est survenue lors de la désinscription. Veuillez contacter l'expéditeur.", false);
  }
  
  // Par défaut, pour le tracking, on renvoie un GIF transparent de 1x1 pixel
  const base64Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return ContentService.createTextOutput(Utilities.base64Decode(base64Gif))
    .setMimeType(ContentService.MimeType.GIF);
}

/**
 * Affiche une page web propre pour la confirmation de désinscription
 */
function renderHtmlMessage(message, success) {
  const color = success ? '#0f9d58' : '#d23f31';
  const icon = success ? 'check_circle' : 'error';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Désinscription</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <style>
          body { font-family: 'Roboto', sans-serif; background-color: #f8fafd; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #1f1f1f; }
          .card { background: white; padding: 40px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border: 1px solid #e1e2e8; }
          h2 { color: ${color}; margin-top: 16px; margin-bottom: 8px; font-weight: 500; }
          p { color: #44474e; line-height: 1.5; margin: 0; font-size: 15px; }
          .material-symbols-outlined { font-size: 48px; color: ${color}; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="material-symbols-outlined">${icon}</span>
          <h2>${success ? 'Désinscription confirmée' : 'Erreur'}</h2>
          <p>${message}</p>
        </div>
      </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html);
}
