// Try before signup (Master Doc 23.2, v7.6): a visitor writes their first spell
// on the landing page, signs in, and finds it waiting in the Lab. The design
// lives only in this browser. Nothing is sent or stored on the server until the
// signed-in player presses Create, so no anonymous request can reach a provider.
const KEY = "arc_spell_draft";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SpellDraft {
  name: string;
  description: string;
}

export function saveDraft(draft: SpellDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Private mode or storage disabled: the visitor simply starts fresh in the Lab.
  }
}

export function readDraft(): SpellDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SpellDraft> & { savedAt?: number };
    if (typeof parsed.name !== "string" || typeof parsed.description !== "string") return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return { name: parsed.name.slice(0, 64), description: parsed.description.slice(0, 1000) };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
