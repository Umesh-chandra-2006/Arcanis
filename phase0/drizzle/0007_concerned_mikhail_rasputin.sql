CREATE TABLE `p0_breaker_days` (
	`day` varchar(10) NOT NULL,
	`tripped_reason` varchar(64),
	`tripped_at` timestamp,
	`reset_at` timestamp,
	`spend_limit_override_usd` double,
	`creation_limit_override` int,
	`alerted_at` timestamp,
	CONSTRAINT `p0_breaker_days_day` PRIMARY KEY(`day`)
);
