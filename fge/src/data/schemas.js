// Shape de cada tipo de item, centralizado.
// `build` recebe a entry da master list e retorna o objeto completo
// pronto pra POST /inventory.

export const TYPE_LABELS = {
  skin:     'Skin',
  knife:    'Faca',
  glove:    'Luva',
  agent:    'Agente',
  musickit: 'Music Kit',
  pin:      'Pin',
  graffiti: 'Graffiti',
};

const baseShape = (type) => ({
  id: 0, type, equipped: true,
  float: 0.0001, pattern: 0, nametag: '',
  stattrak: null, keychain: null, stickers: [],
});

export const ITEM_SCHEMAS = {
  skin: {
    isSkinLike: true,
    teams: ['both', 'ct', 't'],
    build(m) {
      return { ...baseShape('skin'), team: 'both',
        weapon_id:   m.weapon?.weapon_id,
        paint_index: Number(m.paint_index) };
    },
  },
  knife: {
    isSkinLike: true,
    teams: ['both', 'ct', 't'],
    build(m) {
      return { ...baseShape('knife'), team: 'both',
        weapon_id:   m.weapon?.weapon_id,
        paint_index: Number(m.paint_index) };
    },
  },
  glove: {
    isSkinLike: true,
    teams: ['both', 'ct', 't'],
    build(m) {
      return { ...baseShape('glove'), team: 'both',
        weapon_id:   m.weapon?.weapon_id,
        paint_index: Number(m.paint_index) };
    },
  },
  agent: {
    isSkinLike: false,
    teams: ['CT', 'T'],
    build(m) {
      const team = m.team?.id === 'terrorists' ? 'T' : 'CT';
      return { ...baseShape('agent'), team,
        weapon_id:   Number(m.def_index),
        paint_index: Number(m.def_index) };
    },
  },
  musickit: {
    isSkinLike: false,
    teams: ['both'],
    build(m) {
      return { ...baseShape('musickit'), team: 'both',
        weapon_id:   Number(m.def_index),
        paint_index: Number(m.def_index) };
    },
  },
  pin: {
    isSkinLike: false,
    teams: ['both'],
    build(m) {
      return { ...baseShape('pin'), team: 'both',
        weapon_id:   Number(m.def_index),
        paint_index: Number(m.def_index) };
    },
  },
  graffiti: {
    isSkinLike: false,
    teams: ['both'],
    build(m) {
      return { ...baseShape('graffiti'), team: 'both',
        weapon_id:   Number(m.def_index),
        paint_index: m.color_index !== undefined ? Number(m.color_index) : Number(m.def_index) };
    },
  },
};

export function isSkinLike(type) {
  return !!ITEM_SCHEMAS[type]?.isSkinLike;
}
