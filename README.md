# RESQ — Emergency Response App

Multi-tenant emergency dispatch platform. Super admin manages institutions;
institution admins manage responders; responders claim & resolve emergencies;
users trigger emergencies and get live AI first-response guidance.

## Repo structure
```
resq-app/
├── mobile/             # React Native (Expo) app — users, responders, offline USSD companion
├── admin-dashboard/     # Next.js — super admin + institution admin web dashboards
├── supabase/
│   └── schema.sql       # Full DB schema + RLS policies (single DB, tenant-isolated)
└── docs/                # Architecture notes, roadmap, decisions log
```

## Day 1 setup — things ONLY you can do (needs your login)

### 1. GitHub
1. Go to https://github.com/new
2. Repo name: `resq-app`, visibility: **Private**
3. Do NOT initialize with README (we already have one)
4. Copy the repo URL — paste it back to me and I'll give you the exact
   `git init` / `git remote add` / `git push` commands for this folder.

### 2. Supabase
1. Go to https://supabase.com → New Project (free tier)
2. Project name: `resq-app`, choose a strong DB password (save it somewhere safe)
3. Once created, go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
4. Go to **Project Settings → API** → copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this SECRET — server-side only, never in the mobile app)
5. Paste those three values back to me (the anon key is safe to share here; treat the
   service_role key as a password — I'll tell you exactly where it goes, never in chat if you prefer)

### 3. Firebase
1. Go to https://console.firebase.google.com → Add project → name it `resq-app`
2. Enable **Cloud Messaging** (for push/critical alerts)
3. Project Settings → General → add an Android app (package name we'll define together, e.g. `com.resq.app`)
4. Download `google-services.json` when prompted — you'll upload it to me later, don't post its contents in chat (treat as a secret)

### 4. (Later, not today) Africa's Talking
Free sandbox account for USSD/SMS — we'll set this up in the offline-mode phase.

## Day 2 — Auth flows (done)

**Run the new SQL:** Supabase → SQL Editor → paste `supabase/auth-functions.sql` → Run
(this must run *after* `schema.sql` from Day 1).

**How accounts get created:**
- Super admin (you) creates institutions AND their first institution_admin account together, via `POST /api/admin/create-institution`
- Institution admin logs in → enters the verification code once → institution goes `active`
- Institution admin will create responder accounts on Day 4 (same pattern, different route)
- Users self-signup freely on mobile → enter institution code once → linked to that institution

**Run the admin dashboard locally:**
```bash
cd admin-dashboard
npm install
npm run dev
```
Open http://localhost:3000 — it redirects to `/login`.

**Run the mobile app locally:**
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with the Expo Go app on your phone (install Expo Go from your app store first), or press `w` to run in a browser.

**Test the super admin institution-creation route** (until Day 3 builds a UI for it), using a tool like Postman, or curl:
```bash
curl -X POST http://localhost:3000/api/admin/create-institution \
  -H "Content-Type: application/json" \
  -d '{
    "institutionName": "Test Hospital",
    "contactEmail": "admin@testhospital.com",
    "adminFullName": "Jane Doe",
    "adminEmail": "jane@testhospital.com",
    "adminTempPassword": "TempPass123!"
  }'
```
The response includes the `institutionCode` and `verificationCode` — save these, you'll need the verification code to log in as that institution_admin and activate the institution.

## Day 3 — Real Super Admin Dashboard (done)

No more PowerShell scripts for creating institutions — there's a real UI now.

**What's new:**
- `/super-admin` — dashboard listing all institutions: status, subscription tier, both codes, and actions (suspend/reactivate, change tier, delete)
- `/super-admin/create` — a form to create a new institution + its first institution_admin account in one step
- The `create-institution` API route is now protected — it verifies the caller is actually logged in as super_admin before doing anything (previously anyone could call it)

**To use it:**
1. Log in at `/login` with your super_admin account
2. You'll land on `/super-admin` — click "+ New Institution"
3. Fill in the institution's details and its first admin's login details
4. Submit — you'll see the generated institution code and verification code to send to that institution

**Note:** the old `test-create-institution.ps1` script will now return "Not authorized" since the route requires a real super_admin session — that's expected, it's no longer needed now that the UI exists.

**You don't have a super_admin account yet** — until now we've only tested institution_admin. Let's create one directly in Supabase:
1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**
2. Enter your email + a password, check "Auto Confirm User"
3. After creation, go to **Table Editor** → `profiles` → find the row with your new user's `id`
4. Edit that row: set `role` to `super_admin`, leave `institution_id` blank
5. Log in at `/login` with that email/password — you should land on `/super-admin`

## Daily roadmap (compressed from weeks)

| Day | Focus |
|---|---|
| **Day 1** (today) | Repo scaffold, DB schema + RLS, Supabase/Firebase/GitHub accounts created |
| Day 2 | Auth flows: super admin, institution admin, responder, user + institution/verification codes |
| Day 3 | Super admin dashboard: add/remove institutions, subscriptions, verification codes |
| Day 4 | Institution admin dashboard: add responders, set shifts, notification routing |
| Day 5 | Responder app: view/claim emergencies, live location, chat |
| Day 6 | User app: emergency trigger button, live location share, AI advice engine |
| Day 7 | Siren/critical alert system (Android DND-override, call fallback), QR codes |
| Day 8 | USSD/SMS offline emergency path (Africa's Talking) |
| Day 9 | Testing, RLS hardening, edge cases |
| Day 10 | Deploy: Vercel (dashboards), EAS (mobile builds), final checks |

## Key architecture decisions (locked)
- **Mobile**: React Native + Expo (free tooling, one codebase, Android DND-override supported)
- **Database**: Single Supabase Postgres DB, tenant isolation via Row-Level Security (not separate DBs per institution)
- **Push/alerts**: Firebase Cloud Messaging
- **Offline path**: USSD + SMS via Africa's Talking (not literal SSD storage)
- **AI**: Claude API for user advice + responder instruction sanity-check
- **Hosting (free tier while building)**: Vercel (dashboards), Supabase (DB/auth/realtime), Firebase (push), EAS (mobile builds)

## Known platform limits to keep in mind
- iOS DND override requires Apple's **Critical Alerts** entitlement — a formal request to Apple, not automatic. Android has no such restriction.
- Browser tabs (laptop/desktop responder view) can alert loudly while open but can't override OS-level silent mode the way a native app can.
