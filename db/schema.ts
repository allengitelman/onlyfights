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
