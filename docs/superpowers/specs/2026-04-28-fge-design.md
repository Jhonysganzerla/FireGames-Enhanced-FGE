# FireGames Enhanced (FGE) — Design Spec
**Data:** 2026-04-28

## Objetivo
Script colado no console do browser para o site `firegamesnetwork.com` que injeta um painel visual (Shadow DOM) com controle completo dos campos da API de inventário — incluindo StatTrak™ e keychains que a UI oficial não expõe.

## Arquitetura

```
IIFE autocontido (fge.js)
├── TokenExtractor  — varre localStorage/sessionStorage por JWT (startsWith "eyJ")
├── ApiClient       — wrapper fetch com Bearer + credentials:include
├── DataLoader      — Promise.allSettled paralelo: /inventory + 5 cs-api JSONs
├── StateManager    — sel (item selecionado) + edit (cópia deep clone pendente)
└── UIRenderer      — Shadow DOM isolado, painel flutuante arrastável
```

## UI

- **Painel:** 920×600px, fixo top-right, arrastável pelo header
- **Sidebar:** lista de itens do inventário com busca, badge ✓ para equipados
- **Tabs de edição:**
  - **Base** — float, pattern, nametag, team, equipped
  - **StatTrak™** — toggle on/off + contagem de kills
  - **Keychain** — grade pesquisável com imagens, botão remover
  - **Stickers** — 4 slots clicáveis; grid pesquisável para aplicar; wear por slot
- **Footer:** nome do item selecionado, botão Recarregar, botão Salvar
- **Toast:** feedback de sucesso/erro no canto inferior do painel

## Endpoints usados

| Método | Path | Uso |
|--------|------|-----|
| GET | `/inventory` | Carregar inventário |
| PUT | `/inventory` | Salvar item editado |
| GET | `/cs-api/en/keychains.json` | Lista de keychains |
| GET | `/cs-api/en/stickers.json` | Lista de stickers |
| GET | `/cs-api/en/graffiti.json` | Lista de graffiti |
| GET | `/cs-api/en/music_kits.json` | Lista de music kits |
| GET | `/cs-api/en/agents.json` | Lista de agents |

## Payload PUT /inventory (estrutura conhecida)

```json
{
  "id": 6886805,
  "type": "skin",
  "team": "both",
  "weapon_id": 7,
  "paint_index": 142,
  "float": 0.0001,
  "pattern": 0,
  "nametag": "",
  "stattrak": null,
  "keychain": null,
  "stickers": [{"slot": 0, "paint_index": 76, "wear": 0}],
  "equipped": true
}
```

## Decisões de design

- **Shadow DOM:** isola CSS do Tailwind do site; evita conflitos de classe
- **Promise.allSettled:** falha em qualquer endpoint não trava o script
- **Toggle duplo:** colar o script com painel aberto remove-o; colar novamente reabre
- **Extração de token:** busca JWT mais recente (maior `exp`) entre todos os valores de localStorage/sessionStorage
- **Futuro:** para converter em extensão, mover o IIFE para `content_scripts` no `manifest.json`
