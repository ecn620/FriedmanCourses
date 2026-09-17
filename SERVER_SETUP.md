# Friedman Planner — shared plan server setup (about 10 minutes, free)

## Why

The planner is a static site on GitHub Pages, which has no database. Until now,
"Save plan" wrote only to the browser's own storage, so a plan saved on one
computer could not be reloaded on another, and the advisor view only showed
plans saved in that same browser. (This is why "Example Student" / "Friedman"
works only in the browser where you created it — that plan exists only there.
After setup, open that browser once, load the plan, and hit Save again to push
it to the server.)

The fix: a tiny free backend made from a Google Sheet plus a Google Apps
Script. Students' plans are stored as rows in a sheet you own. No hosting, no
cost, no accounts for students.

## One-time setup

1. Go to https://sheets.google.com and create a new blank spreadsheet.
   Name it something like "Friedman Planner — saved plans".

2. In the sheet, open **Extensions → Apps Script**. Delete the placeholder
   code and paste in the full contents of `friedman-plan-server.gs`.

3. In the pasted code, check the line near the top:
   `const ADVISOR_KEY = "friedman-advisor";`
   It must match `ADVISOR_PASSCODE` near the top of `friedman-planner.jsx`.
   If you change one, change both.

4. Click **Deploy → New deployment**. Choose type **Web app** and set:
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy**, authorize when prompted, and copy the **Web app URL**
   (it looks like `https://script.google.com/macros/s/XXXX/exec`).

   "Anyone" here means anyone with the URL can call the save/load API — it
   does not expose your Google account or the rest of your Drive. Loading a
   plan still requires the student's name + passcode, and listing all plans
   requires the advisor passcode.

5. Open `index.html` in your repo and paste the URL into the marked line:
   `window.FRIEDMAN_SYNC_URL = "https://script.google.com/macros/s/XXXX/exec";`
   Commit and push. That's it — no rebuild of `app.js` needed, since the app
   reads the URL from `index.html` at load time.

## What changes once the URL is set

- **Save plan** writes to the shared sheet (and keeps a local copy). Students
  can reload from any browser or device with their name + passcode.
- **Load** checks the server first, then falls back to the browser's copy.
- **Advisor view** lists every plan on the server, merged with any saved in
  your own browser; the newest copy of each student wins. Each row in your
  Google Sheet is one student's latest plan, so you also have a spreadsheet
  view of who has saved.

If the URL is left blank, everything behaves as before (per-browser saving),
and the app now says so explicitly next to the Save button.

## Updating the script later

If you edit the Apps Script, use **Deploy → Manage deployments → Edit →
Version: New version** so the same URL picks up the change. Creating a brand
new deployment generates a new URL, which would need pasting into
`index.html` again.

## Honest limits

This is convenience-level protection suited to course plans, not a secure
portal: passcodes are stored in your sheet in plain text and the API is
reachable by anyone with the URL. The app tells students to pick a throwaway
passcode and avoid sensitive information. If a student forgets their
passcode, you can read or edit it directly in the sheet.
