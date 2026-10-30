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
