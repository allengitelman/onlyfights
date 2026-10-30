# OnlyFights performance model

This version replaces the previous results-only recommendation forecasts with supervised models trained on historical UFC performance. Sportsbook odds determine displayed prices, never the forecasts or their ranking. The browser performs inference locally; no chat-model API or personal betting history is required.

## Research behind the feature choices

The primary forecasting paper [A Markov chain model for forecasting results of mixed martial arts contests](https://doi.org/10.1016/j.ijforecast.2022.01.007) estimates fighter skills from prior contests, separates training from later testing, and discusses limited fighter samples. Its conventional pre-fight comparison also uses striking and takedown rates and defense. We adopted the timing discipline and multiple-skill approach, not the paper's Markov simulation or its reported returns. Its results do not validate this model.

[James et al., Identifying the performance characteristics of a winning outcome in elite mixed martial arts competition](https://pubmed.ncbi.nlm.nih.gov/27569006/) studies associations between recorded fight performance and winning. That is useful for feature selection, but classification using statistics from the fight being predicted is not a pre-fight forecasting test. OnlyFights never supplies a target bout's performance to that bout's feature vector.

The [UFC's explanation of striking accuracy](https://www.ufc.com/news/does-striking-accuracy-accurately-measure-striking) explains why accuracy needs position and target context. The model therefore includes distance/ground and head/body/leg shares, rather than treating accuracy as a stand-alone measure of striking skill. The [official record book](https://statleaders.ufc.com/) uses minimum fight/attempt requirements for rate leaderboards. OnlyFights smooths small samples, shows actual denominators and leaves matchups unranked below two detailed UFC bouts per fighter. That threshold is our product rule, not an official validation of its reliability.

The [scikit-learn calibration documentation](https://scikit-learn.org/stable/modules/calibration.html) distinguishes probability calibration from correct classification. We reserve a separate calendar year for probability scaling and disclose both accuracy and probability error.

## Data and timing

- UFCStats round-level counters and event/results data from the [original Kairo-Angle maintainer mirror](https://github.com/Kairo-Angle/ufc), through September 6, 2025.
- ESPN UFC scoreboards and public completed-bout statistics from September 7, 2025 through October 24, 2026. Contender Series and Road to UFC are excluded.
- Aggregated landed/attempted counters, duration, knockdowns, submission attempts, control time and striking positions/targets for both competitors. Percentages use summed attempts, not averages of round percentages.
- Age is calculated on the historical bout date from birth date. Available-profile height and reach are used with coverage flags; those measurements are not guaranteed fight-day measurements. Stance is retained as context and is not a model feature.
- Draws/no-contests are outside the decisive-bout dataset. Their activity and performance are not modeled. The minimum data rule does not cover every MMA promotion or every professional fight.
- Every bout on a date reads the previous state before any bout on that date updates it. A chronological assertion guards feature timing. Earlier fights in the test period may update history for later test fights, as would happen in prospective use; model weights and probability scaling remain fixed.

## Model and evaluation

38 measurements per fighter become differences and averages, plus scheduled rounds, weight class and women's division. Measurements cover striking, defense, grappling, finishing history, recent form, opponent-adjusted past results, age/size/activity, observed minutes and coverage. Missing physical information uses defaults; missing values are shown to users. Current profile completeness is not a prediction input because retrospective availability is not reliable historical information. Career rate priors are fixed smoothing constants, not fitted on the held-out test.

Winner candidates are regularized logistic regression and gradient-boosted trees. Fighter-order augmentation and symmetric inference ensure reversing competitors produces complementary win probabilities. Separate gradient-boosted models predict winning method given the winner, finishing round given winner/method, and fight duration against a round line. A conditional method/round test does not measure the accuracy of the full joint betting outcome.

Chronological split: train 2008–2020; select settings on 2021–2022; refit the selected architecture on earlier data; calibrate probability scale on 2023; report final tests on 2024 through the latest completed source event. Winner evaluation requires two prior detailed UFC bouts on each side. Head selection/calibration also uses that coverage rule. Duration training gives each bout equal total weight across its available round lines; reported test metrics count each line separately. Date-block bootstrap intervals describe variability of the fixed model's test accuracy, not individual forecast intervals or uncertainty from retraining.

Exact counts, selected settings, calibration bins, accuracy, Brier score and log loss are stored in `research-artifacts/evaluation.json`. The old results-only forecast is evaluated on exactly the same test bouts. No historical sportsbook price series is used in this evaluation, so neither profitability nor superiority to sportsbook forecasts is established.

## Reproduce and check

Raw source files are ignored in `research-input/`: `ufc_fight_stats.csv`, `ufc_fighter_tott.csv`, `ufc_event_details.csv`, `ufc_fight_results.csv`, and ESPN `espn-history-2026.json` / `espn-history-latest.json` scoreboard responses. Download CSVs from the mirror's corresponding files. The scoreboard windows are 20250907–20260906 and 20260907–20261028.

1. Install `scripts/model-requirements.txt` in a Python environment.
2. Run `python3 scripts/fetch-performance-stats.py` (caches per-athlete completed-bout responses).
3. Run `python3 scripts/train-fighter-model.py`.
4. Run `node scripts/test-fighter-model.cjs` for Python/browser probability parity, feature parity and swap symmetry.

The trained browser artifact is `public/fighter-model.json`. The results-only snapshot remains a result ledger and matched baseline, not a fallback confidence score. New completed-bout performance is fetched while the app is open, using the fixed model. Missing new stats pause affected forecasts. There is no unattended retraining service: publishing fresh model weights requires rerunning the chronological training pipeline and reviewing its evaluation.

## Product limits

Forecast explanations use measured differences that support the model's estimate, with local feature-removal sensitivity to prioritize them. They describe associations, not causes. No injuries, camp changes, weight-cut difficulty or live health assessment are modeled. Unavailable or thin history is visible. Separate-fight probabilities are multiplied for illustrative parlay estimates; joint parlay calibration and betting-strategy returns have not been validated. Conservative means fewer conditions relative to other combinations, not safe.

Sportsbook handoff still reviews and copies tickets and opens source-provided event links. It never submits a wager. Moneylines, methods and totals use sourced prices; dated snapshots supplement current-card missing props. Missing future quotes are not invented. Combined cross-book prices require a sportsbook to reprice and accept every leg.

## Rejected first run and data correction

The initial 39-feature run scored 52.82% winner accuracy and 0.3016 Brier error on 958 later bouts, versus 54.38% and 0.2440 for the results-only baseline. It was rejected for promotion. A diagnostic found that present-day profile completeness had become a strong predictor even though availability was not historically timestamped. That retrospective availability feature was removed. The 38-feature pipeline retains the earlier chronological hyperparameter selection and calibration split. The later period was rerun after this schema correction; it is a development holdout, not a new prospective confirmation. The first run is retained in `research-artifacts/rejected-availability-feature.json`. No further model changes should be selected using this test period.

## Current corrected results

The selected winner model is regularized logistic regression. It picked 67.01% of 958 eligible later bouts correctly, compared with 54.38% for the results-only baseline on the same bouts. Brier probability error was 0.2175 versus 0.2440 (lower is better); log loss was 0.6253 versus 0.6809. The date-block accuracy interval was 64.46–69.55%. This period was rerun after the documented availability-field correction and must not be presented as new prospective confirmation. Winning-method conditional accuracy was 53.10% on 953 bouts, finishing-round conditional accuracy 45.11% on 501 finished bouts, and duration accuracy 65.85% on 2,196 round-total predictions. Joint method/round tickets and combined parlays remain unvalidated.

## Social cards and focused recommendations

The app now runs on the Sites Vinext Worker starter with a D1 account store. Authenticated identity comes from Sites' Sign in with ChatGPT integration. Username creation is the OnlyFights profile setup step. Public pick cards contain a frozen snapshot, with server-owned attribution; followers must authenticate and create a profile before tailing. Tailing is idempotent per account/card and adds eligible current fights to a local draft while preserving the permanent tail in the account. No wager is submitted. D1 migrations contain schema only; local test fixtures are not production seed data.

The default results screen renders up to three priced tickets. The strongest two-fighter moneyline ticket anchors the board. The second route favors the user's method calls and reduces repeated fighter overlap; the stretch route favors manageable 3–5-fight or exact-condition alternatives, with longer tickets still available through the full explorer. The trained prediction model and its probability scale have not changed. Diversification affects selection, not the probability labels. The full combination space and filters remain available on demand.

Instagram export creates a 1080×1350 PNG using exact selected fight data, paired real portraits when available, green winner checks and the creator handle. Source matchup ordering is preserved. Missing portraits fall back to initials. Caption text includes the public tail link. Native file sharing is offered on supported devices; otherwise the PNG downloads. No Instagram post is published automatically and no Instagram credentials are stored.

The authored frontend is now `app/shell.html` and `public/`. `dist/` is generated deployment output. Run `node tests/recommendations.test.cjs`, `node --import ./scripts/sites-env.mjs tests/social-core.test.mjs`, and `node scripts/test-fighter-model.cjs` for recommendation, real-D1 ownership/tail validation and prediction parity tests. New model training exports to `public/fighter-model.json`.
