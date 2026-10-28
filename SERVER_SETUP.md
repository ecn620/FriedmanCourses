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

3. Select **setup** in the function menu at the top of the editor and click
   **Run** (authorize when prompted). This creates the Advisors and Config tabs
   and logs the **faculty setup code** (also in cell B1 of the Config tab).

4. Click **Deploy → New deployment**. Choose type **Web app** and set:
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy**, authorize when prompted, and copy the **Web app URL**
   (it looks like `https://script.google.com/macros/s/XXXX/exec`).

   "Anyone" here means anyone with the URL can call the save/load API — it
   does not expose your Google account or the rest of your Drive. Loading a
   plan requires the student's name + passcode, and listing plans requires
   an advisor password.

5. Open `index.html` in your repo and paste the URL into the marked line:
   `window.FRIEDMAN_SYNC_URL = "https://script.google.com/macros/s/XXXX/exec";`
   Commit and push. That's it — no rebuild of `app.js` needed, since the app
   reads the URL from `index.html` at load time.

## What changes once the URL is set

- **Save plan** writes to the shared sheet (and keeps a local copy). Students
  can reload from any browser or device with their name + passcode.
- **Load** checks the server first, then falls back to the browser's copy.
- **Advisor view** asks each advisor to pick their name and log in with their
  own password, then lists only the plans of students who selected them.
  Each row in the Plans tab is one student's latest plan; the advisor column
  shows who it belongs to.

## Advisors

- The advisor list lives in `ADVISORS` at the top of both
  `friedman-planner.jsx` and `friedman-plan-server.gs`. Keep the ids in sync.
  To add an advisor, add them to both, rebuild `app.js`, and redeploy the
  script as a new version.
- Each advisor creates their own password in the app (Advisor view, "Create
  my password"). They need the faculty setup code from the Config tab. Send
  it privately; don't post it anywhere public.
- The sheet stores only a salted hash of each advisor password, so nobody can
  read it back.
- To reset a forgotten password, clear that advisor's `password_hash` and
  `salt` cells in the Advisors tab. They can then create a new one.
- To change the setup code, edit Config!B1 (or clear it and a new one is
  generated).
- Plans saved before advisors existed belong to `DEFAULT_ADVISOR`
  (Erin). A student can switch advisors at any time by saving again.
- A saved plan can only be overwritten with its passcode, so one student
  can't overwrite another by typing the same name.

If the URL is left blank, everything behaves as before (per-browser saving),
and the app now says so explicitly next to the Save button.

## Updating the script later

If you edit the Apps Script, use **Deploy → Manage deployments → Edit →
Version: New version** so the same URL picks up the change. Creating a brand
new deployment generates a new URL, which would need pasting into
`index.html` again.

## Honest limits

This is convenience-level protection suited to course plans, not a secure
portal: student passcodes are stored in your sheet in plain text, the sheet
owner can see every advisor's students, and the API is reachable by anyone
with the URL. The app tells students to pick a throwaway
passcode and avoid sensitive information. If a student forgets their
passcode, you can read or edit it directly in the sheet.
