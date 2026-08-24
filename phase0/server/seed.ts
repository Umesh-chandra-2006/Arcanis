import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { p0Users, p0Spells } from "../drizzle/schema";
import { computeSpellStats } from "./power-budget";

interface SeedSpell {
  name: string;
  element: "Fire" | "Water" | "Earth" | "Wind";
  category: "Attack" | "Defense" | "Regen" | "Debuff";
  flavorText: string;
  loreLine: string;
  shareCount: number;
}

const SEED_SPELLS: SeedSpell[] = [
  {
    name: "Ember Lance",
    element: "Fire",
    category: "Attack",
    flavorText: "A spear of molten fire erupts from the caster's palm and punches through the air.",
    loreLine: "The first weapon the Tower ever forged, still smoldering.",
    shareCount: 12,
  },
  {
    name: "Ash Veil",
    element: "Fire",
    category: "Defense",
    flavorText: "Choking ash spirals around the caster, devouring incoming blows in smoldering silence.",
    loreLine: "What the fire burns, the ash remembers.",
    shareCount: 8,
  },
  {
    name: "Cinder Hearth",
    element: "Fire",
    category: "Regen",
    flavorText: "Warm embers settle over wounds, sealing them with the patient heat of a hearth.",
    loreLine: "The Tower's first mercy was made of coals.",
    shareCount: 5,
  },
  {
    name: "Pyre Curse",
    element: "Fire",
    category: "Debuff",
    flavorText: "Gouts of clinging flame latch onto the target, burning willpower to brittle cinders.",
    loreLine: "A curse that whispers: everything you love is tinder.",
    shareCount: 9,
  },
  {
    name: "Tide Guillotine",
    element: "Water",
    category: "Attack",
    flavorText: "A blade of pressurized water slices through the battlefield with the weight of an ocean.",
    loreLine: "The sea has no mercy, only patience.",
    shareCount: 10,
  },
  {
    name: "Glacial Bulwark",
    element: "Water",
    category: "Defense",
    flavorText: "A wall of black ice rises, absorbing impacts in layers of frozen defiance.",
    loreLine: "Ice remembers every blow it ever refused.",
    shareCount: 7,
  },
  {
    name: "Tidewater Balm",
    element: "Water",
    category: "Regen",
    flavorText: "Cool saltwater gathers over wounds, drawing out pain like the tide draws the shore.",
    loreLine: "The ocean heals what it has broken.",
    shareCount: 6,
  },
  {
    name: "Drown the Will",
    element: "Water",
    category: "Debuff",
    flavorText: "A creeping cold floods the target's mind, muffling every thought beneath black water.",
    loreLine: "Some silences are heavier than stone.",
    shareCount: 4,
  },
  {
    name: "Stonebreaker Gale",
    element: "Wind",
    category: "Attack",
    flavorText: "A screaming vortex of wind and gravel tears across the ground, wearing down stone and flesh alike.",
    loreLine: "The wind is patient. Mountains are not.",
    shareCount: 11,
  },
  {
    name: "Wall of Still Air",
    element: "Wind",
    category: "Defense",
    flavorText: "The air itself thickens into an invisible barrier that swallows force before it arrives.",
    loreLine: "You cannot strike what you cannot find.",
    shareCount: 3,
  },
  {
    name: "Spring Breath",
    element: "Wind",
    category: "Regen",
    flavorText: "A warm breeze carries the smell of rain through the caster, knitting torn flesh back together.",
    loreLine: "The first wind of spring is a doctor.",
    shareCount: 6,
  },
  {
    name: "Searing Dust",
    element: "Earth",
    category: "Debuff",
    flavorText: "Dry earth and sand grind into the target's joints, caking every movement with the desert's weight.",
    loreLine: "The desert keeps what the desert takes.",
    shareCount: 5,
  },
];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DATABASE_URL not set — cannot seed.");
    process.exit(1);
  }

  const [archivist] = await db
    .select()
    .from(p0Users)
    .where(eq(p0Users.email, "archivist@arcanis.app"))
    .limit(1);

  let ownerId: number;
  if (archivist) {
    ownerId = archivist.id;
  } else {
    const [inserted] = await db
      .insert(p0Users)
      .values({
        email: "archivist@arcanis.app",
        username: "tower_archivist",
        emailVerified: true,
        role: "admin",
      })
      .$returningId();
    ownerId = inserted.id;
    console.log(`Created demo user #${ownerId} (archivist@arcanis.app)`);
  }

  let created = 0;
  for (const seed of SEED_SPELLS) {
    const [existing] = await db
      .select({ id: p0Spells.id })
      .from(p0Spells)
      .where(eq(p0Spells.name, seed.name))
      .limit(1);
    if (existing) continue;

    const stats = computeSpellStats(seed.element, seed.category, "Instant", "Basic");

    await db.insert(p0Spells).values({
      id: nanoid(36),
      ownerId,
      name: seed.name,
      element: seed.element,
      category: seed.category,
      castType: "Instant",
      tier: "Basic",
      damageMin: stats.damage_min,
      damageMax: stats.damage_max,
      mpCost: stats.mp_cost,
      willCostMin: stats.will_cost_min,
      willCostMax: stats.will_cost_max,
      castTimeMs: stats.cast_time_ms,
      scalingFactor: stats.scaling_factor,
      mpModifier: stats.mp_modifier,
      interruptionThreshold: stats.interruption_threshold,
      maintenanceCostPerTurn: stats.maintenance_cost_per_turn,
      flavorText: seed.flavorText,
      loreLine: seed.loreLine,
      assessmentQuestion: null,
      imageUrl: "",
      shareCount: seed.shareCount,
      generationMetadata: {
        llmProvider: "seed",
        pbUsed: stats.pb_used,
        pbTotal: stats.pb_total,
        verification: "seeded",
      },
      isPlatformSpell: true,
    });
    created++;
  }

  console.log(`Seeded ${created} platform spells.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});