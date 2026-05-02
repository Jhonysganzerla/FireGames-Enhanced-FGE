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

## Como usar (jeito fácil)

A forma mais simples é criar um **favorito no navegador** com o código abaixo e clicar nele dentro do FireGames. Pronto, o painel abre.

**1. Copia esta URL inteira** (começa com `javascript:`):

```
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/Jhonysganzerla/FireGames-Enhanced-FGE@master/fge.js?_='+Date.now();document.head.appendChild(s);})();
```

**2. Cria um favorito novo** com:
- **Nome:** `FGE`
- **URL/Endereço:** o código que você copiou acima

**3. Abre o site do FireGames e clica no favorito.** O painel aparece sozinho.

Na primeira execução ele tenta pegar seu token automaticamente. Se não conseguir, abre um campo pedindo pra colar.

### Passo a passo por navegador

<details>
<summary><b>Firefox</b> (clique para abrir)</summary>

O Firefox bloqueia `javascript:` no diálogo padrão de "Adicionar favorito". Faça pelo gerenciador:

1. Aperta `Ctrl+Shift+O` (abre o gerenciador de favoritos).
2. Botão direito em qualquer pasta → **Adicionar favorito…**
3. Nome: `FGE` · URL: cola o código.
4. Salvar.
5. Se ele apagar o `javascript:` ao salvar, abre o favorito recém-criado, edita o campo URL e cola de novo — o gerenciador aceita.

</details>

<details>
<summary><b>Chrome / Edge / Brave</b></summary>

1. Mostra a barra de favoritos: `Ctrl+Shift+B`.
2. Botão direito na barra → **Adicionar página…**
3. Nome: `FGE` · URL: cola o código.
4. Salvar.

</details>

<details>
<summary><b>Outras formas (avançado)</b></summary>

- **Console do navegador (F12):** abre o DevTools no FireGames, vai na aba **Console**, cola o conteúdo de [`fge.js`](fge.js) e dá Enter.
- **Tampermonkey / Violentmonkey:** cria um userscript com `@require` apontando para `https://cdn.jsdelivr.net/gh/Jhonysganzerla/FireGames-Enhanced-FGE@master/fge.js`.
- **Build local:** veja [`fge/`](fge/) para gerar o bundle a partir do código-fonte modular.

</details>

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
