// MyQuest Leads: Google Apps Script web app that adds each website enquiry to this sheet.
// Setup steps are in integrations/README.md. Paste this whole file into Extensions > Apps Script.

const STAGES = ['New enquiry', 'Replied', 'Visit booked', 'Proposal sent', 'Following up', 'Won', 'Lost'];
const COLOURS = {
  'Office': '#3F51B5', 'Retail': '#F4511E', 'Medical': '#D50000', 'Home': '#F6BF26',
  'NDIS / DVA': '#8E24AA', 'Builder’s clean': '#039BE5', 'Other': '#E67C73',
};

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'Invalid JSON' });
  }
  const secret = PropertiesService.getScriptProperties().getProperty('LEADS_SECRET');
  if (!secret || data.secret !== secret) return reply({ ok: false, error: 'Unauthorised' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheets()[0];
    const row = [
      Utilities.formatDate(new Date(), 'Australia/Brisbane', 'yyyy-MM-dd HH:mm'),
      'New enquiry',
      data.space_type, data.biz_name, data.contact_name, data.mobile, data.email,
      data.address, data.suburb, data.clean_type, data.sqm_range, data.frequency,
      data.kitchen, data.bathrooms, data.estimate, data.preferred_date, data.preferred_time,
      data.preferred_days, data.heard, data.came_from, data.landing, data.notes,
    ].map(safe);
    sheet.appendRow(row);
    const r = sheet.getLastRow();
    sheet.getRange(r, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STAGES, true).build());
    const colour = COLOURS[data.space_type];
    if (colour) sheet.getRange(r, 3).setBackground(colour).setFontColor(colour === '#F6BF26' ? '#000000' : '#ffffff').setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

// Text typed into the website must never run as a spreadsheet formula.
function safe(value) {
  const s = value == null ? '' : String(value).slice(0, 1000);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
