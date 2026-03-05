# 👶 Palavrinhas — Diário de Palavras

Aplicativo Android para registrar as primeiras palavras do seu bebê, acompanhar o progresso, exportar dados e sincronizar com o Google Drive.

---

## ✨ Funcionalidades

- **📝 Registro de palavras** com categoria, data e observações
- **🗣️ Variantes** — registre como a criança pronuncia antes de aprender o correto
- **📊 Dashboard** com estatísticas, gráfico de progresso mensal e palavras por categoria
- **🔍 Busca** rápida nas palavras
- **🏷️ Categorias** personalizáveis (nome, cor, emoji)
- **📤 Exportar CSV** — compartilhe o arquivo `palavra,categoria,data,variante`
- **☁️ Sync com Google Drive** — backup automático ao abrir o app ou adicionar palavras
- **📱 100% offline** — banco SQLite local (similar ao Room Database do Android nativo)

---

## 🚀 Como rodar localmente

### Pré-requisitos

```bash
node >= 18
npm >= 9
```

### Instalação

```bash
cd palavrinhas
npm install
npx expo start
```

Isso abre o Expo Dev Server. Escaneie o QR code com o **Expo Go** (disponível na Play Store) para testar no seu celular.

---

## 📦 Gerar APK (3 formas)

### Opção 1 — EAS Build (Recomendado, gratuito)

Esta é a forma mais fácil e gera um APK real.

```bash
# 1. Instale o EAS CLI
npm install -g eas-cli

# 2. Faça login na sua conta Expo (gratuita)
eas login

# 3. Configure o projeto (só na primeira vez)
eas build:configure

# 4. Gere o APK
eas build --platform android --profile preview
```

O APK será compilado na nuvem e você receberá o link para download por e-mail e no dashboard do Expo.

> 💡 **Conta Expo gratuita** tem 30 builds/mês, o que é mais do que suficiente.

---

### Opção 2 — Build local com Expo Prebuild + Gradle

Se você tem o **Android Studio** instalado:

```bash
# 1. Gere os arquivos nativos
npx expo prebuild --platform android

# 2. Entre na pasta android e gere o APK
cd android
./gradlew assembleRelease

# O APK estará em:
# android/app/build/outputs/apk/release/app-release.apk
```

---

### Opção 3 — Expo Application Services (EAS) com APK direto

```bash
# Defina o profile 'apk' no eas.json (já configurado) e rode:
eas build --platform android --profile apk
```

---

## ☁️ Configurar Google Drive Sync

O app usa OAuth2 para sincronizar com o Google Drive. Para ativar:

### Passo a Passo

1. **Crie um projeto** em [console.cloud.google.com](https://console.cloud.google.com)
2. **Ative a Google Drive API**:
   - Menu → APIs & Services → Library → procure "Google Drive API" → Enable
3. **Crie credenciais OAuth2**:
   - APIs & Services → Credentials → Create Credentials → OAuth Client ID
   - Tipo: Web application (para testes use o Playground)
4. **Obtenha um Access Token** via [OAuth Playground](https://developers.google.com/oauthplayground):
   - Passo 1: selecione `https://www.googleapis.com/auth/drive.file`
   - Passo 2: Exchange authorization code for tokens
   - Copie o **Access Token**
5. **No app**: Configurações → Google Drive → Conectar → Cole o token

### Para produção

Integre o SDK do Google Sign-In (`@react-native-google-signin/google-signin`) e substitua o fluxo manual de token pela autenticação OAuth automática.

---

## 📁 Estrutura do Projeto

```
palavrinhas/
├── app/
│   ├── _layout.tsx          # Root layout, inicialização do DB e sync
│   └── (tabs)/
│       ├── _layout.tsx      # Configuração das abas
│       ├── index.tsx        # Dashboard / Início
│       ├── words.tsx        # Lista de palavras + busca
│       ├── variants.tsx     # Lista de variantes
│       └── settings.tsx     # Categorias, export, Google Drive
├── src/
│   ├── database/
│   │   └── database.ts      # SQLite (todas as queries)
│   ├── components/
│   │   ├── UIComponents.tsx # Button, Card, SearchBar, etc.
│   │   ├── AddWordModal.tsx  # Modal de adicionar/editar palavra
│   │   └── AddVariantModal.tsx
│   └── utils/
│       ├── theme.ts         # Cores e constantes
│       ├── googleDrive.ts   # Sync com Google Drive
│       └── csvExport.ts     # Exportação CSV
├── app.json                 # Configuração Expo
├── eas.json                 # EAS Build profiles
└── package.json
```

---

## 🗄️ Banco de Dados (SQLite offline)

```sql
categories (id, name, color, emoji, created_at)
words      (id, word, category_id, date_added, notes, created_at)
variants   (id, word_id, variant, date_added, notes, created_at)
settings   (key, value)  -- para tokens e preferências
```

O banco é criado automaticamente no primeiro acesso e persiste localmente no dispositivo.

---

## 📤 Formato do CSV Exportado

```csv
palavra,categoria,data,variante
mamãe,Família,2024-01-15,
cachorro,Animais,2024-01-20,
cachorro,Animais,2024-01-22,cacaco
```

A linha com variante vazia é a palavra principal. As demais linhas com variante são pronuncias alternativas registradas.

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| **Expo / React Native** | Framework mobile multiplataforma |
| **expo-sqlite** | Banco de dados local (equivalente ao Room) |
| **expo-file-system** | Manipulação de arquivos para export CSV |
| **expo-sharing** | Compartilhamento de arquivos |
| **expo-router** | Navegação baseada em arquivos |
| **Google Drive API v3** | Backup na nuvem via REST |
| **EAS Build** | Build e distribuição do APK |

---

## 🆘 Problemas Comuns

**Expo Go não consegue ler QR code**
→ Verifique se o celular e o computador estão na mesma rede Wi-Fi.

**Build falha com "No account found"**
→ Execute `eas login` antes de `eas build`.

**Google Drive retorna 401**
→ O Access Token expirou (validade ~1h). Gere um novo no OAuth Playground.

---

## 💕 Créditos

Inspirado no app [Palavrinhas](https://palavrinhas-olivia.lovable.app/) para registrar o desenvolvimento de linguagem infantil.
