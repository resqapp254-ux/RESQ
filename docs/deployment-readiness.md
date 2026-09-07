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

Do not rerun the destructive cleanup section of `schema.sql` against an existing production project. The Day 10 migration adds trusted contacts, `emergencies.photo_url`, and the atomic `emergencies.notifications_sent_at` claim field.

## Required deployment configuration

The Vercel dashboard requires the values documented in `admin-dashboard/.env.example`, including Supabase service-role access, Groq, Africa's Talking sandbox, and Resend credentials. The mobile production build requires `EXPO_PUBLIC_API_BASE_URL` set to the deployed Vercel URL plus the Supabase public values.

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

## Chat safety rule

Responder messages are now allowed only when `emergency_messages.sender_id = auth.uid()` and the responder is the emergency's `claimed_by` user. The mobile responder screen hides the composer until the responder claims the emergency. User chat remains allowed for the user who triggered the emergency.

The Day 10 and Day 11 changes are SQL/RLS and JavaScript/React Native UI only. No new native module was added; an EAS rebuild is still recommended for the normal release workflow, but these changes do not create a new native dependency.