// Seeds the 36 platform base spells exactly as Master Doc 5.6 lists them
// (element, name, category, cast type). Three per element; they are seeded as
// that element's Basic, Advanced and Mega spell in list order (assumption
// flagged to the founder: the doc does not state the tier per row). Stats come
// from the default Power Budget profile, so they sit inside the Master Doc caps.
// Idempotent: existing rows are updated by name; older platform spells that are
// not in the list are hidden, not deleted.
//   pnpm seed
import { nanoid } from "nanoid";
import { and, eq, notInArray } from "drizzle-orm";
import { getDb } from "./db";
import { p0Users, p0Spells } from "../drizzle/schema";
import { computeBudgetSpec, defaultAllocation } from "../shared/power-budget";
import type { CastType, Category, Element, Tier } from "../shared/taxonomy";

type Row = [Element, string, Category, Category | null, CastType, string, string];

// [element, name, category, secondary (Hybrid only), cast type, flavor, lore]
const BASE_SPELLS: Row[] = [
  ["Fire", "Ember Lance", "Attack", null, "Instant", "A spear of molten fire erupts from the caster's palm and punches through the air.", "The first weapon ever forged in Arcanis, still smoldering."],
  ["Fire", "Conflagration Wave", "Attack", null, "Continuous", "A rolling wall of flame spreads outward, growing hungrier with every breath it takes.", "Fire does not advance. It inherits."],
  ["Fire", "Solar Collapse", "Attack", null, "Charged", "The caster gathers a dying sun between their hands, then lets it fall.", "For one heartbeat there are two dawns."],
  ["Water", "Tidal Strike", "Attack", null, "Instant", "A fist of seawater crashes into the foe with the weight of a full tide behind it.", "The sea keeps every promise it makes."],
  ["Water", "Undertow Bind", "Debuff", null, "Instant", "Unseen currents coil around the foe's limbs and drag their strength below.", "You do not feel the undertow until you are already going."],
  ["Water", "Abyssal Surge", "Attack", null, "Instant", "Black water from the deepest trench bursts upward in a crushing column.", "Pressure is only patience, measured in fathoms."],
  ["Wind", "Gale Slash", "Attack", null, "Instant", "A crescent of razor wind leaves the caster's hand faster than the eye can follow.", "The wind has never once apologized."],
  ["Wind", "Vortex Cage", "Debuff", null, "Channeled", "Spiralling winds tighten around the foe, stealing breath and balance turn after turn.", "A cage with no bars holds best."],
  ["Wind", "Tempest Collapse", "Attack", null, "Charged", "The sky folds inward on a single point, and everything in it is pulled to the centre.", "Storms end. This one finishes."],
  ["Earth", "Stone Fist", "Physical", null, "Instant", "Granite sheathes the caster's arm for one bone-breaking blow.", "The mountain lends its hand, never its mercy."],
  ["Earth", "Tremor Field", "Environmental", null, "Instant", "The ground ripples like water, and footing becomes a memory.", "Every battlefield belongs to the earth first."],
  ["Earth", "Tectonic Ruin", "Attack", null, "Charged", "Plates of bedrock rear up and slam together where the foe stands.", "Continents have collided over less."],
  ["Lightning", "Spark Bolt", "Attack", null, "Instant", "A needle of lightning leaps from fingertip to target before the thought is finished.", "Faster than regret."],
  ["Lightning", "Chain Arc", "Attack", null, "Continuous", "Lightning skips from point to point, restless, never striking the same way twice.", "It does not choose a target. It chooses a path."],
  ["Lightning", "Thunderclap Sovereign", "Attack", null, "Instant", "The whole sky discharges through one upraised hand.", "When it speaks, the thunder is only the echo."],
  ["Void", "Null Touch", "Drain", null, "Instant", "A palm of nothingness brushes the foe and takes a little of what they are.", "The void does not steal. It simply keeps."],
  ["Void", "Void Fracture", "Hybrid", "Debuff", "Instant", "A crack opens in the air, wounding the foe and swallowing the force of their next blow.", "Some doors open onto less than nothing."],
  ["Void", "Oblivion Pull", "Hybrid", "Debuff", "Charged", "A widening tear in the world drags the foe halfway out of existence.", "Half of you returning is still a kind of mercy."],
  ["Arcane", "Arcane Bolt", "Attack", null, "Instant", "A clean bolt of raw mana, owing nothing to any element.", "Before fire or frost, there was simply will given shape."],
  ["Arcane", "Runic Amplifier", "Buff", null, "Trap", "A rune hangs unseen in the air, waiting to pour its strength into the caster's next strike.", "The best spell is the one cast before the fight."],
  ["Arcane", "Spell Cascade", "Attack", null, "Channeled", "Three bolts of mana fall in sequence, each fed by the one before.", "One spell is a statement. Three are an argument."],
  ["Light", "Radiant Strike", "Attack", null, "Instant", "A beam of pure light lances out, too bright to look at and too fast to dodge.", "Dawn has never lost a duel."],
  ["Light", "Aura Veil", "Defense", null, "Trap", "A shimmering veil waits around the caster and hardens the instant a blow lands.", "Light bends for those who ask kindly."],
  ["Light", "Divine Convergence", "Hybrid", "Debuff", "Charged", "Every ray in the sky bends to a single point, searing the foe and blinding their aim.", "All light arrives eventually. This arrives at once."],
  ["Shadow", "Shadow Grasp", "Drain", null, "Instant", "Tendrils of shadow seize the foe and drink a measure of their life.", "Your shadow has always been hungry."],
  ["Shadow", "Umbral Cloak", "Defense", null, "Instant", "Darkness wraps the caster like a second skin, and blows land on nothing.", "You cannot strike what the dark has already claimed."],
  ["Shadow", "Soul Devour", "Drain", null, "Channeled", "The caster's shadow opens like a mouth and feeds, turn after turn.", "It eats slowly, so that you may watch."],
  ["Nature", "Thorn Whip", "Attack", null, "Instant", "A barbed vine cracks through the air and bites deep.", "The forest remembers every axe."],
  ["Nature", "Verdant Surge", "Hybrid", "Regen", "Instant", "A rush of green life strikes the foe and knits the caster's wounds in the same breath.", "What the wild takes, it also gives."],
  ["Nature", "World Root", "Summon", null, "Continuous", "A vast root heaves up from below, alive and watchful, and fights at the caster's side.", "Older than the first name for tree."],
  ["Frost", "Ice Shard", "Attack", null, "Instant", "A splinter of ancient ice, sharp enough to pierce steel.", "Winter needs only a small opening."],
  ["Frost", "Frost Field", "Environmental", null, "Continuous", "Cold creeps outward across the ground until the whole field belongs to winter.", "The cold does not arrive. It was always here, waiting."],
  ["Frost", "Glacial Entombment", "Hybrid", "Debuff", "Charged", "A glacier closes around the foe, sealing body and resolve alike in blue ice.", "Glaciers keep what they are given."],
  ["Chaos", "Entropy Bolt", "Attack", null, "Instant", "A bolt that cannot decide what it is, and hurts differently every time.", "Roll the dice. The dice are also on fire."],
  ["Chaos", "Reality Crack", "Hybrid", "Environmental", "Instant", "The world splinters like glass where the spell lands, and the ground is never quite the same.", "Reality is a habit, and habits break."],
  ["Chaos", "Unraveling", "Attack", null, "Instant", "Everything the spell touches forgets, briefly, how to exist.", "It may do nothing. It may do everything. It has never done the same thing twice."],
];

const TIER_BY_ORDER: Tier[] = ["Basic", "Advanced", "Mega"];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DATABASE_URL not set; cannot seed.");
    process.exit(1);
  }

  let ownerId: number;
  const [archivist] = await db.select().from(p0Users).where(eq(p0Users.email, "archivist@arcanis.app")).limit(1);
  if (archivist) {
    ownerId = archivist.id;
  } else {
    const [inserted] = await db
      .insert(p0Users)
      .values({ email: "archivist@arcanis.app", username: "Arcanis", emailVerified: true, role: "admin", nameChosen: true })
      .$returningId();
    ownerId = inserted.id;
  }

  const perElement = new Map<Element, number>();
  let created = 0;
  let updated = 0;
  for (const [element, name, category, secondary, castType, flavorText, loreLine] of BASE_SPELLS) {
    const index = perElement.get(element) ?? 0;
    perElement.set(element, index + 1);
    const tier = TIER_BY_ORDER[index];
    const spec = computeBudgetSpec({ tier, element, category, castType });
    const a = defaultAllocation(spec);
    const fields = {
      ownerId,
      name,
      element,
      category,
      secondaryCategory: secondary,
      castType,
      tier,
      damageMin: a.damage_min,
      damageMax: a.damage_max,
      mpCost: a.mp_cost,
      willCostMin: a.will_cost_min,
      willCostMax: a.will_cost_max,
      castTimeMs: a.cast_time_ms,
      interruptionThreshold: a.interruption_threshold,
      maintenanceCostPerTurn: a.maintenance_cost_per_turn,
      drainRatio: a.drain_ratio,
      flavorText,
      loreLine,
      potentialTier: tier,
      isPlatformSpell: true,
      isPublic: true,
      removedAt: null,
    };
    const [existing] = await db.select({ id: p0Spells.id }).from(p0Spells).where(and(eq(p0Spells.name, name), eq(p0Spells.isPlatformSpell, true))).limit(1);
    if (existing) {
      await db.update(p0Spells).set(fields).where(eq(p0Spells.id, existing.id));
      updated++;
    } else {
      await db.insert(p0Spells).values({ id: nanoid(36), ...fields, imageUrl: "", generationMetadata: { source: "seed", budget: Math.round(spec.budget * 10) / 10 } });
      created++;
    }
  }

  // Earlier seeds that are not part of the Master Doc list: hide, never delete.
  const [hidden] = await db
    .update(p0Spells)
    .set({ isPublic: false, removedAt: new Date() })
    .where(and(eq(p0Spells.isPlatformSpell, true), eq(p0Spells.isPublic, true), notInArray(p0Spells.name, BASE_SPELLS.map((s) => s[1]))));

  console.log(`Base spells: ${created} created, ${updated} updated, ${(hidden as { affectedRows?: number }).affectedRows ?? 0} older seeds hidden.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
