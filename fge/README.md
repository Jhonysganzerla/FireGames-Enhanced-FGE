# FireGames Enhanced

Painel modular pra inventário e servidores ao vivo.

## Setup

```bash
npm install
npm run build       # gera dist/fge.user.js
npm run dev         # watch mode
npm run bookmarklet # gera versão bookmarklet (cole num favorito)
```

## Estrutura

```
src/
├── index.js                ← entry point: orquestra todo o boot
├── core/                   ← infraestrutura (sem dependência de UI)
│   ├── api.js              fetch wrapper + Bearer token
│   ├── token.js            interceptor + descoberta + modal
│   ├── store.js            estado reativo minimalista
│   ├── bus.js              event bus pub/sub
│   └── dom.js              shadow root + helpers
├── ui/                     ← componentes visuais reutilizáveis
│   ├── shell.js            shell HTML (painel/sidebar/footer)
│   ├── toast.js
│   └── drag.js
├── styles/                 ← CSS por área (importado como string)
│   ├── base.css
│   ├── panel.css
│   ├── inventory.css
│   ├── overlays.css
│   └── servers.css
├── data/
│   ├── master-lists.js     fetch das listas master (skins/agents/...)
│   └── schemas.js          shape de cada tipo de item
└── features/               ← cada feature plugável e independente
    ├── inventory.js        list, filter, type chips
    ├── editor.js           tabs base + stattrak + form fields
    ├── keychain.js         seleção + slot + pattern
    ├── stickers.js         4 slots com wear/scale/rotation
    ├── create.js           overlay de adicionar item
    └── servers.js          WebSocket + cards + fila auto-conectar
```

## Como adicionar uma feature

1. Cria `src/features/minha-feature.js` exportando `init(deps)`
2. Importa no `src/index.js` e chama `init({ store, bus, $, api })`
3. Pronto — cada feature recebe deps explícitas e se auto-registra

## Deploy

- **Bookmarklet**: `npm run bookmarklet` → cola `dist/bookmarklet.txt` num favorito
- **Console**: copia `dist/fge.user.js` e cola no DevTools
- **Tampermonkey**: aponta `@require` pro raw do GitHub
