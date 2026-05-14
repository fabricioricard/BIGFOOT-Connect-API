# 🔗 BIGFOOT Connect API

API serverless da plataforma **BIGFOOT Connect**, responsável pela sincronização de BIG Points, gestão de peers da rede BIGchain e integração com o serviço de contactos Brevo.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológico](#stack-tecnológico)
- [Endpoints](#endpoints)
- [Autenticação & Segurança](#autenticação--segurança)
- [Configuração](#configuração)
- [Rate Limiting](#rate-limiting)
- [Licença](#licença)

---

## Visão Geral

A **BIGFOOT Connect API** fornece três funcionalidades principais:

- ✅ **Sincronização de BIG Points** — Regista e atualiza pontos minerados pelos nós
- ✅ **Gestão de Peers** — Registo, listagem e descoberta de nós na rede BIGchain
- ✅ **Integração Brevo** — Adiciona contactos à lista de marketing/newsletters

---

## Stack Tecnológico

| Componente | Tecnologia |
|-----------|-----------|
| **Runtime** | Vercel Functions (Node.js) |
| **Base de Dados** | Firebase Firestore |
| **Autenticação** | Firebase Auth |
| **SDK** | Firebase Admin SDK |
| **Email** | Brevo (Sendinblue) |

---

## Endpoints

### 1. POST `/api/bigpoints`

Regista ou atualiza os BIG Points diários de um utilizador autenticado.

**Autenticação:** Firebase ID Token (no corpo da requisição)  
**Rate Limit:** 1 pedido a cada 30 segundos por UID  
**CORS:** Acesso público

#### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:----------:|-----------|
| `email` | string | ✅ | Email do utilizador |
| `date` | string | ✅ | Data no formato `YYYY-MM-DD` |
| `amount` | number | ✅ | Quantidade de BIG Points |
| `idToken` | string | ✅ | Token Firebase ID do utilizador |

#### Respostas

| Status | Descrição |
|--------|-----------|
| `200` | BIG Points atualizados com sucesso |
| `201` | BIG Points criados (novo registo) |
| `400` | Parâmetros inválidos |
| `401` | Token inválido ou expirado |
| `403` | Utilizador não autorizado |
| `429` | Rate limit excedido |
| `500` | Erro no servidor |

#### Exemplo de Requisição

```bash
curl -X POST https://api.bigfootconnect.tech/api/bigpoints \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "date": "2026-05-11",
    "amount": 12.3,
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }'
```

#### Exemplo de Resposta

```json
{
  "success": true,
  "message": "BIG Points atualizados com sucesso",
  "data": {
    "date": "2026-05-11",
    "previousAmount": 10.5,
    "newAmount": 12.3,
    "added": 1.8
  }
}
```

---

### 2. POST `/api/addcontact`

Adiciona um contacto à lista do Brevo para marketing e newsletters.

**Autenticação:** Nenhuma (público)  
**Rate Limit:** 1 pedido a cada 2 segundos por IP  
**CORS:** Restrito a `https://bigfootconnect.tech`

#### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:----------:|-----------|
| `email` | string | ✅ | Email do contacto |
| `nome` | string | ✅ | Nome do contacto |

#### Respostas

| Status | Descrição |
|--------|-----------|
| `200` | Contacto adicionado com sucesso |
| `400` | Parâmetros inválidos |
| `429` | Rate limit excedido |
| `500` | Erro no servidor |

#### Exemplo de Requisição

```bash
curl -X POST https://api.bigfootconnect.tech/api/addcontact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@example.com",
    "nome": "João Silva"
  }'
```

---

### 3. GET `/api/peers/list`

Lista os peers ativos da rede BIGchain (não expirados).

**Autenticação:** Nenhuma (público)  
**Rate Limit:** Nenhum  
**CORS:** Acesso público (`*`)

#### Respostas

| Status | Descrição |
|--------|-----------|
| `200` | Lista de peers retornada com sucesso |
| `500` | Erro no servidor |

#### Exemplo de Resposta

```json
{
  "success": true,
  "count": 5,
  "peers": [
    {
      "address": "192.168.1.10:3000",
      "nodeId": "abc123...",
      "version": "1.0.0",
      "lastSeen": "2026-05-11T20:00:00Z"
    },
    {
      "address": "192.168.1.20:3000",
      "nodeId": "def456...",
      "version": "1.0.0",
      "lastSeen": "2026-05-11T19:55:00Z"
    }
  ]
}
```

---

### 4. POST `/api/peers/register`

Regista ou atualiza um peer na rede BIGchain.

**Autenticação:** Nenhuma (público)  
**Rate Limit:** 1 pedido a cada 10 segundos por IP  
**CORS:** Acesso público (`*`)  
**TTL:** Cada registo expira após 10 minutos (renovável)

#### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:----------:|-----------|
| `address` | string | ✅ | Endereço IPv4 ou IPv6 |
| `port` | number | ✅ | Porta P2P (1024‑65535) |
| `nodeId` | string | ❌ | Identificador único do nó |
| `version` | string | ❌ | Versão do software |

#### Respostas

| Status | Descrição |
|--------|-----------|
| `200` | Peer registado/atualizado com sucesso |
| `400` | Parâmetros inválidos |
| `429` | Rate limit excedido |
| `500` | Erro no servidor |

#### Exemplo de Requisição

```bash
curl -X POST https://api.bigfootconnect.tech/api/peers/register \
  -H "Content-Type: application/json" \
  -d '{
    "address": "203.0.113.45",
    "port": 3000,
    "nodeId": "node-abc123",
    "version": "1.0.0"
  }'
```

---

## Autenticação & Segurança

### Firebase ID Token

O endpoint `/api/bigpoints` requer um **Firebase ID Token** válido:

- O token é extraído do corpo da requisição (`idToken`)
- A identidade do utilizador é verificada e o email do token é comparado com o email enviado
- Isto previne escrita cruzada e acesso não autorizado

### Proteção de Dados

- ✅ Dados sensíveis (chaves privadas, tokens) nunca são expostos em logs ou respostas
- ✅ Em produção, logs omitem detalhes completos (emails mascarados, IDs truncados)
- ✅ Rate limiting por IP e UID protege contra abuso
- ✅ CORS configurado de acordo com o endpoint e sua finalidade

### Cabeçalhos CORS

| Endpoint | CORS |
|----------|------|
| `/api/addcontact` | `https://bigfootconnect.tech` |
| `/api/peers/list` | `*` (público) |
| `/api/peers/register` | `*` (público) |
| `/api/bigpoints` | `*` (público, pode ser restringido) |

---

## Rate Limiting

A API implementa rate limiting para proteger contra abuso:

| Endpoint | Limite | Escopo |
|----------|--------|--------|
| `/api/bigpoints` | 1 req / 30s | Por UID |
| `/api/addcontact` | 1 req / 2s | Por IP |
| `/api/peers/register` | 1 req / 10s | Por IP |
| `/api/peers/list` | Sem limite | — |

---

## Configuração

### Variáveis de Ambiente

Crie um ficheiro `.env.local` na raiz do projeto:

```env
# Firebase
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_PRIVATE_KEY=sua-chave-privada
FIREBASE_CLIENT_EMAIL=seu-cliente-email

# Brevo
BREVO_API_KEY=sua-chave-brevo

# Segurança (opcional)
MAX_DAILY_BIGPOINTS=100000
NODE_ENV=production
```

### Instalação de Dependências

```bash
npm install
# ou
yarn install
```

### Deploy no Vercel

```bash
npm install -g vercel
vercel
```

---

## 📝 Licença

Este projeto é parte da plataforma **BIGFOOT Connect**. Consulte o [repositório principal](https://github.com/bigfoot-connect/bigfoot-connect) para mais informações sobre licença e contribuições.

---

## 🤝 Contribuições

Se encontrou um bug ou tem sugestões, abra uma [issue](https://github.com/bigfoot-connect/bigfoot-api/issues) ou envie um pull request.

---

**Desenvolvido com ❤️ pela equipa BIGFOOT Connect**