# DeltaSnap PWA (Firebase RTDB)

This folder contains a minimal installable web app for DeltaSnap.

## 1) Edit config
Open `public/config.json` and set your Firebase Web config. At minimum these keys work for RTDB + Anonymous Auth:
- `apiKey`
- `databaseURL`

Optionally add `authDomain`, `projectId`, `appId` if you have them.

`defaultUnit` is used when the URL has no `?unit=` param.

## 2) RTDB Rules
In Firebase Console → Realtime Database → Rules:
```
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
Ensure Anonymous sign-in is enabled under Authentication → Sign-in method.

## 3) Deploy (Firebase Hosting)
```
firebase login
firebase init hosting   # choose your deltasnap project
firebase deploy
```
Then open: `https://<your-site>/?unit=Home-56TS`

## 4) Firmware path expectation
Device writes:
- `units/{UNIT_ID}/latest` with fields `{ supply, return, delta, status, ts }`
- `units/{UNIT_ID}/logs/{timestampKey}` → same fields per row

