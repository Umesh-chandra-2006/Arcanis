CREATE TABLE `p0_login_tokens` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`link_hash` varchar(64) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_login_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_login_tokens_link_idx` UNIQUE(`link_hash`)
);
--> statement-breakpoint
CREATE TABLE `p0_rate_limits` (
	`bucket` varchar(191) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `p0_rate_limits_bucket` PRIMARY KEY(`bucket`)
);
--> statement-breakpoint
CREATE TABLE `p0_sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `p0_login_tokens_email_idx` ON `p0_login_tokens` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `p0_sessions_user_idx` ON `p0_sessions` (`user_id`);