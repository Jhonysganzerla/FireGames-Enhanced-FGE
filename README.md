# FireGames Enhanced (FGE)

Painel modular injetado no FireGames pra gerenciar **inventário** (skins, facas, luvas, agentes, music kits, pins, graffiti, stickers, keychains) e acompanhar **servidores ao vivo** com fila auto-conectar.

A ferramenta roda dentro da página do FireGames como overlay com Shadow DOM, descobrindo o Bearer token automaticamente a partir do tráfego de rede (fetch/XHR).

## Estrutura do repositório

```
.
├── fge/            ← código-fonte modular (build com esbuild)
└── fge.js          ← bundle single-file legado (cola direto no console)
```

## Build (pasta `fge/`)

```bash
cd fge
npm install
npm run build         # gera dist/fge.user.js
npm run dev           # watch mode
npm run bookmarklet   # gera dist/bookmarklet.txt
```

## Como usar

Três formas de carregar o painel:

- **Console** — copia `fge/dist/fge.user.js` (ou o `fge.js` da raiz) e cola no DevTools da página do FireGames.
- **Bookmarklet** — roda `npm run bookmarklet` e cola o conteúdo de `dist/bookmarklet.txt` num favorito do navegador.
- **Tampermonkey** — aponta um `@require` para o raw deste repositório.

Na primeira execução o painel tenta capturar o token sozinho. Se não conseguir, abre um modal pedindo pra você colar.

## Arquitetura (resumo)

```
src/
├── index.js        entry point: instala interceptor, monta shell, resolve token, carrega dados, inicializa features
├── core/           api · token · store · bus · dom (sem dependência de UI)
├── ui/             shell · toast · drag
├── styles/         CSS por área (importado como string)
├── data/           master-lists · schemas
└── features/       inventory · editor · keychain · stickers · create · servers
```

Cada feature exporta `init({ store, bus })` e se auto-registra. Mais detalhes em [fge/README.md](fge/README.md).

## API pública no console

Depois de carregado, o objeto `window.fge` expõe:

| Comando | Efeito |
|---|---|
| `fge.state` | snapshot do store |
| `fge.inv` | inventário atual |
| `fge.kcs` | keychains carregadas |
| `fge.servers` | servidores ao vivo |
| `fge.queue("ip:port")` | adiciona servidor à fila auto-conectar |
| `fge.unqueue("ip:port")` | remove da fila |
| `fge.listQueue()` | lista a fila |
| `fge.inspect(id?)` | inspeciona item selecionado ou por id |
| `fge.reload()` | recarrega o inventário da API |

## Aviso

Projeto pessoal, sem vínculo oficial com o FireGames. Use por sua conta e risco.
