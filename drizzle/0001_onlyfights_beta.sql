CREATE TABLE app_identities (provider_subject TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE app_drafts (user_id TEXT NOT NULL, event_id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,event_id));
--> statement-breakpoint
CREATE TABLE app_tickets (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, event_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX app_tickets_owner ON app_tickets(user_id,created_at);
--> statement-breakpoint
CREATE TABLE app_shares (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, event_id TEXT NOT NULL, payload TEXT NOT NULL, verified_eligible INTEGER NOT NULL, cutoff TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX app_shares_feed ON app_shares(created_at,id);
--> statement-breakpoint
CREATE INDEX app_shares_owner ON app_shares(owner_id,event_id,created_at);
--> statement-breakpoint
CREATE TABLE app_tails (user_id TEXT NOT NULL, share_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,share_id));
--> statement-breakpoint
CREATE TABLE app_follows (user_id TEXT NOT NULL, creator_id TEXT NOT NULL, PRIMARY KEY(user_id,creator_id));
--> statement-breakpoint
CREATE TABLE app_blocks (user_id TEXT NOT NULL, creator_id TEXT NOT NULL, PRIMARY KEY(user_id,creator_id));
--> statement-breakpoint
CREATE TABLE app_reports (id TEXT PRIMARY KEY NOT NULL, reporter_id TEXT NOT NULL, share_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE app_deletions (provider_subject TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER app_shares_no_deleting BEFORE INSERT ON app_shares WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.owner_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
--> statement-breakpoint
CREATE TRIGGER app_profiles_no_deleting BEFORE INSERT ON profiles WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
--> statement-breakpoint
CREATE TRIGGER app_drafts_no_deleting BEFORE INSERT ON app_drafts WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
--> statement-breakpoint
CREATE TRIGGER app_tickets_no_deleting BEFORE INSERT ON app_tickets WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_shares_no_deleting BEFORE INSERT ON pick_shares WHEN EXISTS(SELECT 1 FROM app_deletions WHERE user_id=NEW.owner_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
--> statement-breakpoint
CREATE TABLE app_event_snapshots (event_id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,checked_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE app_result_audit (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,event_id TEXT NOT NULL,fight_id TEXT NOT NULL,payload TEXT NOT NULL,checked_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX app_result_audit_bout ON app_result_audit(event_id,fight_id,id);
