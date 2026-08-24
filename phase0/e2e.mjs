const BASE = "http://localhost:3100/api/trpc/";

async function post(proc, body, token) {
  const res = await fetch(`${BASE}${proc}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ json: body === undefined ? null : body }),
  });
  const parsed = await res.json();
  return { status: res.status, parsed };
}

async function get(proc, token) {
  const url = `${BASE}${proc}?input=${encodeURIComponent(JSON.stringify({ json: null }))}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const parsed = await res.json();
  return { status: res.status, parsed };
}

function unwrap(r) {
  const d = r.parsed?.result?.data?.json ?? r.parsed?.result?.data;
  if (d?.error || r.status >= 400) return d ?? r.parsed;
  return d;
}

const email = `e2e-${Date.now()}@example.com`;
console.log("EMAIL:", email);

const magic = await post("auth.requestMagicLink", { email, page: "/", redirectUrl: `http://localhost:3100/auth/verify` });
console.log("1. requestMagicLink:", JSON.stringify(unwrap(magic)));

const token = new URL(unwrap(magic).devUrl).searchParams.get("token");
const verify = await post("auth.verifyMagicLink", { token });
const jwt = unwrap(verify).token;
console.log("2. verifyMagicLink: isNewUser=", unwrap(verify).isNewUser, "username=", unwrap(verify).user.username);

const bal = await get("spells.sparkBalance", jwt);
console.log("3. sparkBalance:", JSON.stringify(unwrap(bal)));

const tx = await get("spells.sparkTransactions", jwt);
const txList = unwrap(tx);
console.log("4. sparkTransactions count:", txList?.length, "first:", JSON.stringify(txList?.[0]));

const featured = await get("spells.featured");
const fList = unwrap(featured);
console.log("5. featured count:", fList?.length, "sample name:", fList?.[0]?.name);

const me = await get("auth.me", jwt);
console.log("6. me:", JSON.stringify(unwrap(me)));

const created = await post("spells.create", { name: "Crimson Chain", element: "Fire", category: "Attack", description: "A bolt of searing crimson lightning that chains between enemies and leaves the air smelling of ozone and burnt iron." }, jwt);
const c = unwrap(created);
console.log("7. create:", c.error ? JSON.stringify(c.error) : JSON.stringify({ id: c.spell?.id, name: c.spell?.name, stats: { damage: [c.spell?.damageMin, c.spell?.damageMax], mpCost: c.spell?.mpCost, castTimeMs: c.spell?.castTimeMs }, image: c.spell?.imageUrl?.slice(0, 40), sparkBalance: c.sparkBalance }));

const my = await get("spells.mySpells", jwt);
const myList = unwrap(my);
console.log("8. mySpells count:", myList?.length, "names:", myList?.map((s) => s.name).join(", "));

if (c.spell?.id) {
  const pubRes = await fetch(`${BASE}spells.getSpellPublic?input=${encodeURIComponent(JSON.stringify({ json: { spellId: c.spell.id } }))}`);
  const pubParsed = await pubRes.json();
  const p = pubParsed?.result?.data?.json ?? pubParsed?.result?.data;
  console.log("9. getSpellPublic:", JSON.stringify({ id: p?.id, name: p?.name, ownerUsername: p?.ownerUsername, shareCount: p?.shareCount, image: p?.imageUrl?.slice(0, 30) }));

  const shareRes = await post("spells.recordShareOpen", { spellId: c.spell.id });
  console.log("10. recordShareOpen:", JSON.stringify(unwrap(shareRes)));
}

const used = await post("auth.verifyMagicLink", { token });
console.log("11. reuse used token:", JSON.stringify(unwrap(used)));

const track = await post("analytics.track", { eventType: "e2e_test", sessionId: "e2e-session", metadata: { spellId: c.spell?.id ?? null } });
console.log("12. analytics.track:", JSON.stringify(unwrap(track)));

const daily = await get("analytics.dailyMetrics");
const dm = unwrap(daily);
console.log("13. dailyMetrics rows:", Array.isArray(dm) ? dm.length : "n/a", "latest:", JSON.stringify(Array.isArray(dm) ? dm[0] : dm));
