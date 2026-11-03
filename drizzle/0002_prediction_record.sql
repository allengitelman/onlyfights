CREATE TABLE app_predictions (user_id TEXT NOT NULL, event_id TEXT NOT NULL, fight_id TEXT NOT NULL, event_name TEXT NOT NULL, event_date TEXT NOT NULL, athlete_id TEXT NOT NULL, opponent_id TEXT NOT NULL, fighter TEXT NOT NULL, opponent TEXT NOT NULL, method TEXT, round INTEGER, lock INTEGER NOT NULL DEFAULT 0, segment TEXT, weightclass TEXT, rounds INTEGER, pick_odds INTEGER, pick_opp_odds INTEGER, method_odds INTEGER, odds_source TEXT, close_odds INTEGER, close_opp_odds INTEGER, close_at TEXT, cutoff TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, picked_at TEXT NOT NULL, updated_at TEXT NOT NULL, winner_grade TEXT NOT NULL DEFAULT 'pending', method_grade TEXT, round_grade TEXT, result_method TEXT, result_round INTEGER, void_reason TEXT, audit_id INTEGER, graded_at TEXT, PRIMARY KEY(user_id,event_id,fight_id));
--> statement-breakpoint
CREATE INDEX app_predictions_user_time ON app_predictions(user_id,cutoff);
--> statement-breakpoint
CREATE INDEX app_predictions_bout ON app_predictions(event_id,fight_id);
--> statement-breakpoint
CREATE TABLE app_odds_cache (cache_key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, fetched_at TEXT NOT NULL, remaining INTEGER);
--> statement-breakpoint
CREATE TRIGGER app_predictions_no_deleting BEFORE INSERT ON app_predictions WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
--> statement-breakpoint
-- Backfill verified public picks so existing creator records carry over. Later shares overwrite earlier ones for the same bout.
INSERT INTO app_predictions (user_id,event_id,fight_id,event_name,event_date,athlete_id,opponent_id,fighter,opponent,method,round,lock,segment,pick_odds,odds_source,cutoff,published,picked_at,updated_at)
SELECT s.owner_id,s.event_id,json_extract(j.value,'$.fightId'),COALESCE(json_extract(s.payload,'$.eventName'),'UFC fight night'),COALESCE(json_extract(s.payload,'$.date'),substr(s.cutoff,1,10)),json_extract(j.value,'$.athleteId'),json_extract(j.value,'$.opponentId'),COALESCE(json_extract(j.value,'$.fighter'),''),COALESCE(json_extract(j.value,'$.opponent'),''),json_extract(j.value,'$.method'),json_extract(j.value,'$.round'),CASE WHEN json_extract(j.value,'$.lock') THEN 1 ELSE 0 END,json_extract(j.value,'$.segment'),
 CASE WHEN lower(COALESCE(json_extract(j.value,'$.market'),''))<>'moneyline' OR json_extract(j.value,'$.odds') IS NULL OR json_extract(j.value,'$.odds')<=1 THEN NULL WHEN json_extract(j.value,'$.odds')>=2 THEN CAST(round((json_extract(j.value,'$.odds')-1)*100) AS INTEGER) ELSE CAST(round(-100/(json_extract(j.value,'$.odds')-1)) AS INTEGER) END,
 json_extract(j.value,'$.source'),s.cutoff,1,s.created_at,s.created_at
FROM app_shares s,json_each(s.payload,'$.picks') j WHERE s.verified_eligible=1 AND s.created_at<s.cutoff ORDER BY s.created_at,s.id
ON CONFLICT(user_id,event_id,fight_id) DO UPDATE SET athlete_id=excluded.athlete_id,opponent_id=excluded.opponent_id,fighter=excluded.fighter,opponent=excluded.opponent,method=excluded.method,round=excluded.round,lock=excluded.lock,pick_odds=excluded.pick_odds,odds_source=excluded.odds_source,picked_at=excluded.picked_at,updated_at=excluded.updated_at;
