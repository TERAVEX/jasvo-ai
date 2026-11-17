# JASVO AI: chat UI

The existing JASVO interface is preserved. The app uses Supabase anonymous authentication, PostgreSQL chat persistence with Row Level Security, and the `jasvo-chat` Edge Function for AI requests.

## Backend setup
- Supabase project: `whndudcnwlcnahgqejbn` (EU West 1)
- Browser configuration contains only the public publishable key.
- Chat sessions and messages are stored in Postgres and protected by per-user RLS.
- The server enforces the 10-successful-messages-per-day allowance using East Africa Time.
- AI requests use the `jasvo-chat` Edge Function. Add `ANTHROPIC_API_KEY` as a Supabase Edge Function secret; the credential is never stored in this repository or the APK.
- Enable anonymous sign-ins in Supabase Auth for the first-run no-login flow.

## Current limitations
File chips remain presentation-only; file upload and document processing are not connected. Existing device-local chat data remains on that device; new and remote chats sync after authentication.
