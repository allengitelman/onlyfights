# OnlyFights

MMA picks, parlays, social cards and fight research, with a web app and native iPhone client.

## Source

- `app/`, `public/`, `lib/`: web application and API.
- `ios/`: native iPhone client. See `ios/SETUP.md`.
- `research-artifacts/`, `scripts/`: fight research and model tooling.
- `tests/`: automated checks.

Source snapshot recovered from Allen's working project on October 30, 2026. This upload does not deploy the application or configure authentication, betting providers, or App Store distribution.

## Development

Use the Node version and pnpm version in `package.json`. Run `pnpm install`, then `pnpm dev`. Runtime credentials must be configured separately and are excluded from this repository.

The deployed web app is https://onlyfists-fight-lab.allengitelman.chatgpt.site/.

## Odds and prediction record

- **Odds:** set the `THE_ODDS_API_KEY` Worker secret (The Odds API). Fight-winner prices become a multi-book consensus with the best available price; method and total prices still come from ESPN. Without the key, or when a fight can't be matched exactly, ESPN prices are used. One refresh costs 1 credit and is cached for 15 minutes across all Worker instances (worst case ~2,900 credits/month under constant traffic).
- **Record:** apply `drizzle/0002_prediction_record.sql`. Picks saved or published to an account are logged per fight, frozen when that fight starts, and graded from confirmed ESPN results (draws, no contests and cancelled fights are void; source corrections regrade). `GET /api/v1/me/record` returns the owner's full record; `GET /api/v1/records/:username` returns published picks only.
