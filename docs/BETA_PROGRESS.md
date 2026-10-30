# OnlyFights beta progress

Plan: docs/superpowers/plans/2026-10-30-onlyfights-beta.md
Approved by Allen: go, October 30, 2026.
Base: 1ed363f99988d57b9b44c739195e30a7dfb88191.

Ruling: implement inline without another planning approval round; Allen explicitly authorized execution. Preserve the inaccessible original design in the old checkout.
Ruling: use a fresh source checkout because hydrated files and Git operations in the old checkout timed out. No old source was deleted.
Ruling: verify managed sessions at Supabase's authoritative user endpoint rather than adding custom JWT cryptography; fail closed on rejection or outage.
Environment: dependency cache cleanup freed enough space for source; full Xcode absent. No large dependency installation attempted.

Tasks 1–4: source increments implemented; activation and native runtime verification blocked by external configuration/toolchain.

Verification: 24 Node test entries pass, including existing legacy social checks using actual SQLite fallback because the local Worker runtime is absent. JavaScript syntax, Swift syntax-only parsing, plist validation and Git whitespace checks pass. Swift package tests and iOS build did not run successfully: the installed compiler/SDK has module-map and package-linker incompatibilities; full Xcode is absent.

Whole-branch review: fresh reviewer Galileo identified seven important issues. Fixed public recommendation POST origin handling, native feed URL query construction, web configuration startup before refresh, account-scoped revision state, local tail confirmation/idempotent response handling, resumable deletion, and refresh generation guards. Six executable regression cases failed before the fixes and pass afterward. Native URL and refresh fixes have source tests but cannot run until the Swift toolchain is healthy.

Ruling: preserve the existing independently trained website model unchanged. Native shortlist grouping currently uses real quoted prices and user selections, clearly labeled; it does not claim independent model likelihood. Native model parity remains incomplete.
Ruling: use managed auth but do not create a paid service or invent configured credentials. Apple/email flows stay honestly unavailable until a real project and Apple settings are connected.
Ruling: direct Stories handoff is gated by Meta app registration; Instagram feed export remains explicit image saving. No claim of a preloaded feed composer or tested Stories launch.
Ruling: keep real sportsbook transfer gated pending SharpSports approval and device verification.
Ruling: ship source plus an additive website increment, not an unverified signed iOS app. No TestFlight build, native runtime QA, unattended refresh or social publication occurred.
Remaining product work: physical-device verification of the embedded shared research engine; owned-domain Universal Links; operational moderation; account/provider/physical-device end-to-end validation. These prevent calling this the completed friends beta.

Dependency cleanup removed only prior OnlyFights node_modules and package caches. It did not remove source or personal files. No dependency reinstall attempted on this nearly-full Mac.

Follow-up: added embedded shared stats research with current native picks, persisted event history, source correction auditing, and historical feed lookup after the rolling upcoming window. Website and native runtime/device verification remain unverified.
