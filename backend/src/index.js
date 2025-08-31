import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(express.json());

// ----- CORS -----
const defaultCors = [
  "https://hgm-gate.webeesign.com",
  "https://hgm-management.webeesign.com",
  "http://localhost:3000",
  "http://localhost:3001",
];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultCors.join(","))
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser clients / same-origin
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    optionsSuccessStatus: 204,
  })
);
app.options("*", cors());

// ----- ENV -----
const {
  DB_HOST = "db",
  DB_PORT = "3306",
  DB_NAME = "hgm",
  DB_USER = "hgmuser",
  DB_PASS = "hgmpw",
  PORT = 4000,
} = process.env;

// ----- DB POOL -----
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
});

// ----- UTIL -----
function toMySQLDateTime(input) {
  if (input == null || input === "") return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  // Store in UTC to avoid timezone ambiguity
  return (
    d.getUTCFullYear() +
    "-" + pad(d.getUTCMonth() + 1) +
    "-" + pad(d.getUTCDate()) +
    " " + pad(d.getUTCHours()) +
    ":" + pad(d.getUTCMinutes()) +
    ":" + pad(d.getUTCSeconds())
  );
}

// ----- HEALTH -----
app.get("/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// =================== DRIVERS ===================
app.get("/api/drivers", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, phone FROM drivers ORDER BY name ASC"
  );
  res.json(rows);
});

app.post("/api/drivers", async (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const [r] = await pool.query(
      "INSERT INTO drivers (name, phone) VALUES (?, ?) ON DUPLICATE KEY UPDATE phone=VALUES(phone)",
      [name, phone || null]
    );
    const id =
      r.insertId ||
      (await pool.query("SELECT id FROM drivers WHERE name=?", [name]))[0][0].id;
    res.status(201).json({ id, name, phone: phone || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =================== COMPANIES ===================
app.get("/api/companies", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, address FROM companies ORDER BY name ASC"
  );
  res.json(rows);
});

app.post("/api/companies", async (req, res) => {
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const [r] = await pool.query(
      "INSERT INTO companies (name, address) VALUES (?, ?) ON DUPLICATE KEY UPDATE address=VALUES(address)",
      [name, address || null]
    );
    const id =
      r.insertId ||
      (await pool.query("SELECT id FROM companies WHERE name=?", [name]))[0][0].id;
    res.status(201).json({ id, name, address: address || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =================== ORDERS ===================
const baseOrderSelect = `
  SELECT o.*,
         c.name AS customer_name, c.address AS customer_company_address,
         s.name AS supplier_name, s.address AS supplier_company_address,
         d.name AS driver_name, d.phone AS driver_phone
    FROM orders o
    LEFT JOIN companies c ON o.customer_id = c.id
    LEFT JOIN companies s ON o.supplier_id = s.id
    LEFT JOIN drivers   d ON o.driver_id   = d.id
`;

app.get("/api/orders", async (req, res) => {
  const { status, order_type } = req.query;
  const whereParts = [];
  const params = [];
  if (status) {
    whereParts.push("o.status=?");
    params.push(status);
  }
  if (order_type) {
    whereParts.push("o.order_type=?");
    params.push(order_type);
  }
  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `${baseOrderSelect} ${where} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json(rows);
});

app.get("/api/orders/:id", async (req, res) => {
  const [rows] = await pool.query(`${baseOrderSelect} WHERE o.id=?`, [
    req.params.id,
  ]);
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

app.post("/api/orders", async (req, res) => {
  const {
    order_number,

    customer_id = null,
    supplier_id = null,
    driver_id = null,

    num_bags = null,
    plate_num = null,
    product = null, // 'flour' | 'bran' | 'shawa2ib'
    order_type = "regular", // 'regular' | 'quick'

    first_weight_time = null,
    first_weight_kg = null,
    second_weight_time = null,
    second_weight_kg = null,
    net_weight_kg = null,

    balance_id = null,

    customer_address = null,
    fees = null,

    bill_date = null,
    unit = null,
    price = null,
    quantity = null,
    total_price = null,
    suggested_selling_price = null,
    payment_method = null, // 'cash' | 'card' | 'transfer' | 'other'
    signature = null,

    status = "pending",
  } = req.body;

  if (!order_number)
    return res.status(400).json({ error: "order_number required" });

  try {
    const [r] = await pool.query(
      `INSERT INTO orders
        (order_number, customer_id, supplier_id, driver_id,
         num_bags, plate_num, product, order_type,
         first_weight_time, first_weight_kg, second_weight_time, second_weight_kg, net_weight_kg,
         balance_id, customer_address, fees,
         bill_date, unit, price, quantity, total_price, suggested_selling_price, payment_method, signature,
         status)
       VALUES (?,?,?,?,?,
               ?,?,?,?, ?,?,?,?,
               ?,?,?,
               ?,?,?,?, ?,?,?,?,
               ?)
       ON DUPLICATE KEY UPDATE
         customer_id=VALUES(customer_id),
         supplier_id=VALUES(supplier_id),
         driver_id=VALUES(driver_id),
         num_bags=VALUES(num_bags),
         plate_num=VALUES(plate_num),
         product=VALUES(product),
         order_type=VALUES(order_type),
         first_weight_time=VALUES(first_weight_time),
         first_weight_kg=VALUES(first_weight_kg),
         second_weight_time=VALUES(second_weight_time),
         second_weight_kg=VALUES(second_weight_kg),
         net_weight_kg=VALUES(net_weight_kg),
         balance_id=VALUES(balance_id),
         customer_address=VALUES(customer_address),
         fees=VALUES(fees),
         bill_date=VALUES(bill_date),
         unit=VALUES(unit),
         price=VALUES(price),
         quantity=VALUES(quantity),
         total_price=VALUES(total_price),
         suggested_selling_price=VALUES(suggested_selling_price),
         payment_method=VALUES(payment_method),
         signature=VALUES(signature),
         status=VALUES(status)`,
      [
        order_number,
        customer_id,
        supplier_id,
        driver_id,
        num_bags,
        plate_num,
        product,
        order_type,
        toMySQLDateTime(first_weight_time),
        first_weight_kg,
        toMySQLDateTime(second_weight_time),
        second_weight_kg,
        net_weight_kg,
        balance_id,
        customer_address,
        fees,
        bill_date,
        unit,
        price,
        quantity,
        total_price,
        suggested_selling_price,
        payment_method,
        signature,
        status,
      ]
    );

    const id =
      r.insertId ||
      (await pool.query("SELECT id FROM orders WHERE order_number=?", [
        order_number,
      ]))[0][0].id;
    res.status(201).json({ id, order_number });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  const fields = [
    "customer_id",
    "supplier_id",
    "driver_id",
    "num_bags",
    "plate_num",
    "product",
    "order_type",
    "first_weight_time",
    "first_weight_kg",
    "second_weight_time",
    "second_weight_kg",
    "net_weight_kg",
    "balance_id",
    "customer_address",
    "fees",
    "bill_date",
    "unit",
    "price",
    "quantity",
    "total_price",
    "suggested_selling_price",
    "payment_method",
    "signature",
    "status",
  ];

  const setParts = [];
  const vals = [];
  for (const f of fields) {
    if (f in req.body) {
      setParts.push(`${f}=?`);
      if (f === "first_weight_time" || f === "second_weight_time") {
        vals.push(toMySQLDateTime(req.body[f]));
      } else {
        vals.push(req.body[f]);
      }
    }
  }
  if (!setParts.length)
    return res.status(400).json({ error: "no fields to update" });

  vals.push(req.params.id);
  await pool.query(`UPDATE orders SET ${setParts.join(", ")} WHERE id=?`, vals);
  res.json({ ok: true });
});

app.delete("/api/orders/:id", async (req, res) => {
  await pool.query("DELETE FROM orders WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// ----- START -----
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});
