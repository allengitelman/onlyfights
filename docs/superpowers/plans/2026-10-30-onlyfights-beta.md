# OnlyFights Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the source and additive web release for the approved iPhone/web friends beta, identifying real external activation blockers.

**Architecture:** Retain Vinext/Cloudflare/D1. Add versioned bearer-authenticated JSON APIs and a SwiftUI client. Use Supabase Auth for Apple/email credentials; verify sessions with its authoritative user endpoint. Preserve existing ChatGPT ownership and existing web APIs.

**Tech Stack:** JavaScript, D1 SQLite, SwiftUI, URLSession, Keychain, Supabase Auth REST.

**Spec:** Approved 2026-10-29 OnlyFights beta design in the conversation; the previous local copy is currently inaccessible due to filesystem hydration timeouts. Preserve it; do not overwrite it.

## Global Constraints

- iPhone plus website, friends beta, Apple/email accounts. Existing website must keep working.
- Dark OnlyFights design; winners toggle; optional methods/rounds; no invented prices or results.
- No automatic wager submission, social publication, purchases, or paid AI backgrounds.
- Provider setup, native signing and physical-device validation are incomplete until evidenced.
- Four tabs: Fight Card, Parlays, Friends, Profile.

## Review Focus

- Invalid/expired bearer token must never fall back to a different signed-in identity.
- Cross-device stale saves must return a conflict and preserve both drafts.
- Blocked creators and private drafts must not appear in public feeds.
- Unknown bout results and changed opponents must not become verified wins.
- A chosen social app must not silently become the generic share menu.

### Task 1: Auth and durable application storage

**Files:** `lib/app-auth.js`, `lib/app-api.js`, `drizzle/0001_onlyfights_beta.sql`, schema/journal, API route, `tests/app-api.test.mjs`.
**Interfaces:** `createAppAPI({database,identify,eventService,config,legacyIdentify}) -> request => Response`; `createAppIdentity({config,database,fetcher}) -> request => {userId}|null`. REST `/api/v1/config`, `/me`, `/profile`, `/drafts/:event`, `/tickets`, `/feed`, `/follows/:username`, `/blocks/:username`, `/reports`, `/shares`, `/shares/:id[/tail]`, `/account`.
- [ ] Tests first: unauthenticated writes fail, invalid tokens fail closed, ownership isolation, revision conflict, public/private separation, idempotent following/tailing, blocking, deletion.
- [ ] Implement bounded input validation, additive SQL, server-owned IDs and timestamps, exact revision compare-and-swap, no client-trusted identity.
- [ ] Run `node --test tests/app-api.test.mjs`; SQLite adapter uses actual Node SQLite rather than fake query results.
- [ ] Commit self-contained API increment.

### Task 2: Event data and shared recommendations

**Files:** `lib/events.js`, `lib/pick-engine.js`, `tests/pick-engine.test.mjs`.
**Interfaces:** `createEventService({fetcher,clock})` exposes `list()`, `get(id)`; normalized event/fighter IDs; `recommend(event,picks) -> groups`; `gradePick(pick,bout) -> winner/method/round states`.
- [ ] Tests first: actual competitor IDs, source timestamps, invalid/unknown odds omitted, one leg per fight, no six-leg limit, +400..+1200 group, exactly one outside-picks group, unknown result stays pending, draws/changed opponents void.
- [ ] Preserve quoted market identity, segment groups, fetch time and source. No odds-derived chance presented as independent statistics.
- [ ] Expose `/events`, `/events/:id`, `/recommendations`; cache successful reads briefly; upstream failures explicit.
- [ ] Run both new suites and existing dependency-free betting/recommendation suites.

### Task 3: SwiftUI client and native social handoff

**Files:** `ios/OnlyFights/` app, core models, API client, account/session store, four tabs, fight rows, poster renderer, native social handoff; `ios/project.yml`, Info/entitlements, setup guide; core Swift package tests.
**Interfaces:** Codable models match `/api/v1`; bearer token stored in Keychain; refresh via configured auth service. Native Apple credential uses a fresh nonce and provider exchange.
- [ ] Test portable pick state first: selected fighter toggles off, methods clear invalid rounds, locks require selection, American odds conversions, server JSON decoding.
- [ ] Implement actual native card, rails, recommendations/filtering, saved tickets, friends, account draft sync, creator cards, locks and poster preview.
- [ ] Implement native Instagram Stories handoff only when configured and installed; explicitly explain feed/export limitations. Never silently show a share menu for chosen Instagram.
- [ ] Parse all Swift files and run portable Swift tests where tools permit; document missing iOS SDK/signing/device tests.

### Task 4: Website parity and release hardening

**Files:** `public/beta.js`, `public/beta.css`, `app/shell.html`, deployment/setup docs.
- [ ] Add own-account login, cloud save/restore, feed/profile actions and native-compatible public shares without breaking legacy shares/login.
- [ ] Add explicit tail replacement confirmation, account deletion, report/block controls, and accurate feature setup states.
- [ ] Run JS syntax checks and SQL migration checks, existing/new suites, fresh code review; fix security/functional findings.
- [ ] Publish a checked additive website increment using Sites; preserve public audience. Native source publication is not a signed iOS build.

## Activation gates

Managed auth project/Apple credentials, full Xcode/build host and signing, Meta registration and physical iPhone tests, unattended feed refresh, and live SharpSports access require real configuration. No mocked success may count as activation. Complete all source work and tests possible before asking Allen for setup.
