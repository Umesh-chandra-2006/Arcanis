CREATE TABLE `p0_referrals` (
	`id` varchar(36) NOT NULL,
	`inviter_id` int NOT NULL,
	`invitee_id` int NOT NULL,
	`status` enum('pending','paid','rejected') NOT NULL DEFAULT 'pending',
	`reason` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`paid_at` timestamp,
	CONSTRAINT `p0_referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_referrals_invitee_idx` UNIQUE(`invitee_id`)
);
--> statement-breakpoint
ALTER TABLE `p0_users` ADD `referral_code` varchar(16);--> statement-breakpoint
ALTER TABLE `p0_users` ADD CONSTRAINT `p0_users_referral_code_idx` UNIQUE(`referral_code`);--> statement-breakpoint
CREATE INDEX `p0_referrals_inviter_idx` ON `p0_referrals` (`inviter_id`);