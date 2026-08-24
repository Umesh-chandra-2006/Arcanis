CREATE TABLE `p0_analytics_events` (
	`id` varchar(36) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`user_id` int,
	`session_id` varchar(64),
	`metadata` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `p0_magic_links` (
	`id` varchar(36) NOT NULL,
	`token` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_magic_links_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `p0_spark_balances` (
	`user_id` int NOT NULL,
	`balance` int NOT NULL DEFAULT 5,
	`total_earned` int NOT NULL DEFAULT 5,
	`total_spent` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `p0_spark_balances_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `p0_spark_balances_user_idx` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `p0_spark_transactions` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('signup_grant','creation_spend','referral_bonus') NOT NULL,
	`spell_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_spark_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `p0_spells` (
	`id` varchar(36) NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`element` enum('Fire','Water','Earth','Wind') NOT NULL,
	`category` enum('Attack','Defense','Regen','Debuff') NOT NULL,
	`cast_type` enum('Instant') NOT NULL DEFAULT 'Instant',
	`tier` enum('Basic') NOT NULL DEFAULT 'Basic',
	`damage_min` int NOT NULL,
	`damage_max` int NOT NULL,
	`mp_cost` int NOT NULL,
	`will_cost_min` int NOT NULL,
	`will_cost_max` int NOT NULL,
	`cast_time_ms` int NOT NULL,
	`scaling_factor` int,
	`mp_modifier` int,
	`interruption_threshold` int,
	`maintenance_cost_per_turn` int,
	`flavor_text` text NOT NULL,
	`lore_line` text NOT NULL,
	`assessment_question` text,
	`image_url` text NOT NULL,
	`share_count` int NOT NULL DEFAULT 0,
	`generation_metadata` json NOT NULL,
	`is_platform_spell` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_spells_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `p0_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`username` varchar(64) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT true,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_signed_in_at` timestamp,
	CONSTRAINT `p0_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_users_email_idx` UNIQUE(`email`),
	CONSTRAINT `p0_users_username_idx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `p0_analytics_type_idx` ON `p0_analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `p0_analytics_created_at_idx` ON `p0_analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `p0_magic_links_email_idx` ON `p0_magic_links` (`email`);--> statement-breakpoint
CREATE INDEX `p0_spark_tx_user_idx` ON `p0_spark_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `p0_spells_owner_idx` ON `p0_spells` (`owner_id`);--> statement-breakpoint
CREATE INDEX `p0_spells_created_at_idx` ON `p0_spells` (`created_at`);