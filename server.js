const express = require("express");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("India Post Shopify Integration Running");
});

app.post("/webhook/indiapost", (req, res) => {
  console.log("Webhook Received:", req.body);

  res.status(200).send("Webhook received");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});