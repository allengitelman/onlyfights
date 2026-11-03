CREATE TABLE `app_jobs` (
	`name` text PRIMARY KEY NOT NULL,
	`done_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_odds_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL,
	`remaining` integer
);
--> statement-breakpoint
CREATE TABLE `app_predictions` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`fight_id` text NOT NULL,
	`event_name` text NOT NULL,
	`event_date` text NOT NULL,
	`athlete_id` text NOT NULL,
	`opponent_id` text NOT NULL,
	`fighter` text NOT NULL,
	`opponent` text NOT NULL,
	`method` text,
	`round` integer,
	`lock` integer DEFAULT 0 NOT NULL,
	`segment` text,
	`weightclass` text,
	`rounds` integer,
	`pick_odds` integer,
	`pick_opp_odds` integer,
	`method_odds` integer,
	`odds_source` text,
	`close_odds` integer,
	`close_opp_odds` integer,
	`close_at` text,
	`cutoff` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`picked_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`winner_grade` text DEFAULT 'pending' NOT NULL,
	`method_grade` text,
	`round_grade` text,
	`result_method` text,
	`result_round` integer,
	`void_reason` text,
	`audit_id` integer,
	`graded_at` text,
	PRIMARY KEY(`user_id`, `event_id`, `fight_id`)
);
--> statement-breakpoint
CREATE INDEX `app_predictions_user_time` ON `app_predictions` (`user_id`,`cutoff`);--> statement-breakpoint
CREATE INDEX `app_predictions_bout` ON `app_predictions` (`event_id`,`fight_id`);--> statement-breakpoint
CREATE TRIGGER app_predictions_no_deleting BEFORE INSERT ON app_predictions WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
