// Share text and channel links (task M5). Pure, so the wording is tested once.

export function shareText(spellName: string): string {
  return `✨ I spoke "${spellName}" into being in Arcanis, and the forge made it real. Balanced, sealed and ready. Think your magic can top it?`;
}

export function whatsappUrl(spellName: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${shareText(spellName)} ${url}`)}`;
}

export function xUrl(spellName: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(shareText(spellName))}&url=${encodeURIComponent(url)}`;
}

/** Discord has no share link: this is pasted, and the URL unfurls into the card. */
export function discordText(spellName: string, url: string): string {
  return `✨ **${spellName}**, forged in Arcanis. Think your magic can top it?\n${url}`;
}
