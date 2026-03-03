const { db } = require('../../../lib/firebaseAdmin');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Use GET.' });
  }

  try {
    const now = new Date();

    // Buscar apenas peers que ainda não expiraram
    const snapshot = await db
      .collection('bigchain_peers')
      .where('expiresAt', '>', now)
      .orderBy('expiresAt', 'desc')
      .limit(100)
      .get();

    const peers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      peers.push({
        address: data.address,
        nodeId: data.nodeId || null,
        version: data.version || '1.0.0',
        lastSeen: data.lastSeen?.toDate?.()?.toISOString() || null
      });
    });

    console.log(`[PEERS] 📋 Lista solicitada: ${peers.length} peers ativos`);

    return res.status(200).json({
      success: true,
      count: peers.length,
      peers: peers
    });

  } catch (error) {
    console.error('[PEERS] ❌ Erro em /api/peers/list:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
