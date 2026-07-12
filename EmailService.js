/**
 * Envoie un e-mail de test à l'utilisateur actif
 * @param {Object} config 
 */
function sendTestEmail(config) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) throw new Error("La feuille ne contient pas de données pour générer un test.");
  
  const headers = data[0];
  const testRow = data[1]; // Prendre la première ligne de données
  const activeUserEmail = Session.getActiveUser().getEmail();
  
  // Dans la V4, config.body contient du HTML généré par Quill
  const finalSubject = mergeTemplate(config.subject, testRow, headers);
  const finalBody = mergeTemplate(config.body, testRow, headers);
  
  GmailApp.sendEmail(activeUserEmail, `[TEST] ${finalSubject}`, '', {
    htmlBody: finalBody,
    name: 'Mon SmartMerge (Test)'
  });
  
  return { success: true, message: `E-mail de test envoyé à ${activeUserEmail}` };
}

/**
 * Fonction principale d'envoi d'e-mails (traitement par lots avec progression)
 * @param {Object} config - { subject, body, emailColumnIndex, excludedRows (array of indexes) }
 */
function sendEmails(config) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) {
    throw new Error("Une campagne est déjà en cours d'envoi. Veuillez patienter.");
  }

  const startTime = Date.now();
  const TIMEOUT_LIMIT = 270000; // 4 minutes et 30 secondes en millisecondes

  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    if (data.length < 2) {
      throw new Error("La feuille ne contient pas de données.");
    }
    
    // Vérification de la web app et des quotas
    let webAppUrl = null;
    if (config.tracking || config.unsubscribeLink) {
      try { webAppUrl = ScriptApp.getService().getUrl(); } catch(e) {}
    }
    const quota = MailApp.getRemainingDailyQuota();
    const activeUserEmail = Session.getActiveUser().getEmail().toLowerCase();
    const isPersonal = activeUserEmail.endsWith('@gmail.com') || activeUserEmail.endsWith('@googlemail.com');
    const throttlingDelay = isPersonal ? 2000 : 500;
    
    // On trouve ou crée les colonnes de suivi
    let statusColIndex = headers.indexOf('Statut SmartMerge');
    let openColIndex = headers.indexOf('Date d\'ouverture');
    let idColIndex = headers.indexOf('ID Tracking');
    
    // S'assurer que les colonnes existent
    if (statusColIndex === -1) {
      statusColIndex = headers.length;
      sheet.getRange(1, statusColIndex + 1).setValue('Statut SmartMerge');
      headers.push('Statut SmartMerge');
    }
    let unsubColIndex = headers.indexOf('Statut Désinscription');
    if (unsubColIndex === -1) {
      unsubColIndex = headers.length;
      sheet.getRange(1, unsubColIndex + 1).setValue('Statut Désinscription');
      headers.push('Statut Désinscription');
    }
    if (openColIndex === -1) {
      openColIndex = headers.length;
      sheet.getRange(1, openColIndex + 1).setValue('Date d\'ouverture');
      headers.push('Date d\'ouverture');
    }
    if (idColIndex === -1) {
      idColIndex = headers.length;
      sheet.getRange(1, idColIndex + 1).setValue('ID Tracking');
      headers.push('ID Tracking');
    }
    
    let emailsSent = 0;
    let timeOutReached = false;
    const numDataRows = data.length - 1;
    let processedRows = numDataRows;
    const excludedRows = config.excludedRows || [];
    
    // Tableaux pour le batch update
    const statusUpdates = new Array(numDataRows);
    const openUpdates = new Array(numDataRows);
    const idUpdates = new Array(numDataRows);
    
    // Charger la liste rouge globale
    let globalBlacklist = [];
    const doc = sheet.getParent();
    const blacklistSheet = doc.getSheetByName('SmartMerge_Blacklist');
    if (blacklistSheet) {
      const blData = blacklistSheet.getDataRange().getValues();
      for (let i = 1; i < blData.length; i++) {
        if (blData[i][0]) globalBlacklist.push(blData[i][0].toString().toLowerCase().trim());
      }
    }
    
    // Initialiser la progression (on compte combien on va réellement traiter)
    let totalTarget = 0;
    for (let i = 1; i < data.length; i++) {
      const emailAddress = data[i][config.emailColumnIndex];
      const status = data[i][statusColIndex] || '';
      const unsub = data[i][unsubColIndex] || '';
      const isBlacklisted = emailAddress ? globalBlacklist.includes(emailAddress.toString().toLowerCase().trim()) : false;
      if (emailAddress && validateEmail(emailAddress) && status !== 'Envoyé' && unsub !== 'Désinscrit' && !isBlacklisted && !excludedRows.includes(i - 1)) {
        totalTarget++;
      }
    }
    
    initProgress(totalTarget);
    
    for (let i = 1; i < data.length; i++) {
      const arrayIndex = i - 1;
      
      // Check timeout en premier
      if (Date.now() - startTime > TIMEOUT_LIMIT) {
        timeOutReached = true;
        processedRows = arrayIndex;
        break;
      }

      const row = data[i];
      const emailAddress = row[config.emailColumnIndex];
      
      // Initialiser les valeurs existantes
      statusUpdates[arrayIndex] = [row[statusColIndex] || ''];
      openUpdates[arrayIndex] = [row[openColIndex] || ''];
      idUpdates[arrayIndex] = [row[idColIndex] || ''];
      
      // Exclusion manuelle depuis la modal ou désinscrit
      const unsubStatus = row[unsubColIndex] || '';
      const isBlacklisted = emailAddress ? globalBlacklist.includes(emailAddress.toString().toLowerCase().trim()) : false;
      
      if (excludedRows.includes(arrayIndex) || unsubStatus === 'Désinscrit' || isBlacklisted) {
        if (isBlacklisted && statusUpdates[arrayIndex][0] !== 'Désinscrit (Liste rouge)') {
           statusUpdates[arrayIndex] = ['Désinscrit (Liste rouge)'];
        }
        continue;
      }
      
      // Si l'e-mail est vide, invalide ou déjà envoyé
      if (!emailAddress || statusUpdates[arrayIndex][0] === 'Envoyé') {
        continue;
      }
      
      if (!validateEmail(emailAddress)) {
        statusUpdates[arrayIndex] = ['Erreur: E-mail invalide'];
        continue;
      }
      
      if (emailsSent >= quota) {
        statusUpdates[arrayIndex] = ['Erreur: Quota dépassé'];
        continue;
      }
      
      // Fusion (config.body contient du HTML WYSIWYG)
      const finalSubject = mergeTemplate(config.subject, row, headers);
      const finalBody = mergeTemplate(config.body, row, headers);
      
      // Tracking
      let trackingId = row[idColIndex];
      if (!trackingId) {
        trackingId = Utilities.getUuid();
      }
      
      // Injection du pixel de tracking uniquement si activé dans config
      if (config.tracking && webAppUrl && webAppUrl.length > 0 && webAppUrl.endsWith("exec")) {
         const pixelUrl = `${webAppUrl}?action=track&id=${trackingId}&tab=${encodeURIComponent(sheet.getName())}`;
         htmlBody = finalBody + `<br><img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;
      } else {
         htmlBody = finalBody;
      }
      
      // Injection du lien de désinscription
      if (config.unsubscribeLink && webAppUrl && webAppUrl.length > 0 && webAppUrl.endsWith("exec")) {
         const unsubUrl = `${webAppUrl}?action=unsubscribe&id=${trackingId}&tab=${encodeURIComponent(sheet.getName())}&email=${encodeURIComponent(emailAddress)}`;
         htmlBody += `<br><br><div style="font-size:11px;color:#999;text-align:center;"><a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Se désinscrire</a></div>`;
      }
      
      const emailOptions = {
        htmlBody: htmlBody
      };
      if (config.senderName) {
        emailOptions.name = config.senderName;
      } else {
        emailOptions.name = 'SmartMerge';
      }
      if (config.noReply) {
        emailOptions.noReply = true;
      }

      try {
        GmailApp.sendEmail(emailAddress, finalSubject, '', emailOptions);
        
        statusUpdates[arrayIndex] = ['Envoyé'];
        openUpdates[arrayIndex] = ['-'];
        idUpdates[arrayIndex] = [trackingId];
        
        emailsSent++;
        
        // Délai anti-spam (Throttling) adaptatif
        Utilities.sleep(throttlingDelay);
        
        // Mettre à jour le cache toutes les 5 itérations ou à la fin
        if (emailsSent % 5 === 0 || emailsSent === totalTarget) {
          updateProgress(emailsSent, totalTarget, 'Envoi en cours...');
        }
        
      } catch (e) {
        statusUpdates[arrayIndex] = ['Erreur: ' + e.message];
      }
    }
    
    // Batch updates to the sheet
    if (processedRows > 0) {
      sheet.getRange(2, statusColIndex + 1, processedRows, 1).setValues(statusUpdates.slice(0, processedRows));
      sheet.getRange(2, openColIndex + 1, processedRows, 1).setValues(openUpdates.slice(0, processedRows));
      sheet.getRange(2, idColIndex + 1, processedRows, 1).setValues(idUpdates.slice(0, processedRows));
    }
    
    updateProgress(emailsSent, totalTarget, 'Terminé');
    
    if (timeOutReached) {
       return { 
         success: true, 
         message: `${emailsSent} e-mail(s) envoyé(s). ⚠️ L'envoi s'est mis en pause (limite de temps Google approchée). Relancez l'outil pour envoyer la suite.` 
       };
    }
    
    if (emailsSent === 0) {
      return { success: false, message: "Aucun e-mail n'a été envoyé (vérifiez les e-mails ou les quotas)." };
    }
    
    return { success: true, message: `${emailsSent} e-mail(s) envoyé(s) avec succès !` };
    
  } finally {
    lock.releaseLock();
  }
}
