export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    name: "BIGFOOT Connect API",
    version: "1.0.0",
    status: "online",
    endpoints: [
      "POST /api/bigpoints",
      "POST /api/addcontact",
      "GET /api/peers/list",
      "POST /api/peers/register"
    ]
  });
}