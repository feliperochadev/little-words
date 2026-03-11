# Palavrinhas

[English](./README.md) | Português (Brasil)

Palavrinhas é um aplicativo mobile em Expo / React Native para registrar as primeiras palavras do bebê, acompanhar variantes de pronúncia e exportar ou fazer backup dos dados. O foco atual é Android, com armazenamento local em SQLite e sincronização opcional com Google Drive em builds nativas.

## Funcionalidades

- Registrar palavras com categoria, data e observações
- Acompanhar variantes de pronúncia para cada palavra
- Interface bilíngue: `en-US` e `pt-BR`, com locale salvo no SQLite
- Importar texto colado ou CSV com pré-visualização antes de salvar
- Exportar CSV com cabeçalhos ajustados ao idioma atual
- Salvar ou compartilhar exports no dispositivo
- Backup opcional no Google Drive em builds nativas compatíveis
- Modais em bottom sheet com gesto de arrastar e dashboard com estatísticas

## Stack

- Expo SDK 55, Expo Router 55
- React 19.2.0, React Native 0.83.2
- TypeScript 5.9
- SQLite via `expo-sqlite`
- Jest 30 + React Native Testing Library
- Maestro para fluxos E2E

## Estrutura do Projeto

```text
app/                 telas e layouts do Expo Router
app/(tabs)/          abas de início, palavras, variantes e ajustes
src/components/      UI compartilhada e componentes de modal
src/database/        esquema SQLite e acesso a dados
src/i18n/            catálogos en-US / pt-BR e provider
src/utils/           utilitários de CSV, Google Drive, tema e helpers
__tests__/           cobertura unitária, integração, telas e e2e
assets/              ícones, splash e assets de marca
```

## Desenvolvimento

```bash
npm install
npm start
npm run android
```

Comandos úteis:

- `npm run ci` executa lint, typecheck e Jest; trate como gate obrigatório
- `npm test` roda testes unitários, de integração e de telas
- `npm run test:coverage` roda o Jest com relatório de cobertura
- `npm run e2e:import` e `npm run e2e:export` executam fluxos Maestro focados
- `npm run build:apk` gera um APK Android com EAS

## Notas de Arquitetura

- `app/index.tsx` inicializa o banco, verifica onboarding e roteia para a aplicação
- Categorias nativas são armazenadas como chaves neutras em inglês e traduzidas na renderização
- `src/utils/csvExport.ts` monta cabeçalhos CSV e rótulos de categoria de acordo com o locale
- `src/utils/importHelpers.ts` faz o parse tanto de texto simples quanto de CSV
- O backup com Google Drive é protegido por `isNativeBuild()` e não funciona no Expo Go
- Os backups do Google Drive ficam na pasta `palavrinhas-app` e usam o nome `palavrinhas_backup.csv`
- O arquivo local do SQLite é `little-words.db` em instalações novas

## Fluxo Multi-Agente

- A coordenação vive em `.agents/` (flags, changelog, reviews e tarefas pendentes)
- Os scripts de estado do agente e persistência de tarefas ficam em `scripts/agent/`
- Os readmes dos vendors (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) ficam sincronizados nas regras compartilhadas

## Testes

Os testes ficam em `__tests__/unit`, `__tests__/integration`, `__tests__/screens` e `__tests__/e2e`. As regras atuais do repositório exigem testes para toda mudança de código e `npm run ci` passando antes de considerar uma tarefa concluída. Nos fluxos Maestro, prefira seletores `id:` baseados em `testID` em vez de texto visível sempre que possível.
