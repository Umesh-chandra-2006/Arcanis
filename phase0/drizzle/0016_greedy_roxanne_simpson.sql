ALTER TABLE `p0_spells` ADD `potential_tier` enum('Basic','Advanced','Mega','Freestyle');--> statement-breakpoint
ALTER TABLE `p0_users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `p0_users` ADD `updates_opt_in` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_users` ADD `onboarded_at` timestamp;