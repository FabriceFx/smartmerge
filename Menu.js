/**
 * Événement déclenché à l'ouverture du Google Sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SmartMerge')
    .addItem('🚀 Tableau de bord', 'openSidebar')
    .addItem('✏️ Nouveau message', 'openComposer')
    .addSeparator()
    .addItem('🧪 Générer données de test', 'generateTestSheet')
    .addItem('📖 Guide d\'utilisation', 'openGuide')
    .addSeparator()
    .addItem('ℹ️ À propos', 'openAbout')
    .addToUi();
}

/**
 * Ouvre la barre latérale (Tableau de bord)
 */
function openSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SmartMerge')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Ouvre le guide d'utilisation
 */
function openGuide() {
  const html = HtmlService.createHtmlOutputFromFile('Guide')
    .setWidth(750)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, "Guide d'utilisation");
}

/**
 * Ouvre la boîte de dialogue modale pour la rédaction
 */
function openComposer() {
  const html = HtmlService.createHtmlOutputFromFile('Composer')
    .setWidth(1000)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Préparation de la campagne');
}

/**
 * Ouvre la boîte de dialogue "À propos"
 */
function openAbout() {
  const html = HtmlService.createHtmlOutputFromFile('About')
    .setWidth(350)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'À propos de SmartMerge');
}
