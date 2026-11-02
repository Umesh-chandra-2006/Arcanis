// Share text and channel links (task M5). Pure, so the wording is tested once.

export function shareText(spellName: string): string {
  return `✨ I just forged "${spellName}" in Arcanis. Describe any spell you can imagine and it becomes real. Bet yours can't beat mine.`;
}

export function whatsappUrl(spellName: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${shareText(spellName)} ${url}`)}`;
}

export function xUrl(spellName: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(shareText(spellName))}&url=${encodeURIComponent(url)}`;
}

/** Discord has no share link: this is pasted, and the URL unfurls into the card. */
export function discordText(spellName: string, url: string): string {
  return `✨ **${spellName}**, forged in Arcanis. Bet yours can't beat it.\n${url}`;
}
