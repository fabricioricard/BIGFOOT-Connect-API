import { db, auth } from '../../lib/firebaseAdmin';

// Rate limiting simples por UID (cache em memória)
const rateLimitCache = new Map();
const RATE_LIMIT_MS = 30000;

function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'e-mail inválido';
  return email.replace(/(.{2}).*(@.*)/, '$1***$2');
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://bigfootconnect.tech');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido. Use POST.' });
  }

  try {
    const { email, date, amount, idToken } = req.body;

    if (!email || !date || amount === undefined || !idToken) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios: email, date, amount, idToken' });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      return res.status(401).json({ success: false, message: 'Token de autenticação inválido' });
    }

    if (decodedToken.email !== email) {
      return res.status(403).json({ success: false, message: 'Email não corresponde ao token de autenticação' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: 'Quantidade deve ser um número positivo' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, message: 'Formato de data inválido. Use YYYY-MM-DD' });
    }

    const MAX_DAILY_BIGPOINTS = process.env.MAX_DAILY_BIGPOINTS || 100000;
    if (numericAmount > MAX_DAILY_BIGPOINTS) {
      return res.status(400).json({ success: false, message: `Quantidade excede limite máximo` });
    }

    const userId = decodedToken.uid;

    // Rate limiting por UID
    const now = Date.now();
    const lastCall = rateLimitCache.get(userId) || 0;
    if (now - lastCall < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000);
      return res.status(429).json({ success: false, message: `Aguarde ${remaining} segundos.` });
    }
    rateLimitCache.set(userId, now);

    const docRef = db.collection('users').doc(userId).collection('bigpoints_earnings').doc(date);
    const existingDoc = await docRef.get();

    if (existingDoc.exists) {
      const currentAmount = existingDoc.data().bigpoints || 0;
      await docRef.update({ bigpoints: numericAmount, updatedAt: new Date(), lastUpdate: new Date().toISOString() });
      return res.status(200).json({ success: true, message: 'BIG Points atualizados', data: { date, previousAmount: currentAmount, newAmount: numericAmount } });
    } else {
      await docRef.set({ bigpoints: numericAmount, createdAt: new Date(), updatedAt: new Date(), userId, email });
      return res.status(201).json({ success: true, message: 'BIG Points registrados', data: { date, amount: numericAmount, created: true } });
    }

  } catch (error) {
    console.error('[API] ❌ Erro em /api/bigpoints:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}