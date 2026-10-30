# OnlyFights sportsbook transfer

Target: DraftKings, with FanDuel offered only when every leg is available there.
Provider: SharpSports betPlace. This opens a prepared betslip; it never submits a wager.

## Current state

- Server adapter and ticket-review check implemented.
- No provider credential is configured. A live unauthenticated market-selection request returned HTTP 401 on October 29, 2026.
- No subscription purchased; no account created; no external inquiry sent; no wager submitted.
- Moneyline transfers only in the first integration. Method, round and totals picks stay intact and are explicitly blocked from automatic transfer.
- API integration and iPhone sportsbook handoff have not been tested with real provider access.

## What Allen needs to do

1. Create a SharpSports developer account at https://app.sharpsports.io/ . Start with sandbox/trial access, not a paid commitment.
2. Request betPlace access and confirmation of UFC market support for DraftKings and FanDuel, iPhone routing, complete multi-fight parlay links, and commercial usage permission for OnlyFights. Ask for a working current-UFC sample and trial pricing. Their advertised betPlace price was $1,750/month at research time; do not assume a free account includes live access.
3. Supply the issued private API key through an ignored local env file or the owner's hosting-secret settings. Never paste it in a public issue or browser client code. Runtime name: SHARPSPORTS_PRIVATE_KEY. A sandbox key must never be used for live links.
4. After credentials are connected, verify current API responses, exact fighter/opponent/event matching, required segment conventions, pagination, quotes, and each book's availability. Confirm provider approval and applicable launch-state requirements.
5. Test on iPhone using a verified sportsbook account. Check exact selections, all legs, final price and account/login return. Do not submit a wager as part of this integration test.
6. Enable BETPLACE_LIVE_ENABLED=true only after the provider and device checks pass. Real users must sign in, meet their sportsbook's eligibility checks, fund their own account and confirm the wager there.

## Inquiry to copy

We are building OnlyFights, a UFC pick and parlay builder. We want betPlace trial access for complete multi-fight UFC moneyline parlays, initially DraftKings with FanDuel as fallback, opened on iPhone. Please confirm current UFC coverage, any leg limits, supported geography and commercial terms, quote freshness, and whether a live trial is available before a subscription. We also need to understand whether UFC method-of-victory, round and fight-total markets can be supported later. Please provide a current UFC test example and the minimum activation requirements.

## Verification and limits

- Run `node tests/betplace.test.mjs`.
- GET /api/betplace exposes only connection state, never secrets.
- POST /api/betplace checks one ticket and reads provider markets. It does not post an order, accept money, link user accounts, or claim a successful wager.
- Exact normalized names, both opponents and a 12-hour event-time window must match. Ambiguous matches, already-started fights, duplicate fights, missing prices and incomplete sportsbook coverage block transfer.
- Only provider-returned market-selection IDs are used in documented betPlace URL templates.
- Each book's estimate uses that book's current listed moneylines. The sportsbook still decides the final combined price and whether the parlay can be accepted.
- Provider data is cached for 30 seconds per running Worker isolate. The adapter has bounded catalog reads. Production quota/rate-control requirements must be confirmed during trial.
- Future provider schema or coverage changes fail closed, without guessed selection IDs or partial-ticket links.

## Primary references

- https://docs.sharpsports.io/docs/getting-started
- https://docs.sharpsports.io/docs/straight-to-sportsbook
- https://docs.sharpsports.io/docs/available-markets
- https://docs.sharpsports.io/reference/marketselection-list
- https://docs.sharpsports.io/reference/marketselection
- https://app.sharpsports.io/
- https://the-odds-api.com/sports-odds-data/mma-odds.html (currently documents MMA fight-winner markets; not evidence of UFC prop transfer support)
