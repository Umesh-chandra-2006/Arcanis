// Coarse browser fingerprint sent as `x-arc-fp`. The server only uses it
// together with the network prefix to stop repeat signup grants (A3); the
// primary device signal is the httpOnly device cookie.
let cached: Promise<string> | null = null;

function canvasSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 30;
    const g = canvas.getContext("2d");
    if (!g) return "";
    g.textBaseline = "top";
    g.font = "14px 'Arial'";
    g.fillStyle = "#c9a24b";
    g.fillRect(2, 2, 60, 20);
    g.fillStyle = "#0b0a08";
    g.fillText("Arcanis ✨", 4, 6);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

async function compute(): Promise<string> {
  const parts = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    String(navigator.hardwareConcurrency ?? ""),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasSignal(),
  ].join("|");
  if (!crypto?.subtle) return "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getFingerprint(): Promise<string> {
  cached ??= compute().catch(() => "");
  return cached;
}
