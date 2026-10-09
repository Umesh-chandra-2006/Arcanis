-- Copy each user's current Spark balance into the append-only ledger as one
-- committed opening entry (task A3). Idempotent through the unique key.
INSERT INTO `p0_spark_ledger` (`id`, `user_id`, `amount`, `type`, `status`, `idempotency_key`, `note`)
SELECT UUID(), `user_id`, `balance`, 'migration_opening_balance', 'committed', CONCAT('opening:', `user_id`), 'Opening balance from p0_spark_balances'
FROM `p0_spark_balances`
WHERE NOT EXISTS (
  SELECT 1 FROM `p0_spark_ledger` l WHERE l.`idempotency_key` = CONCAT('opening:', `p0_spark_balances`.`user_id`)
);
