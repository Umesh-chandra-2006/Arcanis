ALTER TABLE `p0_login_tokens` ADD `signup_context` json;--> statement-breakpoint
ALTER TABLE `p0_users` ADD `terms_accepted_at` timestamp;--> statement-breakpoint
UPDATE `p0_analytics_events` SET `session_id` = NULL WHERE `session_id` IS NOT NULL;
