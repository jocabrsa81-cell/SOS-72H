# SOS 72H — versão 2

Preparação para as primeiras 72 horas de uma emergência. Funciona sem Internet, sem contas e sem publicidade. Português, francês, alemão, inglês e espanhol. Android e iPhone (app web instalável).

## O que mudou na versão 2

- **"Estou em emergência"** no início: escolhe-se a situação e vai-se direto aos passos, com o 112, o envio da posição por SMS, as fichas médicas e a lanterna à mão.
- **Inventário com 24 artigos prontos** (água, massa, atum, leite…), com volumes e kcal típicos, e um botão **+1**.
- **Dados protegidos**: pede armazenamento persistente, lembra a cópia de segurança de 30 em 30 dias e deixa **exportar o cofre cifrado** (e restaurá-lo noutro telemóvel).
- **Guias com fontes** (ERC, IFRC, infocrise.lu, ANEPC, OMS…) e estado de revisão à vista. Os textos ainda não foram revistos por profissionais.
- **Alertas** marcados como função extra (complemento, não substituto dos avisos oficiais).
- **Manutenção**: uma só fonte (ficheiros soltos, fáceis de enviar pelo telemóvel), **um ficheiro por língua**, versão gerada automaticamente e verificação das traduções a cada publicação.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `index.html`, `app.css`, `app.js` | Página, aspeto e arranque |
| `screen-*.js` | Um ficheiro por ecrã (início, kit, família, guias, ferramentas, cofre, alertas, emergência, definições) |
| `store.js`, `backup.js` | Dados no telemóvel, cópia de segurança |
| `content.js` | Estrutura dos conteúdos (números, kit, guias, artigos prontos, fontes) — sem textos |
| `lang-pt.js` … `lang-es.js` | **Todos os textos**, um ficheiro por língua. Para corrigir uma tradução, muda só o texto entre aspas |
| `i18n.js` | Carrega a língua; o português é a reserva |
| `alerts.js`, `fetch-alerts.mjs` | Alertas (app) e coletor (GitHub) |
| `maps.js`, `picker.js`, `platform.js` | Organic Maps, escolher no mapa, diferenças Android/iPhone |
| `build.mjs` | Monta a app em `_site/`, verifica traduções, gera a versão e a lista offline |
| `pages-workflow.yml` | Publicação + alertas (o conteúdo vai para `.github/workflows/pages.yml`) |
| `android-workflow.yml` | APK opcional (o conteúdo vai para `.github/workflows/android.yml`) |

## Publicar

1. Enviar todos os ficheiros para a raiz do repositório (Add file → Upload files).
2. Criar `.github/workflows/pages.yml` com o conteúdo de `pages-workflow.yml` (Add file → Create new file).
3. Settings → Pages → Source: **GitHub Actions**.
4. Se faltar uma tradução, a publicação falha no passo "Verificar traduções" e diz qual falta.

A versão aparece em Definições → Sobre (número · commit · data) e muda sozinha a cada publicação.

## Testar no computador

```
node build.mjs
npx http-server _site -p 8080
```

## Limitações conhecidas

- **Primeiros socorros:** os 10 guias foram lidos e confirmados em novembro de 2026 por uma pessoa com formação em primeiros socorros (HELP, Luxemburgo). Os guias de situações, os guias práticos e as traduções ainda não foram revistos.
- Lanterna não funciona no iPhone (o Safari não deixa).
- Alertas só com a app aberta; dependem de um agendamento do GitHub que pode atrasar e que se desliga após 60 dias sem atividade no repositório.
- "Escolher no mapa" precisa de Internet (OpenStreetMap).
- No APK, exportar ficheiros (cópia, cofre) depende da WebView e pode exigir os plugins Filesystem/Share do Capacitor.
