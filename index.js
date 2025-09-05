const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// exemplo de rota
app.get("/", (req, res) => {
  res.send("BIGFOOT Connect API rodando 🚀");
});

// porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
