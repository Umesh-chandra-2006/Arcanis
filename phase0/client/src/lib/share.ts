/** Public share link for a spell, carrying the sharer's referral code (task A10). */
export function shareUrlFor(spellId: string, referralCode?: string | null): string {
  const base = ((import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim() || window.location.origin).replace(/\/+$/, "");
  const url = `${base}/spell/${spellId}`;
  return referralCode ? `${url}?ref=${encodeURIComponent(referralCode)}` : url;
}

/** Invite link to the home page carrying the inviter's code. */
export function inviteUrl(referralCode: string): string {
  const base = ((import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim() || window.location.origin).replace(/\/+$/, "");
  return `${base}/?ref=${encodeURIComponent(referralCode)}`;
}
