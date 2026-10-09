CREATE TABLE `p0_spark_waitlist` (
	`user_id` int NOT NULL,
	`pack_clicked` varchar(16),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `p0_spark_waitlist_user_id` PRIMARY KEY(`user_id`)
);
