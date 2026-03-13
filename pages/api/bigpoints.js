const { db, auth } = require('../../lib/firebaseAdmin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Método não permitido. Use POST.' 
    });
  }

  try {
    const { email, date, amount, idToken } = req.body;

    if (!email || !date || amount === undefined || !idToken) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios: email, date, amount, idToken'
      });
    }

    console.log(`[API] === PROCESSANDO BIGPOINTS ===`);
    console.log(`[API] Email: ${email}`);
    console.log(`[API] Data recebida: ${date}`);
    console.log(`[API] Amount: ${amount}`);
    console.log(`[API] Timestamp do servidor (UTC): ${new Date().toISOString()}`);
    console.log(`[API] Timezone do servidor: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      console.error('[API] Erro na autenticação:', authError);
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação inválido'
      });
    }

    if (decodedToken.email !== email) {
      console.log(`[API] ERRO: Email não corresponde - Token: ${decodedToken.email}, Enviado: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Email não corresponde ao token de autenticação'
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade deve ser um número positivo'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de data inválido. Use YYYY-MM-DD'
      });
    }

    const MAX_DAILY_BIGPOINTS = process.env.MAX_DAILY_BIGPOINTS || 100000;
    if (numericAmount > MAX_DAILY_BIGPOINTS) {
      return res.status(400).json({
        success: false,
        message: `Quantidade excede limite máximo de segurança (${MAX_DAILY_BIGPOINTS} BIG Points)`
      });
    }

    const userId = decodedToken.uid;
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('bigpoints_earnings')
      .doc(date);

    console.log(`[API] Referência do documento: users/${userId}/bigpoints_earnings/${date}`);

    const existingDoc = await docRef.get();
    
    if (existingDoc.exists) {
      const currentAmount = existingDoc.data().bigpoints || 0;
      const newAmount = numericAmount;
      
      await docRef.update({
        bigpoints: newAmount,
        updatedAt: new Date(),
        lastUpdate: new Date().toISOString()
      });

      console.log(`[API] ✅ BIG Points atualizados para ${email} em ${date}: ${currentAmount} → ${newAmount}`);
      
      return res.status(200).json({
        success: true,
        message: 'BIG Points atualizados com sucesso',
        data: { date, previousAmount: currentAmount, newAmount, added: numericAmount }
      });
      
    } else {
      await docRef.set({
        bigpoints: numericAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        email
      });

      console.log(`[API] ✅ Novo registro criado para ${email} em ${date}: ${numericAmount}`);
      
      return res.status(201).json({
        success: true,
        message: 'BIG Points registrados com sucesso',
        data: { date, amount: numericAmount, created: true }
      });
    }

  } catch (error) {
    console.error('[API] ❌ Erro no endpoint /api/bigpoints:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
