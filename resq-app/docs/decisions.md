# RESQ — Architecture Decisions Log

| Date | Decision | Reasoning |
|---|---|---|
| Day 1 | React Native + Expo for mobile | Free tooling, one codebase for iOS+Android, EAS free build tier, Android supports full DND-override natively |
| Day 1 | Single Postgres DB with RLS instead of per-institution DBs | Faster to build, scales cleanly, still provably isolates institution data via row-level policies |
| Day 1 | Supabase for DB/Auth/Realtime | Generous free tier, Postgres (supports PostGIS for geolocation), built-in Realtime for live emergency events |
| Day 1 | Firebase Cloud Messaging for push | Best free option for high-priority "wake the phone" alerts on Android |
| Day 1 | Africa's Talking for USSD/SMS | Purpose-built for East African telecom, free sandbox |
| Day 1 | "SSD offline mode" clarified as USSD | USSD (*XXX#) works on any phone without internet — matches the stated goal |
| Day 1 | iOS DND-override flagged as needing Apple Critical Alerts entitlement | Apple restricts silent-mode override to approved safety apps via formal request — not automatic like Android |

## Open questions to resolve as we go
- Exact subscription tiers/pricing for institutions (super admin sets these — need your input on tiers)
- What counts as "wrong instruction" for the AI cross-check on responder side — need example scenarios to tune this
- Institution admin notification preference: email only, SMS only, or both by default
