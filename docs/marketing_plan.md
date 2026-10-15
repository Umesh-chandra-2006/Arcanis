# Arcanis: Marketing Plan (v1.0, 2026-10-15)

**Status:** draft agreed in conversation with the founder on 2026-10-15; the four decisions in Section 8 are still open. The working checklist is Track M in `docs/tasks.md`. **Founder rule (2026-10-15): no other work (Track B battles or anything else) starts until Track M and the Phase 1a launch are done.**

Wording: the founder calls the creation soft launch "Phase 0" and the battle release "Phase 1"; the docs call them Phase 1a and Phase 1b. This plan uses the docs' names.

---

## 1. Three problems to fix before any real push

1. **Capacity.** Production allows `DAILY_CREATION_LIMIT` = 50 creations a day on free provider tiers: about 10 to 15 new players a day before newcomers see "the forge is cooling". One Reddit post that lands brings thousands of visitors in an hour, and most would hit the queue. A creation costs about $0.001 to $0.003 (`docs/cost_sheet.md`), so 10,000 creations is roughly $10 to $30. The fix: a payment method with a hard monthly cap on the text provider (Groq, and the Gemini fallback), then raise the creation limit for launch days. Until then, stay at cohort scale. Check `docs/provider_quotas.md` for the paid-tier limits first.
2. **Domain.** `arcanis-three.vercel.app` reads as a side project, and every share link posted now carries it for good. Buy a domain (about $10 a year, e.g. `arcanis.gg` or `playarcanis.com`) before posting any public link. Point it at Vercel, then update `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` on Render and `VITE_PUBLIC_URL` on Vercel, redeploy both, and re-check a share link on Discord, X and WhatsApp.
3. **Thin retention in Phase 1a.** A player spends the signup Spark (3), forges a few spells, votes in the Codex, and has nothing to come back for until battles. So the goal now is **not** "known everywhere". It is:
   - collect players who opt in to update emails, for the battle launch;
   - fill the Codex with great spells, so the battle launch shows a living world;
   - learn which prompts and which channels convert.

   Keep the "everywhere" moment (Product Hunt, Show HN, press) for the battle release: most of those platforms give one launch day.

## 2. Positioning

- **Lead with the game, not the AI:** "Describe any spell you can imagine. Arcanis forges it into a balanced, ranked spell card." "Balanced" is the differentiator; every AI toy makes things, Arcanis makes things that fit a ruleset.
- **The card art is element art, not AI images.** Many fantasy and art communities (Reddit especially) are hostile to AI art. Say it honestly: the AI designs the spell, not the art.
- **The hidden Will system** ("your mage's will is hidden; you only feel it") is a hook for the battle-launch messaging.

## 3. Phase A: the invited cohort (now to about week 2, current capacity)

- Hand-invite 20 to 30 people: friends, classmates, one or two Discord servers the founder is already in. Share links already carry a referral code (`?ref=`), so referrals are tracked from day one.
- **The founder's campus is the best early channel.** A student game builder has a story clubs and fest organisers will help with. A "forge a spell" stall or contest at a college fest is a concentrated, in-person first wave where every creation is watched by a crowd.
- Watch every creation and every feedback note. Copy the best player prompts into the example prompts.

## 4. Phase B: steady organic growth (weeks 2 to 6, after the cap is lifted)

### Content engine (main channel, costs only time)
- **Short videos** (YouTube Shorts, Instagram Reels, TikTok): "I asked for [absurd spell], here's what Arcanis made." One prompt, screen recording, the card reveal, 15 to 30 seconds. Daily. Use the funniest or most surprising player prompts, credited.
- **Build in public on X:** balance decisions, the Power Budget, the hidden Will design, cost per spell. Indie dev audiences follow builders.
- **Spell of the day:** the top-voted Codex spell, posted as its share card. Gives players a reason to make good spells and to vote.

### Communities (join and contribute before posting; most ban drive-by promotion)
- **Reddit:** r/magicbuilding (closest fit; disclose the AI part upfront), r/worldbuilding, r/DnD and r/DnDHomebrew (spells as homebrew inspiration), r/WebGames, r/playmygame, r/IndieGaming, r/IndianGaming. Post a card and a story, never a bare link.
- **Discord:** TTRPG, homebrew and fantasy-writing servers. Ask moderators first.
- **Creators:** small TTRPG, fantasy and indie-game YouTubers and streamers (1k to 50k followers) answer DMs. Offer early access and a "forge your channel's signature spell" segment.

### Product-led loops (built in the product; each needs the founder's go)
- **Share buttons on the reveal:** share to X and WhatsApp with prefilled text ("I forged *Name* in Arcanis"), at the moment pride peaks. WhatsApp matters for an Indian audience. Recommended first build: small, and it multiplies everything else.
- **Weekly forge challenge:** a theme ("spells that cost the caster something"), voted in the Codex, the winner featured on the landing page and socials. Votes exist; it needs a theme and a "featured" slot. Prizes must not be Spark (never earned through gameplay): recognition now, cosmetics later. Founder to confirm.
- **Referral nudge after the first spell.** Today the inviter gets 3 Spark and the invitee 0 (`SPARK.referralInviter`, `SPARK.referralInvitee`). Any change to that is a Spark rule change and needs the founder.
- **Channel attribution:** capture UTM parameters (or a channel tag) at the first visit and carry them to signup, so `/admin/metrics` can show signups per channel. Check whether anything exists first; probably not.

## 5. Phase C: the battle launch (Phase 1b)

- Launch day: Product Hunt, Show HN ("balanced AI spell generation with a hidden-stat battle engine" is a real technical story), r/WebGames, an itch.io page.
- Reactivate every opted-in player with the one planned update email; a founding-mage badge for Phase 1a players.
- Indie-game newsletters and AI-tool roundups: a GIF and a two-line pitch.

## 6. What to measure

| Metric | Why |
|---|---|
| Visit to signup, signup to first spell | Is the landing page and first creation working? |
| Shares per creation, referral signups per share | The viral loop; the most important number |
| Codex opt-in rate, votes per player | Is the social layer alive? |
| Update-email opt-in rate | Size of the battle-launch audience |
| Signups per channel | Where to spend time (needs the attribution item in Section 4) |

Watch daily during the cohort: `/admin/metrics`, `/admin/feedback`, `pnpm cost-report --days 1` (quota errors, refunds, 2c rate, moderation queue).

## 7. Phase 1a launch definition

Phase 1a counts as launched when: `track-a` is merged into `main` and both services deploy from `main`; the domain is live with share links verified; the invited cohort has used it for a week with the cost and quota numbers watched; and the site is opened to the public (Phase B channels start). Then record the Gate 1a evaluation date (4 to 6 weeks after opening) in `PROGRESS.md`.

## 8. Open founder decisions

1. **Provider budget:** a capped payment method on the text provider so the creation limit can rise? Recommendation: yes, $10 to $20 monthly cap.
2. **Domain:** buy one now? Recommendation: yes, before any public link.
3. **Timing:** keep the big launch for battles; treat now as cohort plus steady organic growth? Recommendation: yes.
4. **First build:** share buttons, weekly challenge, or attribution? Recommendation: share buttons first.
