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

Formas de carregar o painel:

- **Console** — copia `fge.js` (raiz) ou `fge/dist/fge.user.js` e cola no DevTools da página do FireGames.
- **Bookmarklet (loader, recomendado)** — bookmarklet curto que carrega o script direto do CDN. Funciona inclusive no Firefox:
  ```js
  javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/Jhonysganzerla/FireGames-Enhanced-FGE@master/fge.js?_='+Date.now();document.head.appendChild(s);})();
  ```
- **Bookmarklet (bundle inline)** — roda `npm run bookmarklet` e cola `dist/bookmarklet.txt` num favorito (gera o bundle inteiro inline, pode ser rejeitado por navegadores que limitam o tamanho do campo URL).
- **Tampermonkey** — aponta um `@require` para o raw deste repositório.

Na primeira execução o painel tenta capturar o token sozinho. Se não conseguir, abre um modal pedindo pra você colar.

### Instalando o bookmarklet no Firefox

O Firefox (84+) **remove** o prefixo `javascript:` quando você cria um favorito pelo diálogo "Adicionar favorito". Workaround:

1. Abre o gerenciador de favoritos: `Ctrl+Shift+O` (ou *Favoritos → Gerenciar favoritos*).
2. Clica em qualquer favorito existente com o botão direito → **Novo favorito…**
3. Em **Nome** põe `FGE` e em **URL** cola o código do bookmarklet (loader acima — começa com `javascript:`).
4. Salva. Agora basta clicar no favorito enquanto estiver na página do FireGames.

Se mesmo assim ele truncar o `javascript:`, edita o favorito depois de salvo e cola a URL no campo — o gerenciador aceita.

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
