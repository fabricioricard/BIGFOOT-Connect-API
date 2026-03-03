const { db } = require('../../../lib/firebaseAdmin');

// Tempo máximo que um peer é considerado ativo (10 minutos)
const PEER_TTL_MINUTES = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Use POST.' });
  }

  try {
    const { address, port, nodeId, version } = req.body;

    if (!address || !port) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: address, port'
      });
    }

    // Validação básica do endereço
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        message: 'Porta inválida (deve ser entre 1024 e 65535)'
      });
    }

    // Montar endereço completo do peer
    // Suporte IPv6 ([addr]:port) e IPv4 (addr:port)
    const isIPv6 = address.includes(':') && !address.startsWith('[');
    const peerAddress = isIPv6
      ? `[${address}]:${portNum}`
      : `${address}:${portNum}`;

    // ID do documento no Firestore (baseado no endereço, sanitizado)
    const docId = peerAddress.replace(/[^a-zA-Z0-9._-]/g, '_');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PEER_TTL_MINUTES * 60 * 1000);

    const peerData = {
      address: peerAddress,
      rawAddress: address,
      port: portNum,
      nodeId: nodeId || null,
      version: version || '1.0.0',
      lastSeen: now,
      expiresAt: expiresAt,
      registeredAt: now
    };

    await db.collection('bigchain_peers').doc(docId).set(peerData, { merge: true });

    console.log(`[PEERS] ✅ Peer registrado: ${peerAddress} (nodeId: ${nodeId || 'N/A'})`);

    return res.status(200).json({
      success: true,
      message: 'Peer registrado com sucesso',
      data: {
        address: peerAddress,
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('[PEERS] ❌ Erro em /api/peers/register:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
