/**
 * Récupère les en-têtes de la feuille active
 * @returns {string[]} Tableau des noms d'en-têtes
 */
function getSheetHeaders() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  return data[0]; 
}

/**
 * Récupère la liste des destinataires pour la modale
 * @param {number} emailColIndex 
 * @returns {Object[]} Tableau d'objets destinataires
 */
function getRecipientsList(emailColIndex) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  let statusColIndex = headers.indexOf('Statut SmartMerge');
  const recipients = [];
  
  for (let i = 1; i < data.length; i++) {
    const email = data[i][emailColIndex];
    const status = statusColIndex !== -1 ? data[i][statusColIndex] : '';
    
    if (email && validateEmail(email) && status !== 'Envoyé') {
      recipients.push({
        index: i - 1,
        email: email
      });
    }
  }
  return recipients;
}

/**
 * Génère l'aperçu côté serveur pour assurer une cohérence stricte avec l'envoi réel
 * @param {number} rowIndex - Index de la ligne (0-based par rapport aux données)
 * @param {string} subjectTemplate 
 * @param {string} bodyTemplate 
 * @returns {Object} { subject, body }
 */
function getPreviewData(rowIndex, subjectTemplate, bodyTemplate, showUnsub) {
  const sheet = SpreadsheetApp.getActiveSheet();
  // +2 car rowIndex est 0-based et les données commencent ligne 2
  const row = sheet.getRange(rowIndex + 2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  let finalBody = mergeTemplate(bodyTemplate, row, headers);
  if (showUnsub) {
    finalBody += `<br><br><div style="font-size:11px;color:#999;text-align:center;"><a href="#" style="color:#999;text-decoration:underline;">Se désinscrire (Exemple)</a></div>`;
  }
  
  return {
    subject: mergeTemplate(subjectTemplate, row, headers),
    body: finalBody
  };
}

/**
 * Vérifie le nombre d'e-mails à envoyer et le quota restant (Legacy/Fallback)
 * @param {Object} config 
 * @returns {Object} { validCount: number, quota: number }
 */
function getPreflightInfo(config) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error("L'outil est déjà en cours d'utilisation.");

  try {
    let trackingWarning = null;
    if (config.tracking || config.unsubscribeLink) {
      try {
        const url = ScriptApp.getService().getUrl();
        if (!url || !url.endsWith('exec')) {
          trackingWarning = "Le script n'est pas encore publié en Application Web. Pour activer le tracking et le désabonnement, allez dans <b>Extensions > Apps Script > Déployer > Nouveau déploiement</b> (type: Application Web, accès: <b>Tout le monde</b>).";
        }
      } catch (e) {
        trackingWarning = "Impossible de lire l'URL de l'Application Web. Vérifiez votre déploiement dans Extensions > Apps Script.";
      }
    }

    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { validCount: 0, quota: 0, trackingWarning };
    
    const headers = data[0];
    let statusColIndex = headers.indexOf('Statut SmartMerge');
    
    let validCount = 0;
    const excludedRows = config.excludedRows || [];
    
    for (let i = 1; i < data.length; i++) {
      const emailAddress = data[i][config.emailColumnIndex];
      const status = statusColIndex !== -1 ? data[i][statusColIndex] : '';
      
      if (emailAddress && validateEmail(emailAddress) && status !== 'Envoyé' && !excludedRows.includes(i - 1)) {
        validCount++;
      }
    }
    
    const quota = MailApp.getRemainingDailyQuota();
    return { validCount, quota, trackingWarning };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Récupère la liste des e-mails blacklistés
 */
function getBlacklist() {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName('SmartMerge_Blacklist');
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const blacklist = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        blacklist.push({
          email: data[i][0].toString(),
          date: data[i][1] ? new Date(data[i][1]).toLocaleDateString() : 'Inconnue'
        });
      }
    }
    return blacklist;
  } catch (e) {
    return [];
  }
}

/**
 * Retire un e-mail de la liste rouge (avec accord RGPD de l'utilisateur)
 */
function removeFromBlacklist(email) {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName('SmartMerge_Blacklist');
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
        sheet.deleteRow(i + 1); // +1 because array is 0-indexed and sheet is 1-indexed
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Retourne les informations de quota du compte
 */
function getAccountQuota() {
  const email = Session.getActiveUser().getEmail();
  const quota = MailApp.getRemainingDailyQuota();
  
  const isPersonal = email.toLowerCase().endsWith('@gmail.com') || email.toLowerCase().endsWith('@googlemail.com');
  const type = isPersonal ? "Personnel" : "Workspace (Pro)";
  const max = isPersonal ? 100 : 1500;
  
  return {
    email: email,
    type: type,
    remaining: quota,
    max: max
  };
}

/**
 * Retourne des statistiques de campagne pour le Dashboard
 */
function getCampaignStats() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { sent: 0, opened: 0, total: 0 };
  
  const headers = data[0];
  const statusCol = headers.indexOf('Statut SmartMerge');
  const openCol = headers.indexOf('Date d\'ouverture');
  
  let sent = 0;
  let opened = 0;
  
  if (statusCol !== -1) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] === 'Envoyé') {
        sent++;
        if (openCol !== -1 && data[i][openCol] && data[i][openCol] !== '-') {
          opened++;
        }
      }
    }
  }
  
  return {
    sent: sent,
    opened: opened,
    total: data.length - 1
  };
}

/**
 * Crée un nouvel onglet avec des données de test
 */
function generateTestSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetName = "Test SmartMerge";
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  const testData = [
    ["Prénom", "Nom", "E-mail professionnel", "Entreprise", "Statut client"],
    ["Jean", "Dupont", Session.getActiveUser().getEmail(), "Acme Corp", "Actif"],
    ["Marie", "Curie", "marie.curie@example.com", "Science Labs", "Nouveau"],
    ["Claude", "Monet", "claude.monet@example.com", "Art Studio", "VIP"],
    ["Ada", "Lovelace", "ada.lovelace@example.com", "Tech Innovations", "Actif"]
  ];
  
  sheet.getRange(1, 1, testData.length, testData[0].length).setValues(testData);
  sheet.getRange(1, 1, 1, testData[0].length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, testData[0].length);
  
  ss.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert("Onglet de test généré avec succès !\\n\\nNote : La première ligne utilise votre propre adresse e-mail pour que vous puissiez tester l'envoi réel.");
}
