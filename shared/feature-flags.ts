/**
 * Centralized Feature Flags Registry for Arcanis.
 * Controls active vs dormant systems across Phase 1 and future phases.
 * 
 * Per Phase Scope Reconciliation: All Phase 2+ flags default to false.
 */
export const FEATURE_FLAGS = {
  progression: false,       // Circle XP, Spell XP, Elemental XP
  circleGating: false,      // Circle tier gating
  towerAssessment: false,   // Magic Tower arcs
  quests: false,            // Quests system
  animusRanked: false,      // Ranked PvP
  halls: false,             // Guilds/Halls
  community: false,         // Leaderboards & showcase
  freestyle: false,         // LLM battle mode
  fusion: false,            // Multi-cast
  subscriptions: false,     // Payment paywalls
  spellAnimations: false,   // Active spell battle animations
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
