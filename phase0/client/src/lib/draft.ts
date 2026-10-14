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
    if (!draft.name.trim() && !draft.description.trim()) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Private mode or storage disabled: the visitor simply starts fresh in the Lab.
  }
}

function readRaw(): (SpellDraft & { delivered: boolean }) | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SpellDraft> & { savedAt?: number; delivered?: boolean };
    if (typeof parsed.name !== "string" || typeof parsed.description !== "string") return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!parsed.name.trim() && !parsed.description.trim()) return null;
    return { name: parsed.name.slice(0, 64), description: parsed.description.slice(0, 1000), delivered: parsed.delivered === true };
  } catch {
    return null;
  }
}

/** The kept design, if any. It stays until the spell is made, so a reload or a detour through sign-in never loses it. */
export function readDraft(): SpellDraft | null {
  const draft = readRaw();
  return draft ? { name: draft.name, description: draft.description } : null;
}

/** A kept design the Lab has not opened yet: signing in sends the player straight to it, once. */
export function hasUndeliveredDraft(): boolean {
  const draft = readRaw();
  return !!draft && !draft.delivered;
}

export function markDraftDelivered(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(raw), delivered: true }));
  } catch {
    // Nothing to mark.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
