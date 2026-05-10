const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();

app.use(bodyParser.json());

const SHOP = "wacfbz-1z.myshopify.com";

const CLIENT_ID = process.env.SHOPIFY_API_KEY;
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;

const INDIAPOST_USERNAME = process.env.INDIAPOST_USERNAME;
const INDIAPOST_PASSWORD = process.env.INDIAPOST_PASSWORD;

const CUSTOMER_ID = "1242359603";
const CONTRACT_ID = "41743980";

let ACCESS_TOKEN = "";
let INDIAPOST_TOKEN = "";

app.get("/", (req, res) => {
  res.send("India Post Shopify Integration Running");
});

/* ---------------- SHOPIFY AUTH ---------------- */

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

    console.log("Shopify Access Token Generated");

    res.send("Shopify connected successfully!");
  } catch (error) {
    console.error(
      "Shopify Auth Error:",
      error.response?.data || error.message
    );

    res.status(500).send("Authentication failed");
  }
});

/* ---------------- INDIA POST LOGIN ---------------- */

async function loginIndiaPost() {
  try {
    const response = await axios.post(
      "https://test.cept.gov.in/beextcustomer/v1/access/login",
      {
        username: INDIAPOST_USERNAME,
        password: INDIAPOST_PASSWORD,
      },
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    INDIAPOST_TOKEN = response.data.data.access_token;

    console.log("India Post Login Successful");
  } catch (error) {
    console.error(
      "India Post Login Error:",
      error.response?.data || error.message
    );
  }
}

/* ---------------- FETCH SHOPIFY ORDERS ---------------- */

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
    console.error(
      "Order Fetch Error:",
      error.response?.data || error.message
    );

    res.status(500).send("Error fetching orders");
  }
});

/* ---------------- FULFILLMENT WEBHOOK ---------------- */

app.post("/webhook/orders/create", async (req, res) => {
  try {
    const fulfillment = req.body;

    console.log("Fulfillment Received:", fulfillment);

    /* LOGIN INDIA POST */

    await loginIndiaPost();

    if (!INDIAPOST_TOKEN) {
      return res.status(500).send("India Post token generation failed");
    }

    /* PREPARE BOOKING PAYLOAD */

    const bookingPayload = {
      articles: [
        {
          bulk_customer_id: parseInt(CUSTOMER_ID),
          contract_id: parseInt(CONTRACT_ID),

          pickup_or_dropoff: "DROPOFF",

          article_type: "SP",

          physical_weight: 1,

          shape_of_article: "NROL",

          length: 10,
          breadth_diameter: 10,
          height: 5,

          sender_name: "Ranjari Jewels",
          sender_add_line_1: "Chennai",
          sender_city: "Chennai",
          sender_state: "Tamil Nadu",
          sender_pincode: "600001",
          sender_mobile_no: "9999999999",

          receiver_name:
            fulfillment.shipping_address?.name || "Customer",

          receiver_add_line_1:
            fulfillment.shipping_address?.address1 || "Address",

          receiver_city:
            fulfillment.shipping_address?.city || "City",

          receiver_state:
            fulfillment.shipping_address?.province || "State",

          receiver_pincode:
            fulfillment.shipping_address?.zip || "000000",

          receiver_mobile_no:
            fulfillment.shipping_address?.phone || "9999999999",

          drop_off_pincode: "600001",

          alt_address_flag: false,
          pickup_address_flag: false,

          codr_cod: "COD",
          value_for_codr_cod: 0,

          bulk_reference:
            fulfillment.order_number?.toString() || "SHOPIFY",
        },
      ],
    };

    console.log(
      "Booking Payload:",
      JSON.stringify(bookingPayload, null, 2)
    );

    /* CREATE INDIA POST SHIPMENT */

    const bookingResponse = await axios.post(
      `https://test.cept.gov.in/beextcustomer/process-articles-file/${CUSTOMER_ID}`,
      bookingPayload,
      {
        headers: {
          Authorization: `Bearer ${INDIAPOST_TOKEN}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 30000,
      }
    );

    console.log(
      "India Post Booking Success:",
      bookingResponse.data
    );

    res.status(200).send("Fulfillment processed successfully");
  } catch (error) {
    console.error(
      "Webhook Processing Error:",
      error.response?.data || error.message
    );

    res.status(500).send("Webhook processing failed");
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
