CREATE TABLE `p0_forge_queue` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`input` json NOT NULL,
	`status` enum('queued','forging','forged','failed','cancelled') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`spell_id` varchar(36),
	`failure_code` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`started_at` timestamp,
	`finished_at` timestamp,
	`seen_at` timestamp,
	CONSTRAINT `p0_forge_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `p0_sessions` ADD `method` enum('code','link','password') DEFAULT 'password' NOT NULL;--> statement-breakpoint
CREATE INDEX `p0_forge_queue_status_idx` ON `p0_forge_queue` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `p0_forge_queue_user_idx` ON `p0_forge_queue` (`user_id`,`status`);