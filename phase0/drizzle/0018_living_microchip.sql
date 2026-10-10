CREATE TABLE `p0_stone_ledger` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('grant_creation','spend_mend','admin_adjust') NOT NULL,
	`status` enum('pending','committed','reversed') NOT NULL,
	`ref_id` varchar(64),
	`idempotency_key` varchar(128),
	`note` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `p0_stone_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_stone_ledger_idem_idx` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
ALTER TABLE `p0_generation_runs` ADD `kind` enum('creation','mend') DEFAULT 'creation' NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` ADD `refined_from_id` varchar(36);--> statement-breakpoint
CREATE INDEX `p0_stone_ledger_user_idx` ON `p0_stone_ledger` (`user_id`);