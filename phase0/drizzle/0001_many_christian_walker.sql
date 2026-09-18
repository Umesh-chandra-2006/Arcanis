ALTER TABLE `p0_spark_balances` DROP INDEX `p0_spark_balances_user_idx`;--> statement-breakpoint
ALTER TABLE `p0_spark_transactions` MODIFY COLUMN `type` enum('signup_grant','creation_spend','creation_refund','referral_bonus') NOT NULL;--> statement-breakpoint
ALTER TABLE `p0_spells` MODIFY COLUMN `scaling_factor` double;--> statement-breakpoint
ALTER TABLE `p0_spells` MODIFY COLUMN `mp_modifier` double;