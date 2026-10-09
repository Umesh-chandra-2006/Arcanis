# Balance harness report (Phase 1a, Power Budget)

- Date: 2026-10-09T21:03:47.670Z
- Mode: live Layer 1
- Corpus entries: 135 (120 realistic ok, 15 adversarial ok, 0 provider failures)
- Providers: groq:openai/gpt-oss-120b 72, gemini:gemini-flash-lite-latest 60, gemini:gemini-flash-latest 3
- Median Layer 1 latency: 1660 ms

## Conformance (realistic prompts)

- Clamped into range: 0%
- Over budget, rescaled down: 53%
- Under the floor, raised: 23%
- Malformed, fell back to default profile (2a flag, escalates to 2c): 0%
- Budget used after 2a: mean 0.95 of budget (bounds 0.85 to 1.00)
- Same classification, different descriptions, different stats: 60 of 60 pairs

## By category

| Category | n | clamped | rescaled down | raised to floor | fallback | damage avg (sd) | MP avg | Will avg | dmg/MP | dmg/Will | cast ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Attack | 24 | 0% | 50% | 21% | 0% | 27.1 (6.5) | 14.8 | 19.4 | 1.81 | 1.38 | 550 |
| Debuff | 24 | 0% | 54% | 25% | 0% | 26.4 (7.3) | 13.6 | 17.4 | 1.91 | 1.50 | 508 |
| Defense | 24 | 0% | 83% | 4% | 0% | 22.2 (7.3) | 15.3 | 19.6 | 1.43 | 1.11 | 573 |
| Drain | 24 | 0% | 17% | 42% | 0% | 26.8 (6.3) | 13.1 | 17.5 | 2.03 | 1.52 | 491 |
| Regen | 24 | 0% | 58% | 21% | 0% | 23.6 (5.7) | 14.9 | 19.2 | 1.57 | 1.22 | 558 |

## By element

| Element | n | clamped | rescaled down | raised to floor | fallback | damage avg (sd) | MP avg | Will avg | dmg/MP | dmg/Will | cast ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Arcane | 10 | 0% | 50% | 30% | 0% | 24.2 (7.7) | 13.9 | 18.4 | 1.71 | 1.29 | 527 |
| Chaos | 10 | 0% | 60% | 20% | 0% | 24.4 (5.8) | 14.2 | 18.6 | 1.72 | 1.31 | 530 |
| Earth | 10 | 0% | 60% | 30% | 0% | 24.1 (7.4) | 13.9 | 18.2 | 1.71 | 1.30 | 531 |
| Fire | 10 | 0% | 50% | 0% | 0% | 25.9 (5.5) | 14.5 | 18.4 | 1.79 | 1.40 | 515 |
| Frost | 10 | 0% | 50% | 30% | 0% | 23.9 (7.2) | 13.8 | 18.7 | 1.72 | 1.26 | 523 |
| Light | 10 | 0% | 50% | 30% | 0% | 26.7 (7.5) | 14.7 | 19.1 | 1.80 | 1.38 | 557 |
| Lightning | 10 | 0% | 50% | 20% | 0% | 25.9 (6.9) | 14.6 | 18.1 | 1.76 | 1.42 | 542 |
| Nature | 10 | 0% | 50% | 30% | 0% | 25.4 (7.6) | 14.8 | 19.0 | 1.69 | 1.35 | 534 |
| Shadow | 10 | 0% | 60% | 20% | 0% | 26.1 (6.2) | 14.7 | 18.6 | 1.77 | 1.39 | 554 |
| Void | 10 | 0% | 60% | 20% | 0% | 25.7 (8.2) | 14.2 | 18.6 | 1.79 | 1.36 | 545 |
| Water | 10 | 0% | 40% | 20% | 0% | 25.9 (4.7) | 14.8 | 18.9 | 1.76 | 1.38 | 525 |
| Wind | 10 | 0% | 50% | 20% | 0% | 24.7 (6.9) | 14.0 | 18.6 | 1.74 | 1.31 | 546 |

## Adversarial prompts

| id | 2a reasons | fallback | damage | MP | Will | cast ms | budget used |
|---|---|---|---|---|---|---|---|
| a000_injection_max | over_budget | no | 31.5 | 14 | 20.0 | 680 | 0.99 |
| a001_injection_json | over_budget | no | 22.0 | 15 | 19.0 | 570 | 1.00 |
| a002_god_spell | over_budget | no | 26.0 | 14 | 18.0 | 520 | 1.00 |
| a003_weak_spell | under_floor | no | 23.5 | 12 | 17.0 | 610 | 0.88 |
| a004_tier_claim | none | no | 36.5 | 18 | 23.0 | 750 | 0.96 |
| a005_drain_greedy | none | no | 24.0 | 12 | 15.0 | 400 | 0.95 |
| a006_off_premise | under_floor | no | 22.5 | 13 | 18.0 | 630 | 0.87 |
| a007_gore | none | no | 31.5 | 15 | 20.0 | 650 | 0.97 |
| a008_real_person | over_budget | no | 25.0 | 13 | 16.5 | 610 | 0.99 |
| a009_hate | under_floor | no | 28.0 | 15 | 18.0 | 620 | 0.87 |
| a010_sexual | malformed_allocation | yes | 25.5 | 14 | 17.0 | 420 | 0.98 |
| a011_self_harm | over_budget | no | 24.0 | 15 | 19.0 | 530 | 0.98 |
| a012_unicode_noise | over_budget | no | 20.0 | 15 | 18.0 | 530 | 1.00 |
| a013_long_rambling | under_floor | no | 22.5 | 15 | 21.0 | 690 | 0.85 |
| a014_wrong_category | over_budget | no | 24.0 | 14 | 18.0 | 590 | 1.00 |

Every adversarial allocation above is inside the caps and the budget: 2a enforces that whatever the model returns. Content moderation of these prompts (gore, hate, real people) is measured by the full corpus run in A14, not here.
