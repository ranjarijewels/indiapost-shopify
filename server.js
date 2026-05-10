const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();

app.use(bodyParser.json());

const SHOP = "ranjarijewels.myshopify.com";
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

app.get("/", (req, res) => {
  res.send("India Post Shopify Integration Running");
});

app.get("/orders", async (req, res) => {
  try {
    const response = await axios.get(
      `https://${SHOP}/admin/api/2026-04/orders.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error fetching orders");
  }
});

app.post("/webhook/indiapost", (req, res) => {
  console.log("Webhook Received:", req.body);

  res.status(200).send("Webhook received");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
