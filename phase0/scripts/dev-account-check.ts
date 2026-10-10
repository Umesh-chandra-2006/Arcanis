// Local testing helper: shows an account's role, Spark and Refinement Stones on
// the TEST database, and with --spark N tops its Spark up to N. Refuses to run
// against anything but TEST_DATABASE_URL. Makes no provider calls.
//   tsx scripts/dev-account-check.ts <email> [--spark N] [--admin]
import path from "node:path";

process.loadEnvFile?.(path.resolve(import.meta.dirname, "../../.env"));
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { eq } = await import("drizzle-orm");
const { nanoid } = await import("nanoid");
const { getDb } = await import("../server/db");
const { p0Users } = await import("../drizzle/schema");
const { getSparkBalance, grantSpark } = await import("../server/spark");
const { getStoneBalance } = await import("../server/stones");
const { getBreakerStatus } = await import("../server/spend-breaker");

const email = process.argv[2]?.toLowerCase();
if (!email) throw new Error("usage: dev-account-check.ts <email> [--spark N] [--admin]");
const sparkArg = process.argv.indexOf("--spark");
const target = sparkArg > -1 ? Number(process.argv[sparkArg + 1]) : null;

const db = (await getDb())!;
const [user] = await db.select().from(p0Users).where(eq(p0Users.email, email)).limit(1);
if (!user) {
  console.log(`No account for ${email} in the test database yet. Sign in once, then run this again.`);
  process.exit(0);
}
if (process.argv.includes("--admin") && user.role !== "admin") {
  await db.update(p0Users).set({ role: "admin" }).where(eq(p0Users.id, user.id));
  user.role = "admin";
}
let { balance } = await getSparkBalance(user.id);
if (target !== null && balance < target) {
  await grantSpark(user.id, target - balance, "admin_adjust", `dev-topup:${nanoid()}`, "local testing top-up");
  balance = target;
}
const breaker = await getBreakerStatus();
console.log(
  JSON.stringify(
    {
      email,
      role: user.role,
      hasPassword: !!user.passwordHash,
      spark: balance,
      stones: await getStoneBalance(user.id),
      restrictedUntil: user.restrictedUntil,
      breakerToday: { open: breaker.open, reason: breaker.reason, generations: breaker.creations, limitFromThisShell: breaker.creationLimit },
    },
    null,
    2
  )
);
process.exit(0);
