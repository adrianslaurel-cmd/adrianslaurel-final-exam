# SETUP COMMANDS — QR Attendance App

> **Target:** First-year students | **Expo SDK:** 54 | **Expo Go:** 54.0.8

---

## PREREQUISITES

| Tool | Download | Verify |
|---|---|---|
| Node.js (LTS) | https://nodejs.org/en | `node --version` |
| VS Code | https://code.visualstudio.com | (open it) |
| Expo Go 54.0.8 | Play Store → "Expo Go" | (version in app settings) |

---

## STEP 1 — Create the App

```powershell
cd D:\QR-ATT
npx create-expo-app@latest qr-att

# When prompted, select "SDK 54"
# Wait for npm install (~2 min)
```

---

## STEP 2 — Install Matching Versions

The default install may need these fixed versions that match Expo Go 54.0.8:

```powershell
npm install expo@~54.0.35 react@19.1.0 react-native@0.81.5 expo-router@~6.0.24 @expo/vector-icons@^15.0.3 expo-linking@~8.0.12 expo-constants@~18.0.13 expo-font@~14.0.12 expo-status-bar@~3.0.9 expo-splash-screen@~31.0.13 react-native-screens@~4.16.0 react-native-safe-area-context@~5.6.0 react-native-gesture-handler@~2.28.0 react-native-reanimated@~4.1.1 react-dom@19.1.0 react-native-web@~0.21.0 @types/react@~19.1.0 typescript@~5.9.2 --legacy-peer-deps
```

---

## STEP 3 — Start

```powershell
npx expo start
```

Scan QR code with Expo Go. Or press `W` for web.

---

## TROUBLESHOOTING

| Problem | Solution |
|---|---|
| npm install fails | Use `npm install --legacy-peer-deps` |
| App crashes in Expo Go | Make sure all versions match STEP 2 exactly |
| QR won't scan | Phone + computer on same WiFi |
| White screen | Wait 10s, or shake → Reload |
| TypeScript errors | Run `npx tsc --noEmit` |


---

# QR-ATT — Final Project (Part I) Setup

## 1. Environment
```powershell
copy .env.example .env      # then put your Supabase URL + ANON key (never the service-role key!)
npm install --legacy-peer-deps
npx expo start
```
`.env` is git-ignored. Only the **anon** key belongs in the app; Row Level Security protects the data.

## 2. Database
1. Supabase Dashboard -> **SQL Editor** -> paste all of `supabase/schema.sql` -> **Run** (safe to re-run, also upgrades the midterm schema).
2. Register one account in the app, then make it the first administrator (SQL Editor):
   ```sql
   update public.profiles set role = 'admin' where email = 'your.admin@school.edu';
   ```
3. (Optional, for quick testing) Authentication -> Providers -> Email -> turn **off** "Confirm email".

## 3. Roles
| Role | What they can do |
|---|---|
| Student | register/login, view profile, view open events, scan QR, see own attendance history |
| Teacher | create / edit / view / close events, show event QR, see attendance + summary of **own** events |
| Admin | everything above for **all** events, manage users (role, activate/deactivate), correct/delete attendance records, view overview + system records |

See `DEFENSE-NOTES.md` for the event-driven table, database relationships and security explanation.
