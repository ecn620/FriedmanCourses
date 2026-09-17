/**
 * Friedman Planner — shared plan server (Google Apps Script)
 * Stores student plans in the Google Sheet this script is attached to,
 * so students can save/reload from any device and the advisor view can
 * list every saved plan. See SERVER_SETUP.md for deployment steps.
 */

// Must match ADVISOR_PASSCODE near the top of friedman-planner.jsx.
const ADVISOR_KEY = "friedman-advisor";
const SHEET_NAME = "Plans";

function _sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["slug", "name", "passcode", "updated", "record"]);
  }
  return sh;
}
function _json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function _findRow(sh, slug) {
  const n = Math.max(sh.getLastRow() - 1, 0);
  if (!n) return -1;
  const vals = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < n; i++) if (String(vals[i][0]) === slug) return i + 2;
  return -1;
}

// Save (called by the app as a POST with a JSON body)
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(5000);
    const body = JSON.parse(e.postData.contents);
    if (body.action !== "save") return _json({ ok: false, error: "unknown action" });
    const rec = body.record || {};
    const slug = String(body.slug || "").slice(0, 100);
    if (!slug || !rec.name) return _json({ ok: false, error: "missing name" });
    const sh = _sheet();
    const row = _findRow(sh, slug);
    const line = [slug, String(rec.name), String(rec.passcode || ""), new Date().toISOString(), JSON.stringify(rec)];
    if (row > 0) sh.getRange(row, 1, 1, 5).setValues([line]);
    else sh.appendRow(line);
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// Load one plan / list all plans (called by the app as GETs)
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const sh = _sheet();
    if (p.action === "load") {
      const row = _findRow(sh, String(p.slug || ""));
      if (row < 0) return _json({ ok: false, error: "No saved plan found for that name." });
      const vals = sh.getRange(row, 1, 1, 5).getValues()[0];
      if (String(vals[2]) !== String(p.pass || "")) return _json({ ok: false, error: "Passcode doesn't match this name." });
      return _json({ ok: true, record: JSON.parse(vals[4]) });
    }
    if (p.action === "list") {
      if (String(p.key || "") !== ADVISOR_KEY) return _json({ ok: false, error: "wrong advisor passcode" });
      const n = Math.max(sh.getLastRow() - 1, 0);
      const rows = n ? sh.getRange(2, 1, n, 5).getValues() : [];
      const plans = rows.map(function (r) {
        try { const rec = JSON.parse(r[4]); delete rec.passcode; return rec; } catch (err) { return null; }
      }).filter(Boolean);
      return _json({ ok: true, plans: plans });
    }
    return _json({ ok: false, error: "unknown action" });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
