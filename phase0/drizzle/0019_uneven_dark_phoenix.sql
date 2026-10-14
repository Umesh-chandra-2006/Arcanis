CREATE TABLE `p0_feedback` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`kind` enum('idea','problem','praise','other') NOT NULL DEFAULT 'other',
	`rating` int,
	`message` text NOT NULL,
	`source` varchar(24) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `p0_spell_votes` (
	`spell_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`value` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `p0_spell_votes_user_spell_idx` UNIQUE(`user_id`,`spell_id`)
);
--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `codex_shared_at` timestamp;--> statement-breakpoint
CREATE INDEX `p0_feedback_created_idx` ON `p0_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `p0_spell_votes_spell_idx` ON `p0_spell_votes` (`spell_id`);--> statement-breakpoint
CREATE INDEX `p0_spells_codex_idx` ON `p0_spells` (`codex_shared_at`);