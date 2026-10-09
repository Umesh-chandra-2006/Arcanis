CREATE TABLE `p0_device_grants` (
	`device_key` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`ip_prefix` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_device_grants_device_key` PRIMARY KEY(`device_key`)
);
--> statement-breakpoint
CREATE TABLE `p0_spark_ledger` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('grant_signup','grant_referral_inviter','grant_referral_invitee','grant_weekly_allowance','spend_creation','refund_creation','admin_adjust','migration_opening_balance') NOT NULL,
	`status` enum('pending','committed','reversed') NOT NULL,
	`ref_id` varchar(64),
	`idempotency_key` varchar(128),
	`note` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `p0_spark_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_spark_ledger_idem_idx` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `p0_device_grants_ip_idx` ON `p0_device_grants` (`ip_prefix`);--> statement-breakpoint
CREATE INDEX `p0_spark_ledger_user_idx` ON `p0_spark_ledger` (`user_id`);