import type { CreationCategory, Element } from "@shared/taxonomy";

/**
 * Ready-made spell ideas for the Lab (Master Doc 18.2, v7.6). Fixed text that
 * fills the form: no AI call, no Spark. The player still presses Create.
 */
export interface ExamplePrompt {
  name: string;
  element: Element;
  category: CreationCategory;
  description: string;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    name: "Black Dragon's Breath",
    element: "Fire",
    category: "Attack",
    description: "A torrent of black flame shaped like a dragon's head. Slow to gather, devastating when it lands, and it leaves the air tasting of ash.",
  },
  {
    name: "Glacier Aegis",
    element: "Frost",
    category: "Defense",
    description: "A curved wall of blue ice that rises in an instant and drinks a blow before shattering into harmless snow.",
  },
  {
    name: "Rootmother's Mercy",
    element: "Nature",
    category: "Regen",
    description: "Pale green roots curl around the caster's wounds and knit them shut, slowly, with the smell of rain on soil.",
  },
  {
    name: "Thief of Dusk",
    element: "Shadow",
    category: "Drain",
    description: "A ribbon of living shadow slips into the enemy and pulls their warmth back along it to the caster.",
  },
  {
    name: "Static Shroud",
    element: "Lightning",
    category: "Debuff",
    description: "A crackling haze clings to the target, making every muscle twitch a moment too late.",
  },
  {
    name: "Needle of Stars",
    element: "Arcane",
    category: "Attack",
    description: "A single thread of starlight, cast in a blink. It barely stings, but it never misses and costs almost nothing.",
  },
];
