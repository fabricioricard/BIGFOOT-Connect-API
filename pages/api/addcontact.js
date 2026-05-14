export default async function handler(req, res) {
  // CORS restrito ao domínio do aplicativo
  const ALLOWED_ORIGIN = 'https://bigfootconnect.tech';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, nome } = req.body || {};

  // Validação de campos obrigatórios
  if (!email || !nome) {
    return res.status(400).json({ error: 'Email e nome são obrigatórios.' });
  }

  // Validação de formato de e-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  // Sanitização do nome: remove caracteres indesejados (mantém letras, números, espaços e acentos)
  const sanitizedNome = nome.replace(/[^a-zA-ZÀ-ÿ0-9\s'-]/g, '').trim();
  if (sanitizedNome.length === 0) {
    return res.status(400).json({ error: 'Nome inválido após sanitização.' });
  }

  // 🚦 Simples rate limiting por IP (cache em memória — adequado para pequeno volume)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
  const now = Date.now();
  if (!global._rateLimitCache) global._rateLimitCache = {};
  const lastCall = global._rateLimitCache[ip] || 0;
  if (now - lastCall < 2000) {
    return res.status(429).json({ error: 'Muitas solicitações. Aguarde e tente novamente.' });
  }
  global._rateLimitCache[ip] = now;

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          PRENOME: sanitizedNome
        },
        listIds: [5]
      })
    });

    const result = await response.json();
    res.status(200).json(result);
    
  } catch (error) {
    console.error('[addcontact] Error:', error.message);
    res.status(500).json({ error: 'Erro ao adicionar contato' });
  }
}