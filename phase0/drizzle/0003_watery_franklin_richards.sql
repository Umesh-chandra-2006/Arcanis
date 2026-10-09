CREATE TABLE `p0_provider_calls` (
	`id` varchar(36) NOT NULL,
	`surface` varchar(32) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`model` varchar(128) NOT NULL,
	`units` json NOT NULL,
	`latency_ms` int NOT NULL,
	`cost_estimate_usd` double NOT NULL DEFAULT 0,
	`outcome` varchar(24) NOT NULL,
	`error_message` varchar(500),
	`user_id` int,
	`run_id` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `p0_provider_calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `p0_provider_calls_created_at_idx` ON `p0_provider_calls` (`created_at`);--> statement-breakpoint
CREATE INDEX `p0_provider_calls_run_idx` ON `p0_provider_calls` (`run_id`);