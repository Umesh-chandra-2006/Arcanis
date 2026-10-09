CREATE TABLE `p0_generation_runs` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`spell_id` varchar(36),
	`attempts` int NOT NULL DEFAULT 0,
	`layer_2a_clamped` boolean NOT NULL DEFAULT false,
	`layer_2a_fallback` boolean NOT NULL DEFAULT false,
	`layer_2b_flagged` boolean NOT NULL DEFAULT false,
	`layer_2c_fired` boolean NOT NULL DEFAULT false,
	`outcome` varchar(24) NOT NULL DEFAULT 'running',
	`failure_reason` varchar(64),
	`total_cost_usd` double NOT NULL DEFAULT 0,
	`trace` json,
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`finished_at` timestamp(3),
	CONSTRAINT `p0_generation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `p0_moderation_events` (
	`id` varchar(36) NOT NULL,
	`user_id` int,
	`surface` varchar(32) NOT NULL,
	`content_type` varchar(16) NOT NULL,
	`target_type` varchar(16),
	`target_id` varchar(36),
	`verdict` varchar(16) NOT NULL,
	`reason` varchar(64),
	`scores` json,
	`excerpt` text,
	`escalated_to_2c` boolean NOT NULL DEFAULT false,
	`layer_2c_result` varchar(32),
	`run_id` varchar(36),
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`resolution` varchar(16),
	`reviewed_by_human` boolean NOT NULL DEFAULT false,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_moderation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `p0_spells` MODIFY COLUMN `element` enum('Fire','Water','Wind','Earth','Lightning','Void','Arcane','Light','Shadow','Nature','Frost','Chaos') NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` MODIFY COLUMN `category` enum('Attack','Defense','Regen','Debuff','Buff','Drain','Environmental','Summon','Physical','Hybrid') NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` MODIFY COLUMN `cast_type` enum('Instant','Trap','Charged','Continuous','Channeled') NOT NULL DEFAULT 'Instant';--> statement-breakpoint
ALTER TABLE `p0_spells` MODIFY COLUMN `tier` enum('Basic','Advanced','Mega','Freestyle') NOT NULL DEFAULT 'Basic';--> statement-breakpoint
ALTER TABLE `p0_reviews` ADD `status` enum('visible','removed') DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `secondary_category` enum('Attack','Defense','Regen','Debuff','Buff','Drain','Environmental','Summon','Physical','Hybrid');--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `drain_ratio` double;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `image_prompt` text;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `image_attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `research_complexity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `research_ready_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `verification_trace` json;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `is_public` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `removed_at` timestamp;--> statement-breakpoint
ALTER TABLE `p0_users` ADD `abuse_strikes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_users` ADD `restricted_until` timestamp;--> statement-breakpoint
ALTER TABLE `p0_users` ADD `banned_at` timestamp;--> statement-breakpoint
CREATE INDEX `p0_generation_runs_user_idx` ON `p0_generation_runs` (`user_id`);--> statement-breakpoint
CREATE INDEX `p0_generation_runs_created_at_idx` ON `p0_generation_runs` (`created_at`);--> statement-breakpoint
CREATE INDEX `p0_moderation_events_status_idx` ON `p0_moderation_events` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `p0_moderation_events_target_idx` ON `p0_moderation_events` (`target_type`,`target_id`);