# 🔗 BIGFOOT Connect API

API serverless da plataforma **BIGFOOT Connect**, responsável por:
- Sincronização de BIG Points minerados pelos nós
- Registo e listagem de peers da rede BIGchain
- Integração com o serviço de contactos Brevo

A API é construída sobre **Vercel Functions** e comunica com **Firebase Firestore / Auth** através do **Firebase Admin SDK**.

---

## 🚀 Endpoints

### 1. `POST /api/bigpoints`
Regista ou atualiza os BIG Points diários de um utilizador autenticado.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|-----------|
| `email` | string | ✅ | Email do utilizador |
| `date` | string | ✅ | Data no formato `YYYY-MM-DD` |
| `amount` | number | ✅ | Quantidade de BIG Points |
| `idToken` | string | ✅ | Token Firebase ID do utilizador |

**Autenticação:** Firebase ID Token (`Authorization` implícito no corpo).  
**Rate limit:** 1 pedido a cada 30 segundos por UID.  
**Respostas:** `200` (atualizado), `201` (criado), `400/401/403/429/500`.

**Exemplo de resposta (sucesso):**
```json
{
  "success": true,
  "message": "BIG Points atualizados com sucesso",
  "data": {
    "date": "2026-05-11",
    "previousAmount": 10.5,
    "newAmount": 12.3,
    "added": 12.3
  }
}

2. POST /api/addcontact

Adiciona um contacto à lista do Brevo (marketing / newsletters).
Campo	Tipo	Obrigatório	Descrição
email	string	✅	Email do contacto
nome	string	✅	Nome do contacto

Rate limit: 1 pedido a cada 2 segundos por IP.
Respostas: 200, 400/429/500.
CORS: restrito ao domínio https://bigfootconnect.tech.
3. GET /api/peers/list

Lista os peers ativos da rede BIGchain (não expirados).

URL pública: não requer autenticação.
Respostas: 200 com array de peers, 500.

Exemplo de resposta:
json

{
  "success": true,
  "count": 5,
  "peers": [
    {
      "address": "192.168.1.10:3000",
      "nodeId": "abc123...",
      "version": "1.0.0",
      "lastSeen": "2026-05-11T20:00:00Z"
    }
  ]
}

4. POST /api/peers/register

Regista (ou atualiza) um peer na rede BIGchain.
Campo	Tipo	Obrigatório	Descrição
address	string	✅	Endereço IPv4 ou IPv6
port	number	✅	Porta P2P (1024‑65535)
nodeId	string	❌	Identificador do nó
version	string	❌	Versão do software

Rate limit: 1 pedido a cada 10 segundos por IP.
TTL: cada registo expira após 10 minutos (renovável).
Respostas: 200, 400/429/500.
🔐 Autenticação & Segurança

O endpoint bigpoints valida o Firebase ID Token e confirma que o email do token coincide com o email enviado, prevenindo escrita cruzada.

Dados sensíveis (chave privada, tokens) nunca são expostos nos logs ou nas respostas.

Logs de produção omitem detalhes completos (emails mascarados, IDs truncados).

Rate limiting básico por IP ou UID protege contra abuso.

# Opcionais
MAX_DAILY_BIGPOINTS=100000   # limite de segurança para BIG Points diários
NODE_ENV=production           # esconde detalhes de erro quando "production"

Os endpoints definem cabeçalhos CORS de acordo com sua finalidade:

    addcontact → restrito a https://bigfootconnect.tech.

    peers/list e peers/register → acesso público (*).

    bigpoints → acesso público (pode ser restringido futuramente).

📜 Licença

Consulte o repositório principal BIGFOOT-Connect para mais informações.