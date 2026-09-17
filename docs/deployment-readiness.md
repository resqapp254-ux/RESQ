# RESQ Deployment Readiness

## Database migration order

Apply the SQL files in this order to a new or staging Supabase project:

1. `schema.sql`
2. `auth-functions.sql`
3. `day5-realtime.sql`
4. `day6-rls.sql`
5. `day7-push-tokens.sql`
6. `day8-offline.sql`
7. `day9-rls-hardening.sql`
8. `day10-guardians-notification-idempotency.sql`
9. `day11-chat-claim-rules.sql`
10. `day12-auth-schema-hardening.sql`
11. `auth-functions.sql` (day 2 functions — safe to run any time after `schema.sql`, kept last here since it's re-run occasionally)
12. `day13-secondary-responders.sql`
13. `day14-summary-and-reports.sql`
14. `day15-institution-controls-and-chat.sql`
15. `day16-view-only-permission-enforcement.sql`
16. `day17-chat-media-messages.sql`
17. `day18-emergency-escalation.sql`

All of the above are applied to the live project as of this writing. Each new migration going forward should be added both here and as a numbered `dayN-*.sql` file (mirrored into `supabase/migrations/` with a timestamped filename) — check the live project's actual state via a REST call before assuming a file in this list has been run.

Do not rerun the destructive cleanup section of `schema.sql` against an existing production project. The Day 10 migration adds trusted contacts, `emergencies.photo_url`, and the atomic `emergencies.notifications_sent_at` claim field. Day 13 adds `institution_services` (secondary responders — hospitals, police, etc. an institution registers) and `profiles.service_id`. Day 16 tightens the emergencies RLS update policy so a `view_only` responder can't claim/update via a direct table call, not just through the web claim API. Day 17 adds `media_url`/`media_type` to `emergency_messages` so photos and voice notes are individual chat messages instead of one overwritable field on the emergency row.

## Required deployment configuration

The Vercel dashboard requires the values documented in `admin-dashboard/.env.example`, including Supabase service-role access, Groq, Africa's Talking (production key, not sandbox, once available), and Resend credentials. Sentry's DSN is not secret and is hardcoded in `instrumentation-client.js`/`sentry.server.config.js`/`sentry.edge.config.js`; `SENTRY_AUTH_TOKEN` is only needed for de-minified source maps and lives in Vercel's env vars (web) and as an EAS environment variable (mobile), never committed. The mobile production build requires `EXPO_PUBLIC_API_BASE_URL` set to the deployed Vercel URL plus the Supabase public values.

## Known limitations intentionally left out

- Resend domain-verification limits are external provider constraints and are not worked around in code.
- Africa's Talking sandbox delivery is limited to sandbox-approved recipients and does not represent production sender delivery.
- Push notification delivery while the mobile app is killed depends on platform and EAS credentials; this pass does not attempt to replace native push behavior.
- Product advancements beyond deployment blockers remain deferred.

## Validation completed locally

- `admin-dashboard`: `npm run build` passes.
- `mobile`: `npx expo export --platform android` passes.
- Editor diagnostics report no errors.

The remaining release checks require a staging Supabase project, real authenticated accounts, a reachable Vercel deployment, Africa's Talking sandbox setup, and a physical-device/EAS push test.

## Omnichannel escalation (Day 18)

An unclaimed emergency now escalates automatically: push immediately (unchanged), SMS to every institution responder if still unclaimed after 3 minutes, and a voice call to one responder if still unclaimed after 8 minutes (`lib/escalateEmergency.js`). This only runs when something calls `GET /api/cron/escalate`:

- There is deliberately no `vercel.json` cron config — an early version of this feature added one scheduled every 5 minutes, and Vercel's Hobby (free) plan can reject the *entire deployment* when a cron schedule exceeds what the plan allows (daily only), not just ignore or coerce it. Rather than depend on knowing the account's plan tier, trigger `/api/cron/escalate` from a free external pinger instead — cron-job.org, or an UptimeRobot HTTP(s) monitor (you may already have one from the uptime-monitoring setup) — every few minutes, with `Authorization: Bearer <CRON_SECRET>` as a custom header. This works identically regardless of plan and can never break a deployment.
- The voice-call step additionally requires a Voice-enabled Africa's Talking number (`AFRICASTALKING_VOICE_NUMBER`) with its Voice Callback URL set to `/api/voice/callback` in their dashboard. Without it, escalation still runs and still sends SMS — the call step is silently skipped.

## Weekly report email (Day 30)

`GET /api/cron/weekly-report` emails each active institution's admin a full case report (type, who triggered/handled, timestamps, chat transcript, media, rating) for whatever's been resolved since its last run, then deletes the `emergency_messages` rows for those cases — the case record itself (type, timestamps, rating, photo/video URLs) is kept forever; only the raw chat text is pruned, since it's now archived in the emailed report. See `lib/weeklyReport.js` for the exact logic.

- Same external-pinger setup as `/api/cron/escalate`, protected by the same `CRON_SECRET` — but point this one at a **weekly** schedule (e.g. cron-job.org's "every Monday" option), not every few minutes. Running it more often than weekly is harmless (an institution with nothing newly resolved is skipped without emailing), but pointless.
- Requires `RESEND_API_KEY` (same as the existing resolution-email feature) and the institution to have either an `institution_admin` profile with an email, or a `contact_email` on the institution row. Without either, that institution is skipped and logged in the response, not silently dropped.
- An institution admin should still download the same detail on demand from `/institution-admin/case-reports` at any time; the weekly email is a push, not the only way to get it.

## Chat safety rule

Responder messages are now allowed only when `emergency_messages.sender_id = auth.uid()` and the responder is the emergency's `claimed_by` user. The mobile responder screen hides the composer until the responder claims the emergency. User chat remains allowed for the user who triggered the emergency.

The Day 10 and Day 11 changes are SQL/RLS and JavaScript/React Native UI only. No new native module was added; an EAS rebuild is still recommended for the normal release workflow, but these changes do not create a new native dependency.