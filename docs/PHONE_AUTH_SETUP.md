# Phone Authentication Setup — Supabase Dashboard

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ VERIFIED | Confirmed via code/API |
| ⚠️ NOT VERIFIED | Cannot verify without dashboard access |
| 🔧 HUMAN CONFIGURATION REQUIRED | Must be done manually in Supabase Dashboard |

---

## Step 1 — Enable Phone Auth Provider

🔧 **HUMAN CONFIGURATION REQUIRED**

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your MediGo project.
3. Go to **Authentication → Providers**.
4. Find **Phone** in the provider list.
5. Toggle it to **Enabled**.
6. Click **Save**.

---

## Step 2 — Configure an SMS Provider

🔧 **HUMAN CONFIGURATION REQUIRED**

Supabase requires a third-party SMS provider to send OTP codes. It does **not** send SMS itself.

### Supported providers (as of mid-2025)

| Provider | Notes |
|---|---|
| **Twilio** | Recommended for India; strong A2P 10DLC / international support |
| **MessageBird** | Good India coverage |
| **Vonage (Nexmo)** | Global coverage |
| **Twilio Verify** | Supabase also has native Twilio Verify integration |

### Twilio configuration (recommended)

1. Create a Twilio account at [https://twilio.com](https://twilio.com).
2. Purchase a phone number or Messaging Service SID with India SMS support.
3. In Supabase Dashboard → **Authentication → Providers → Phone**:
   - **SMS Provider**: Select **Twilio**
   - **Twilio Account SID**: from Twilio Console
   - **Twilio Auth Token**: from Twilio Console
   - **Twilio Message Service SID** or **Twilio Phone Number**: your sending number
4. Click **Save**.

> ⚠️ Do NOT paste Twilio credentials into this file. They must be entered only in the Supabase Dashboard.

---

## Step 3 — Configure OTP Settings

🔧 **HUMAN CONFIGURATION REQUIRED**

In Supabase Dashboard → **Authentication → Providers → Phone**:

| Setting | Recommended Value | Notes |
|---|---|---|
| OTP Expiry | 300 seconds (5 min) | Balance security and UX |
| OTP Length | 6 digits | Standard; aligns with app implementation |

---

## Step 4 — Configure Rate Limits

🔧 **HUMAN CONFIGURATION REQUIRED**

In Supabase Dashboard → **Authentication → Rate Limits**:

| Endpoint | Recommended Limit | Notes |
|---|---|---|
| Send OTP | 3–5 per hour per phone | Prevents SMS flooding |
| Verify OTP | 5 per 5 minutes per phone | Prevents brute force |

The app's UI enforces a 30-second resend cooldown as a UX aid. Supabase rate limits are the authoritative security boundary.

---

## Step 5 — India Phone Number Considerations

⚠️ **NOT VERIFIED** — requires live SMS test

India-specific considerations:

- **DLT registration**: India's TRAI requires all commercial SMS senders to register on the DLT (Distributed Ledger Technology) platform. Twilio India numbers require DLT entity and template registration.
- **A2P messaging**: Use an approved A2P messaging route, not P2P.
- **Phone format**: The app normalizes all numbers to `+91XXXXXXXXXX` (E.164). Supabase and Twilio both use E.164.
- **OTP delivery time**: Allow up to 30–60 seconds in some Indian telecom regions. The app's 30-second resend cooldown is appropriate.
- **Testing with Indian numbers**: Use a real Indian SIM for end-to-end testing. Virtual/VoIP numbers may not receive SMS OTPs.

---

## Step 6 — Environment Variables in Replit

✅ **VERIFIED** — configured as Replit Secrets

The following are set as Replit Secrets (visible to the Expo build at runtime):

| Variable | Status |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ Set |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Set |

> These are `EXPO_PUBLIC_` prefixed — they are baked into the Expo bundle and are safe to use as anon keys. They are NOT the service role key.

---

## Step 7 — Verify Auth is Working

After dashboard configuration:

1. Start the Expo app.
2. Enter a real Indian mobile number (starting with 6–9, 10 digits).
3. Tap **Continue** — the button should show a loading state while the OTP request is in-flight.
4. If Supabase returns success, the app navigates to the OTP screen.
5. Enter the real OTP received via SMS.
6. Tap **Verify** — on success, the app navigates to the home screen.

If the SMS provider is not configured, Supabase will return an error at step 3. The app will display the mapped error message.

---

## Production SMS Checklist

Before going live:

- [ ] DLT entity registered with Indian telecom authority.
- [ ] DLT OTP template approved (typically: "Your MediGo verification code is {#var#}").
- [ ] Twilio/provider account verified and production-ready (not trial).
- [ ] Rate limits reviewed and set appropriately.
- [ ] Supabase production project (not development) used for production builds.
- [ ] OTP expiry reviewed (300 seconds recommended).
- [ ] Monitoring set up for SMS delivery failures (Twilio logs / Supabase auth logs).

---

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| "SMS send failure" error in app | SMS provider not configured in Supabase dashboard |
| "Too many requests" error | Rate limit hit; wait before retrying |
| OTP not received | DLT not registered; carrier filtering; VoIP number |
| OTP expired before entry | OTP expiry too short; increase to 300–600 seconds |
| "Invalid verification code" | OTP entered incorrectly or expired |
| Supabase Auth page shows no phone provider | Phone provider not enabled in dashboard |
