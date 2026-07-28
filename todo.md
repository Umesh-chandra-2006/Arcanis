# ARCANIS Phase 1 — Project TODO

## Core Infrastructure
- [x] Database schema: users, spells, summon_profiles, decks, battles, lab_slots
- [x] Shared types, constants, validation schemas
- [x] Element system and amicability table
- [x] Avatar system with stat variations
- [x] LLM provider abstraction (Groq/Gemini/OpenRouter)
- [x] Image generation integration (Hugging Face FLUX)
- [x] Redis namespacing: battle state, matchmaking, lab slots, research, rate limiting

## Authentication & User Management
- [ ] User registration with avatar selection
- [ ] User login with JWT
- [ ] Session management and auth middleware
- [ ] User profile/settings page

## The Lab (Spell Creation)
- [ ] Spell creation form UI
- [x] LLM call for spell generation
- [x] Validation layer with hard stat caps
- [x] Image generation for spell cards
- [x] Research timer queue with Redis tracking
- [x] Weekly spell slot rate limiting (Redis)
- [x] Spell research status polling endpoint
- [x] LLM rate limiting (Groq free tier: 30 req/min, 14.4k tokens/min)

## Spell Library & Cards
- [ ] Spell card component with tier-colored borders (Basic/Advanced/Mega)
- [ ] Element icon display
- [ ] Spell stats modal overlay
- [ ] Spell library grid (owned + 36 platform spells)
- [ ] Research queue panel with countdown stopwatches
- [ ] Spell library endpoints (list, detail, filter)
- [ ] Seed 36 platform base spells

## Dashboard
- [ ] HP/MP bar display (no Will bar)
- [ ] Avatar display
- [ ] Spell count
- [ ] Recent battle history
- [ ] Quick-battle CTA button

## Open Brawl Matchmaking
- [ ] Terrain selection UI with preview
- [ ] Matchmaking queue (Redis sorted set)
- [ ] Rule-based bot opponent for empty queue
- [ ] Battle session creation
- [ ] Battle queue endpoints

## Real-Time Battle System (Socket.io)
- [ ] WebSocket server setup with Socket.io
- [ ] Battle state machine (turn-based, 30s per turn)
- [ ] Turn resolution logic:
  - [ ] Spell casting with minigame integration
  - [ ] Trap setting and triggering
  - [ ] Continuous/Channeled maintenance
  - [ ] Interruption system
  - [ ] Summon state tracking and actions
  - [ ] Terrain modifiers
  - [ ] HP/MP/Will updates
  - [ ] Win condition checking
- [ ] Disconnect handling (auto-cast, forfeit after 60s)
- [ ] Battle state persistence to database
- [ ] Battle log with qualitative Will feedback

## Minigames (Spell Damage Resolution)
- [ ] Timing Strike (Fire, Lightning, Chaos)
- [ ] Pattern Match (Water, Frost, Nature)
- [ ] Rapid Tap (Wind, Air)
- [ ] Hold & Release (Earth, Physical)
- [ ] Quick Reaction (Void, Shadow, Arcane)
- [ ] Sequence Input (Light)

## Spell Mechanics
- [ ] Cast types: Instant, Trap, Charged, Continuous, Channeled
- [ ] Categories: Attack, Defense, Regen, Debuff, Buff, Drain, Environmental, Summon, Physical, Hybrid
- [ ] Will system (internal 0-500, qualitative feedback only)
- [ ] Will states: Sharp (300-500), Focused (150-299), Strained (80-149), Failing (30-79), Broken (0-29)
- [ ] Summon mechanics: autonomous vs controlled, unstable state on low Will
- [ ] Trap mechanics: visible vs hidden, condition-based triggering
- [ ] Interruption thresholds by tier
- [ ] Variable damage formula for Continuous/Channeled

## Frontend Pages
- [ ] Landing page with sign up/login CTA
- [ ] Register page with avatar selection
- [ ] Login page
- [ ] Dashboard page
- [ ] Lab page (spell creation + library)
- [ ] Battle Select page (terrain preview + queue)
- [ ] Battle page (full battle UI)
- [ ] Settings page
- [ ] Spell Detail modal overlay

## UI/UX Polish
- [ ] Elegant, refined visual design
- [ ] Smooth animations and transitions
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility (keyboard nav, focus rings, ARIA)
- [ ] Dark/light theme support
- [ ] Loading states and skeletons
- [ ] Empty states
- [ ] Error handling and user feedback
- [ ] Spell card visual polish
- [ ] Battle UI polish

## Testing & Integration
- [ ] Unit tests for spell validation
- [ ] Unit tests for battle mechanics
- [ ] End-to-end spell creation flow
- [ ] End-to-end battle flow (2 players)
- [ ] Disconnect and timeout handling
- [ ] Rate limit behavior verification
- [ ] Validation layer stress test

## Deployment & Documentation
- [ ] Environment variable setup
- [ ] Database migrations
- [ ] Redis connection setup
- [ ] GitHub Actions CI/CD (optional for Phase 1)
- [ ] Deployment guide
- [ ] README with setup instructions
