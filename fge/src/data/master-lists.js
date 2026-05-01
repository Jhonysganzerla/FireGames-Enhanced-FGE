// Carrega as 7 listas master + stickers + keychains em paralelo.
// skins.json contém skins/knives/gloves todos juntos — separamos por category.name.

import { apiGet, toArray } from '../core/api.js';

export async function loadAllMaster() {
  const [skinsR, agentsR, musickitsR, pinsR, graffitiR, stickersR, keychainsR] =
    await Promise.allSettled([
      apiGet('/cs-api/en/skins.json'),
      apiGet('/cs-api/en/agents.json'),
      apiGet('/cs-api/en/music_kits.json'),
      apiGet('/cs-api/en/collectibles.json'),
      apiGet('/cs-api/en/graffiti.json'),
      apiGet('/cs-api/en/stickers.json'),
      apiGet('/cs-api/en/keychains.json'),
    ]);

  const f = r => r.status === 'fulfilled' ? toArray(r.value) : [];
  const allSkins = f(skinsR);

  return {
    masterLists: {
      skin:     allSkins.filter(s => !['Knives','Gloves'].includes(s?.category?.name)),
      knife:    allSkins.filter(s =>  s?.category?.name === 'Knives'),
      glove:    allSkins.filter(s =>  s?.category?.name === 'Gloves'),
      agent:    f(agentsR),
      musickit: f(musickitsR),
      pin:      f(pinsR),
      graffiti: f(graffitiR),
    },
    stickers:  f(stickersR),
    keychains: f(keychainsR),
  };
}

export function masterEntry(masterLists, item) {
  const list = masterLists[item.type] || [];
  const pi = String(item.paint_index);
  return list.find(m => String(m.paint_index) === pi)
      || list.find(m => String(m.def_index)   === pi);
}
