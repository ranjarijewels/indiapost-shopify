const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();

app.use(bodyParser.json());

const SHOP = "wacfbz-1z.myshopify.com";

const CLIENT_ID = process.env.SHOPIFY_API_KEY;
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;

let ACCESS_TOKEN = "";

app.get("/", (req, res) => {
  res.send("India Post Shopify Integration Running");
});

app.get("/auth", (req, res) => {
  const installUrl =
    `https://${SHOP}/admin/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&scope=read_orders,write_orders,read_fulfillments,write_fulfillments,read_shipping,write_shipping,read_products` +
    `&redirect_uri=https://indiapost-shopify.onrender.com/auth/callback`;

  res.redirect(installUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const response = await axios.post(
      `https://${SHOP}/admin/oauth/access_token`,
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }
    );

    ACCESS_TOKEN = response.data.access_token;

    res.send("Shopify connected successfully!");
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
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

app.post("/webhook/orders/create", async (req, res) => {
  try {
    const order = req.body;

    console.log("New Shopify Order:", order);

    // India Post shipment logic will come here later

    res.status(200).send("Order webhook received");
  } catch (error) {
    console.error(error);
    res.status(500).send("Webhook error");
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
