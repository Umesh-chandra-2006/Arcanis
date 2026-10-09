# Balance harness report (Phase 1a, Power Budget)

- Date: 2026-10-09T20:52:50.834Z
- Mode: offline (random allocations)
- Corpus entries: 135 (120 realistic ok, 15 adversarial ok, 0 provider failures)
- Providers: -
- Median Layer 1 latency: -

## Conformance (realistic prompts)

- Clamped into range: 6%
- Over budget, rescaled down: 53%
- Under the floor, raised: 24%
- Malformed, fell back to default profile (2a flag, escalates to 2c): 0%
- Budget used after 2a: mean 0.94 of budget (bounds 0.85 to 1.00)
- Same classification, different descriptions, different stats: 60 of 60 pairs

## By category

| Category | n | clamped | rescaled down | raised to floor | fallback | damage avg (sd) | MP avg | Will avg | dmg/MP | dmg/Will | cast ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Attack | 24 | 0% | 50% | 29% | 0% | 23.3 (5.2) | 14.9 | 18.0 | 1.59 | 1.31 | 470 |
| Debuff | 24 | 0% | 46% | 25% | 0% | 25.0 (5.2) | 13.5 | 17.0 | 1.93 | 1.51 | 485 |
| Defense | 24 | 0% | 88% | 0% | 0% | 22.3 (4.1) | 16.2 | 18.7 | 1.41 | 1.20 | 553 |
| Drain | 24 | 29% | 21% | 50% | 0% | 26.0 (4.4) | 13.5 | 16.2 | 2.01 | 1.64 | 513 |
| Regen | 24 | 0% | 63% | 17% | 0% | 21.8 (4.6) | 14.5 | 18.4 | 1.55 | 1.22 | 518 |

## By element

| Element | n | clamped | rescaled down | raised to floor | fallback | damage avg (sd) | MP avg | Will avg | dmg/MP | dmg/Will | cast ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Arcane | 10 | 20% | 80% | 0% | 0% | 24.1 (3.5) | 14.4 | 18.7 | 1.77 | 1.35 | 491 |
| Chaos | 10 | 0% | 60% | 30% | 0% | 22.5 (4.7) | 14.6 | 16.9 | 1.63 | 1.33 | 497 |
| Earth | 10 | 10% | 40% | 20% | 0% | 23.6 (4.8) | 13.4 | 18.1 | 1.84 | 1.31 | 533 |
| Fire | 10 | 0% | 70% | 20% | 0% | 24.1 (4.1) | 14.7 | 18.1 | 1.73 | 1.34 | 448 |
| Frost | 10 | 0% | 50% | 40% | 0% | 22.7 (5.2) | 15.9 | 16.9 | 1.42 | 1.37 | 455 |
| Light | 10 | 0% | 60% | 30% | 0% | 23.6 (3.9) | 13.8 | 18.1 | 1.80 | 1.34 | 506 |
| Lightning | 10 | 0% | 50% | 30% | 0% | 26.6 (4.7) | 16.9 | 17.6 | 1.60 | 1.55 | 521 |
| Nature | 10 | 10% | 60% | 30% | 0% | 20.7 (5.6) | 13.1 | 16.1 | 1.59 | 1.36 | 530 |
| Shadow | 10 | 10% | 60% | 10% | 0% | 24.9 (6.2) | 15.2 | 18.1 | 1.69 | 1.41 | 471 |
| Void | 10 | 10% | 20% | 40% | 0% | 25.4 (4.2) | 14.4 | 17.3 | 1.91 | 1.54 | 586 |
| Water | 10 | 0% | 40% | 30% | 0% | 23.8 (4.8) | 13.6 | 19.6 | 1.79 | 1.25 | 525 |
| Wind | 10 | 10% | 50% | 10% | 0% | 22.4 (4.7) | 14.1 | 16.6 | 1.64 | 1.39 | 529 |

## Adversarial prompts

| id | 2a reasons | fallback | damage | MP | Will | cast ms | budget used |
|---|---|---|---|---|---|---|---|
| a000_injection_max | over_budget | no | 29.0 | 17 | 21.0 | 370 | 1.00 |
| a001_injection_json | over_budget | no | 27.0 | 18 | 15.0 | 790 | 0.99 |
| a002_god_spell | over_budget | no | 21.5 | 12 | 21.0 | 330 | 0.99 |
| a003_weak_spell | under_floor | no | 30.5 | 19 | 18.0 | 540 | 0.85 |
| a004_tier_claim | over_budget | no | 24.5 | 16 | 21.5 | 370 | 1.00 |
| a005_drain_greedy | under_floor | no | 24.0 | 20 | 16.0 | 450 | 0.85 |
| a006_off_premise | none | no | 31.0 | 15 | 19.0 | 700 | 0.95 |
| a007_gore | over_budget | no | 21.5 | 13 | 14.5 | 530 | 1.00 |
| a008_real_person | over_budget | no | 24.0 | 12 | 14.0 | 720 | 0.99 |
| a009_hate | over_budget | no | 24.0 | 10 | 16.5 | 570 | 0.99 |
| a010_sexual | under_floor | no | 30.5 | 16 | 19.5 | 610 | 0.87 |
| a011_self_harm | over_budget | no | 25.0 | 17 | 18.0 | 510 | 0.98 |
| a012_unicode_noise | over_budget | no | 17.5 | 15 | 19.0 | 420 | 0.97 |
| a013_long_rambling | over_budget | no | 21.5 | 16 | 22.0 | 390 | 0.99 |
| a014_wrong_category | none | no | 28.0 | 18 | 19.0 | 650 | 0.90 |

Every adversarial allocation above is inside the caps and the budget: 2a enforces that whatever the model returns. Content moderation of these prompts (gore, hate, real people) is measured by the full corpus run in A14, not here.
