# OnlyFights iPhone beta

Native SwiftUI source is in `OnlyFights/`. It is not a signed or device-tested app yet.

## Build host

Use a Mac with a current full Xcode installation and the iOS SDK. The current development Mac only has Command Line Tools. Its Swift package manifest linker and default Swift module maps are inconsistent; no iOS compilation succeeded here. Syntax parsing with `swiftc -frontend -parse -parse-stdlib` passed. That does not establish type correctness or runtime behavior.

Open the included `OnlyFights.xcodeproj` on the build host. It can be regenerated with `python3 generate_project.py`; `project.yml` is also included for XcodeGen users. The checked-in `project.yml` includes all source and the reused poster background. Set your Apple Developer team and an available bundle identifier. Enable Sign in with Apple for that App ID, select a physical iPhone, and build. The proposed `com.onlyfights.app` identifier has not been reserved or verified.

Add a final app icon, configure the age rating and privacy answers accurately, then archive using your Apple Developer account and upload to App Store Connect/TestFlight. No Apple account credentials, certificates, signing keys, or purchases are included in source.

## Authentication

Create/configure a Supabase Auth project. Backend environment values:

- `SUPABASE_URL`: project origin, `https://<project>.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY`: public client key; never a secret/service-role key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only, needed for account deletion. Never place this key in the app, website, Git, or chat.

Enable email sign-in with an email template displaying the OTP token; configure delivery for actual beta recipients, not only the owner's address. Enable Apple with the native bundle ID and website Services ID/redirect settings as required by Supabase. Website callback is the exact deployed origin with a trailing slash. Test both identities against the same account service. Existing ChatGPT records require proof-based explicit linking in the web account panel before creating conflicting new data.

The native client obtains public auth configuration from `/api/v1/config`. Native Apple tokens are exchanged through the configured managed provider using a fresh nonce. Passwordless email uses an entered code. Sessions live in Keychain; refresh tokens are not application database records. The backend verifies bearer sessions at the provider's authoritative user endpoint on every request and never falls back to a different identity.

## Instagram

Register the app with Meta and configure a real `INSTAGRAM_APP_ID` build setting. Stories uses the native `instagram-stories` integration with a PNG on expiring pasteboard storage and opens Instagram directly. This is not an Instagram feed composer integration. Feed export explicitly saves the image to Photos with add-only permission; it does not promise a preloaded feed post or silently open a share sheet. Physical-device handoff is untested and is required before advertising it as working.

## Links

Public links open the website as `/?betaShare=<id>`. The native client accepts the same query in an `onlyfights://` URL. Universal Links are not enabled: an owned domain and verified Apple association file are still required. Sending an HTTPS link alone does not guarantee an installed-app launch.

## Required checks before inviting friends

Two real accounts: sign in, choose names, save/reload on web and iPhone, publish full-card poster with locks, tail with replacement confirmation, follow/block/report, delete an account, expire/refresh a session, and interrupt networking during a save. Test portrait failures and every small-screen selector. The native quick shortlist uses quoted-price grouping. Its stats-backed shortlist opens the same existing trained research engine inside the app with your current selections, rather than inventing new model scores. Do not describe the quick price grouping as independent model likelihood ranking.

Verify canonical pre-event records with actual finished, cancelled, drawn and changed-opponent bouts. Records currently cover 100 recent snapshots/3 event feeds per read; they are not an unrestricted lifetime record. Unavailable/older feeds remain pending. Event snapshots and source-result corrections are now retained in D1. Unattended refresh, feed licensing/coverage, moderation operations, and public-release readiness still require activation/validation.

Run `swift test` on the healthy build host for the portable core tests, then build/run the iOS application. Existing backend checks: `node --test tests/app-api.test.mjs tests/pick-engine.test.mjs`, `node tests/betplace.test.mjs`, `node tests/recommendations.test.cjs`.
