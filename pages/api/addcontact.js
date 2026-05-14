export default async function handler(req, res) {
  const ALLOWED_ORIGIN = 'https://bigfootconnect.tech';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, nome } = req.body || {};

  if (!email || !nome) {
    return res.status(400).json({ error: 'Email e nome são obrigatórios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  const sanitizedNome = nome.replace(/[^a-zA-ZÀ-ÿ0-9\s'-]/g, '').trim();
  if (sanitizedNome.length === 0) {
    return res.status(400).json({ error: 'Nome inválido após sanitização.' });
  }

  // Rate limiting simples
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
        attributes: { PRENOME: sanitizedNome },
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