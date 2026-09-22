CREATE TABLE `p0_reviews` (
	`id` varchar(36) NOT NULL,
	`spell_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `p0_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `p0_reviews_user_spell_idx` UNIQUE(`user_id`,`spell_id`)
);
--> statement-breakpoint
ALTER TABLE `p0_users` ADD `password_hash` varchar(255);--> statement-breakpoint
CREATE INDEX `p0_reviews_spell_idx` ON `p0_reviews` (`spell_id`);