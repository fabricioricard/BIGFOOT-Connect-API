const { db } = require('../../../lib/firebaseAdmin');

// Tempo máximo que um peer é considerado ativo (10 minutos)
const PEER_TTL_MINUTES = 10;

// Rate limiting simples por IP (cache em memória)
const rateLimitCache = new Map();
const RATE_LIMIT_MS = 10000; // 10 segundos entre registos do mesmo IP

// Validação de endereço IP (IPv4 e IPv6 simplificados)
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

function isValidIP(address) {
  return ipv4Regex.test(address) || ipv6Regex.test(address);
}

module.exports = async function handler(req, res) {
  // CORS público — endpoint destinado a peers da rede
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    // Validação do endereço IP
    if (!isValidIP(address)) {
      return res.status(400).json({
        success: false,
        message: 'Endereço IP inválido (deve ser IPv4 ou IPv6)'
      });
    }

    // Validação da porta
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        message: 'Porta inválida (deve ser entre 1024 e 65535)'
      });
    }

    // Rate limiting por IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 
                     '0.0.0.0';
    const now = Date.now();
    const lastCall = rateLimitCache.get(clientIp) || 0;
    if (now - lastCall < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Muitas requisições. Aguarde ${remaining} segundos.`
      });
    }
    rateLimitCache.set(clientIp, now);

    // Montar endereço completo do peer
    const isIPv6 = address.includes(':') && !address.startsWith('[');
    const peerAddress = isIPv6
      ? `[${address}]:${portNum}`
      : `${address}:${portNum}`;

    // ID do documento no Firestore (baseado no endereço, sanitizado)
    const docId = peerAddress.replace(/[^a-zA-Z0-9._-]/g, '_');

    const expiresAt = new Date(now + PEER_TTL_MINUTES * 60 * 1000);

    const peerData = {
      address: peerAddress,
      rawAddress: address,
      port: portNum,
      nodeId: nodeId || null,
      version: version || '1.0.0',
      lastSeen: new Date(now),
      expiresAt: expiresAt,
      registeredAt: new Date(now)
    };

    await db.collection('bigchain_peers').doc(docId).set(peerData, { merge: true });

    // Log seguro — nodeId truncado
    const shortNodeId = nodeId ? nodeId.substring(0, 6) + '…' : 'N/A';
    console.log(`[PEERS] ✅ Peer registrado: ${peerAddress} (nodeId: ${shortNodeId})`);

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
};