'use strict';

// Curated D&D battlemap icon set sourced from game-icons.net
// License: CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/
// Attribution: Delapouite, Lorc & contributors at https://game-icons.net
// All slugs verified to exist in game-icons/icons@master on GitHub.

window.IconManifest = [
  // ── Weapons ────────────────────────────────────────────────────────────────
  { id: 'sword',       name: 'Sword',       category: 'Weapons',   author: 'lorc',       slug: 'broadsword' },
  { id: 'shield',      name: 'Shield',      category: 'Weapons',   author: 'lorc',       slug: 'magic-shield' },
  { id: 'battle-axe',  name: 'Battle Axe',  category: 'Weapons',   author: 'lorc',       slug: 'battle-axe' },
  { id: 'bow',         name: 'Bow',         category: 'Weapons',   author: 'lorc',       slug: 'heavy-arrow' },
  { id: 'dagger',      name: 'Dagger',      category: 'Weapons',   author: 'lorc',       slug: 'stiletto' },
  { id: 'spear',       name: 'Spear',       category: 'Weapons',   author: 'lorc',       slug: 'barbed-spear' },
  { id: 'mace',        name: 'Mace',        category: 'Weapons',   author: 'lorc',       slug: 'spiked-mace' },
  { id: 'crossbow',    name: 'Crossbow',    category: 'Weapons',   author: 'carl-olsen', slug: 'crossbow' },

  // ── Magic ──────────────────────────────────────────────────────────────────
  { id: 'fireball',    name: 'Fireball',    category: 'Magic',     author: 'lorc',       slug: 'fireball' },
  { id: 'lightning',   name: 'Lightning',   category: 'Magic',     author: 'lorc',       slug: 'power-lightning' },
  { id: 'magic',       name: 'Magic',       category: 'Magic',     author: 'lorc',       slug: 'magic-swirl' },
  { id: 'potion',      name: 'Potion',      category: 'Magic',     author: 'delapouite', slug: 'health-potion' },
  { id: 'spellbook',   name: 'Spell Book',  category: 'Magic',     author: 'lorc',       slug: 'book-cover' },
  { id: 'crystal-ball',name: 'Crystal Ball',category: 'Magic',     author: 'lorc',       slug: 'crystal-ball' },
  { id: 'pentagram',   name: 'Pentagram',   category: 'Magic',     author: 'lorc',       slug: 'pentagram-rose' },
  { id: 'portal',      name: 'Portal',      category: 'Magic',     author: 'lorc',       slug: 'portal' },

  // ── Hazards ────────────────────────────────────────────────────────────────
  { id: 'skull',       name: 'Skull',       category: 'Hazards',   author: 'lorc',       slug: 'crowned-skull' },
  { id: 'poison',      name: 'Poison',      category: 'Hazards',   author: 'lorc',       slug: 'poison-bottle' },
  { id: 'bomb',        name: 'Bomb',        category: 'Hazards',   author: 'lorc',       slug: 'grenade' },
  { id: 'bear-trap',   name: 'Bear Trap',   category: 'Hazards',   author: 'lorc',       slug: 'trap-mask' },
  { id: 'acid',        name: 'Acid',        category: 'Hazards',   author: 'lorc',       slug: 'acid-blob' },
  { id: 'bleed',       name: 'Bleed',       category: 'Hazards',   author: 'lorc',       slug: 'bleeding-wound' },
  { id: 'explosion',   name: 'Explosion',   category: 'Hazards',   author: 'lorc',       slug: 'explosion-rays' },

  // ── Terrain ────────────────────────────────────────────────────────────────
  { id: 'chest',       name: 'Chest',       category: 'Terrain',   author: 'delapouite', slug: 'chest' },
  { id: 'door',        name: 'Door',        category: 'Terrain',   author: 'lorc',       slug: 'wooden-door' },
  { id: 'key',         name: 'Key',         category: 'Terrain',   author: 'lorc',       slug: 'key' },
  { id: 'stairs',      name: 'Stairs',      category: 'Terrain',   author: 'delapouite', slug: 'stairs' },
  { id: 'campfire',    name: 'Campfire',    category: 'Terrain',   author: 'lorc',       slug: 'campfire' },
  { id: 'torch',       name: 'Torch',       category: 'Terrain',   author: 'delapouite', slug: 'torch' },
  { id: 'castle',      name: 'Castle',      category: 'Terrain',   author: 'delapouite', slug: 'castle' },
  { id: 'fountain',    name: 'Fountain',    category: 'Terrain',   author: 'lorc',       slug: 'fountain' },

  // ── Creatures ──────────────────────────────────────────────────────────────
  { id: 'dragon',      name: 'Dragon',      category: 'Creatures', author: 'lorc',       slug: 'dragon-head' },
  { id: 'wolf',        name: 'Wolf',        category: 'Creatures', author: 'lorc',       slug: 'wolf-head' },
  { id: 'skeleton',    name: 'Skeleton',    category: 'Creatures', author: 'lorc',       slug: 'skull-ring' },
  { id: 'undead',      name: 'Undead',      category: 'Creatures', author: 'lorc',       slug: 'spectre' },
  { id: 'bat',         name: 'Bat',         category: 'Creatures', author: 'lorc',       slug: 'bat-wing' },
  { id: 'spider',      name: 'Spider',      category: 'Creatures', author: 'lorc',       slug: 'hanging-spider' },
  { id: 'snake',       name: 'Snake',       category: 'Creatures', author: 'lorc',       slug: 'snake' },

  // ── Status ─────────────────────────────────────────────────────────────────
  { id: 'heart',       name: 'Heart',       category: 'Status',    author: 'lorc',       slug: 'bleeding-heart' },
  { id: 'broken-heart',name: 'Broken Heart',category: 'Status',    author: 'lorc',       slug: 'broken-heart' },
  { id: 'heal',        name: 'Heal',        category: 'Status',    author: 'delapouite', slug: 'healing' },
  { id: 'sleep',       name: 'Sleep',       category: 'Status',    author: 'lorc',       slug: 'sleepy' },
  { id: 'frozen',      name: 'Frozen',      category: 'Status',    author: 'lorc',       slug: 'snowflake-2' },
  { id: 'footprint',   name: 'Footprint',   category: 'Status',    author: 'lorc',       slug: 'footprint' },
  { id: 'hidden',      name: 'Hidden',      category: 'Status',    author: 'lorc',       slug: 'hidden' },
];
