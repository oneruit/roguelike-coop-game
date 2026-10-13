# Invoker

Playable hero: 100 HP, 8.5 speed, 1.2 damage multiplier.
Starting weapon **Invoke** occupies one weapon slot and, when a living enemy is within range
22, casts exactly one of ten spells with equal probability.
Initial cooldown is 1.4 seconds. Casts are directed toward the target; while moving, the hero
maintains face direction for the duration of the spell cast animation.

All ten spells become available as standalone weapons only after acquiring Invoke.
Without Invoke, they do not appear in level-up card selections and cannot be cast.
Another hero can first pick up Invoke, followed by its spells. The standard 5-weapon
limit applies. Damage, cooldown, radius, and range are configurable in the admin panel.

For the Invoker hero, new spells receive priority in level-up selection cards:
typically offering two new spells and one upgrade for an already equipped weapon.
If no upgrades are available, three new spells are offered. When few unobtained spells
remain or all 5 weapon slots are filled, remaining cards are drawn from the general pool.
For other heroes, even with Invoke, standard card selection rules apply.

Each level of Invoke provides +25% **base** spell damage (previously +16.7%) and −4%
cooldown (previously −2.5%). Sun Strike before hero modifiers: 90 → 112.5 → 135.
This buff applies to both random Invoke casts and standalone spells. Individual weapon
leveling stacks on top of the Invoke bonus. Radius increases by 3.5% base value per level;
crowd control duration by 2.5%, and slows become stronger. Ice Wall, Forge Spirits,
Chaos Meteor, and Alacrity last 2.5% longer per level. Bonus strength for Ghost Walk
and Alacrity increases by 2.5 percentage points per level. Scaling is capped at level 20;
Ghost Walk damage protection duration remains fixed at 3 seconds.

| Spell | In-Game Behavior |
|---|---|
| Cold Snap | Four damage pulses with brief stun and slow |
| Ghost Walk | Protection from standard damage, speed boost, and slowing aura |
| Ice Wall | Ice wall perpendicular to target direction, damage and heavy slow |
| EMP | Charge with visible telegraph warning, followed by AOE damage and slow |
| Tornado | Flying cyclone, damage and stun to all enemies hit along trajectory |
| Alacrity | Temporary attack damage and attack speed buff |
| Sun Strike | Ground target decal and ray strike after delay |
| Forge Spirit | Two fire spirits orbiting the hero, attacking nearby enemies |
| Chaos Meteor | Falling and rolling meteor dealing damage over time |
| Deafening Blast | Shockwave dealing damage, knockback, and disarming attacks briefly |

This is adapted for existing game rules: enemies lack mana pools, so EMP deals damage
and applies a slow; Ghost Walk protects against standard damage without disabling enemy
pathfinding; Tornado stuns without vertical mesh lifting. Bosses resist crowd control.
Standalone Ghost Walk weapon always enforces a minimum 1.5-second cooldown gap between the
end of protection and the next cast, even at maximum level.

## Animations and Asset Provenance

Applied [.agents character-animation-pipeline](../.agents/skills/character-animation-pipeline-updated/SKILL.md).
Created transparent composite using builtin imagegen; exact prompt stored in
[art/invoker-prompt.txt](art/invoker-prompt.txt), source in
[art/invoker-composite.png](art/invoker-composite.png).

Under `public/textures/heroes/`, four sheets with 96×96 cells are located:
IDLE 960×384, WALK 576×384, ATTACK 768×384, WALK_ATTACK 576×384, plus portrait 64×64.
Rows: front, left, right, back. Total 120 cells; feet around Y=74, no adjacent frame bleed.

The generator produced 11 IDLE frames and 7 ATTACK frames: surplus idle frame cropped,
last attack recovery frame repeated. Due to orb glow, alpha threshold 64 is used for frame
isolation while preserving original transparency. The extractor clips output to cell boundaries.

```sh
python .agents/skills/character-animation-pipeline/scripts/extract_character.py \
  --input docs/art/invoker-composite.png --name hero_invoker \
  --out-dir .invoker-extracted --cell-size 128 --feet-y 98 --segmentation-alpha 64
```

After extraction, sheets are downscaled to 96×96 cells via NEAREST interpolation, portrait
created from the first IDLE cell via LANCZOS. Intermediate files are excluded from Git.

Spell roster verified against [official Valve game data](https://www.dota2.com/datafeed/herodata?language=english&hero_id=74).
Spell icons sourced from Valve's official CDN:
`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/invoker_<spell>.png`.
Invoker and source icons copyright Valve; sprites crafted for this implementation.

## Execution and Verification

A shared `InvokerSpellRuntime` is used across browser client and headless simulation;
the server selects spells deterministically using seed PRNG. In multiplayer co-op, casts
are broadcast through existing snapshot events, and crowd control is resolved authoritatively
by the host. Client replays are purely cosmetic and do not duplicate damage.
VFX pools are capped at eight instances per effect type.

```sh
npm run test:invoker
python -m unittest discover -s tests -p test_character_extraction.py
npm run typecheck
npm run build
npm run build:admin
```

Automated tests cover all ten spells, damage delays, random single-cast selection,
crowd control, protection buffers, binary network events, deterministic simulation,
and texture boundary constraints. Browser verification checks all four states across four
directions and each spell cast.
