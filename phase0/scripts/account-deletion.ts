// Handles a request to delete an account (privacy page). Uses DATABASE_URL, so by default this is PRODUCTION,
// and with real email keys "schedule" sends a real email. Run pnpm db:backup before "now".
//   pnpm account:delete status
//   pnpm account:delete schedule <email>      30 days ahead; emails now, then at 15 and 7 days; the daily job deletes
//   pnpm account:delete cancel <email>
//   pnpm account:delete now <email> --confirm  no waiting, for an account that belongs to someone under 18
import path from "node:path";

process.loadEnvFile?.(path.resolve(import.meta.dirname, "../../.env"));

const { cancelAccountDeletion, deleteAccount, scheduleAccountDeletion, scheduledDeletions, AccountDeletionError } = await import("../server/account-deletion");

const [command, email] = process.argv.slice(2);
try {
  if (command === "status") {
    const rows = await scheduledDeletions();
    if (rows.length === 0) console.log("No deletions are scheduled.");
    for (const row of rows) console.log(`${row.email}: on ${row.deletionScheduledFor?.toISOString().slice(0, 10)}, last notice ${row.deletionLastNoticeDays ?? "none"} days before`);
  } else if (command === "schedule" && email) {
    const date = await scheduleAccountDeletion(email);
    console.log(`Scheduled for ${date.toISOString().slice(0, 10)}. Check the status line to confirm the first notice went out.`);
  } else if (command === "cancel" && email) {
    await cancelAccountDeletion(email);
    console.log("Cancelled.");
  } else if (command === "now" && email) {
    if (!process.argv.includes("--confirm")) throw new AccountDeletionError("This cannot be undone. Back up first, then add --confirm.");
    await deleteAccount(email);
    console.log("Deleted.");
  } else {
    console.log("usage: pnpm account:delete status | schedule <email> | cancel <email> | now <email> --confirm");
    process.exitCode = 1;
  }
} catch (error) {
  if (!(error instanceof AccountDeletionError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
process.exit();
