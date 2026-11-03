import { sqliteTable, text, integer, uniqueIndex, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{userId:text('user_id').primaryKey(),username:text('username').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('profile_username_unique').on(t.username)]);
export const pickShares=sqliteTable('pick_shares',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull().references(()=>profiles.userId),eventId:text('event_id').notNull(),payload:text('payload').notNull(),createdAt:text('created_at').notNull()},t=>[index('shares_owner_created').on(t.ownerId,t.createdAt)]);
export const tails=sqliteTable('tails',{userId:text('user_id').notNull().references(()=>profiles.userId),shareId:text('share_id').notNull().references(()=>pickShares.id),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.shareId]})]);

export const appBlocks=sqliteTable("app_blocks",{user_id:text("user_id").notNull(),creator_id:text("creator_id").notNull()},t=>[primaryKey({columns:[t.user_id,t.creator_id]})]);

export const appDeletions=sqliteTable("app_deletions",{provider_subject:text("provider_subject").primaryKey(),user_id:text("user_id").notNull()});

export const appDrafts=sqliteTable("app_drafts",{user_id:text("user_id").notNull(),event_id:text("event_id").notNull(),revision:integer("revision").notNull(),payload:text("payload").notNull(),updated_at:text("updated_at").notNull()},t=>[primaryKey({columns:[t.user_id,t.event_id]})]);

export const appFollows=sqliteTable("app_follows",{user_id:text("user_id").notNull(),creator_id:text("creator_id").notNull()},t=>[primaryKey({columns:[t.user_id,t.creator_id]})]);

export const appIdentities=sqliteTable("app_identities",{provider_subject:text("provider_subject").primaryKey(),user_id:text("user_id").notNull()});

export const appReports=sqliteTable("app_reports",{id:text("id").primaryKey(),reporter_id:text("reporter_id").notNull(),share_id:text("share_id").notNull(),reason:text("reason").notNull(),created_at:text("created_at").notNull()});

export const appShares=sqliteTable("app_shares",{id:text("id").primaryKey(),owner_id:text("owner_id").notNull(),event_id:text("event_id").notNull(),payload:text("payload").notNull(),verified_eligible:integer("verified_eligible").notNull(),cutoff:text("cutoff").notNull(),created_at:text("created_at").notNull()},t=>[index("app_shares_owner").on(t.owner_id,t.event_id,t.created_at),index("app_shares_feed").on(t.created_at,t.id)]);

export const appTails=sqliteTable("app_tails",{user_id:text("user_id").notNull(),share_id:text("share_id").notNull(),created_at:text("created_at").notNull()},t=>[primaryKey({columns:[t.user_id,t.share_id]})]);

export const appTickets=sqliteTable("app_tickets",{id:text("id").primaryKey(),user_id:text("user_id").notNull(),event_id:text("event_id").notNull(),payload:text("payload").notNull(),created_at:text("created_at").notNull()},t=>[index("app_tickets_owner").on(t.user_id,t.created_at)]);

export const appEventSnapshots=sqliteTable("app_event_snapshots",{event_id:text("event_id").primaryKey(),payload:text("payload").notNull(),checked_at:text("checked_at").notNull()});

export const appResultAudit=sqliteTable("app_result_audit",{id:integer("id").primaryKey({autoIncrement:true}),event_id:text("event_id").notNull(),fight_id:text("fight_id").notNull(),payload:text("payload").notNull(),checked_at:text("checked_at").notNull()},t=>[index("app_result_audit_bout").on(t.event_id,t.fight_id,t.id)]);

export const appPredictions=sqliteTable("app_predictions",{user_id:text("user_id").notNull(),event_id:text("event_id").notNull(),fight_id:text("fight_id").notNull(),event_name:text("event_name").notNull(),event_date:text("event_date").notNull(),athlete_id:text("athlete_id").notNull(),opponent_id:text("opponent_id").notNull(),fighter:text("fighter").notNull(),opponent:text("opponent").notNull(),method:text("method"),round:integer("round"),lock:integer("lock").notNull().default(0),segment:text("segment"),weightclass:text("weightclass"),rounds:integer("rounds"),pick_odds:integer("pick_odds"),pick_opp_odds:integer("pick_opp_odds"),method_odds:integer("method_odds"),odds_source:text("odds_source"),close_odds:integer("close_odds"),close_opp_odds:integer("close_opp_odds"),close_at:text("close_at"),cutoff:text("cutoff").notNull(),published:integer("published").notNull().default(0),picked_at:text("picked_at").notNull(),updated_at:text("updated_at").notNull(),winner_grade:text("winner_grade").notNull().default("pending"),method_grade:text("method_grade"),round_grade:text("round_grade"),result_method:text("result_method"),result_round:integer("result_round"),void_reason:text("void_reason"),audit_id:integer("audit_id"),graded_at:text("graded_at")},t=>[primaryKey({columns:[t.user_id,t.event_id,t.fight_id]}),index("app_predictions_user_time").on(t.user_id,t.cutoff),index("app_predictions_bout").on(t.event_id,t.fight_id)]);

export const appOddsCache=sqliteTable("app_odds_cache",{cache_key:text("cache_key").primaryKey(),payload:text("payload").notNull(),fetched_at:text("fetched_at").notNull(),remaining:integer("remaining")});

export const appJobs=sqliteTable("app_jobs",{name:text("name").primaryKey(),done_at:text("done_at").notNull()});
