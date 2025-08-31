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

async function nextCode(prefix, pad, column) {
  const start = prefix.length + 2; // e.g., 'ORD-' -> start at 5
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(${column}, ?) AS UNSIGNED)), 0) AS maxn
       FROM orders WHERE ${column} LIKE ?`,
    [start, `${prefix}-%`]
  );
  const next = Number(rows[0]?.maxn || 0) + 1;
  return `${prefix}-${String(next).padStart(pad, "0")}`;
}

// ----- SCHEMA FLAGS -----
const schema = {
  hasPaymentTerms: true,
  hasOrderType: true,
};

(async () => {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='orders' AND COLUMN_NAME IN ('payment_terms','order_type')`,
      [DB_NAME]
    );
    const names = new Set(rows.map((r) => r.COLUMN_NAME));
    schema.hasPaymentTerms = names.has('payment_terms');
    schema.hasOrderType = names.has('order_type');
    if (!schema.hasPaymentTerms) console.warn('orders.payment_terms not found; will omit from writes');
    if (!schema.hasOrderType) console.warn('orders.order_type not found; will omit from writes');
  } catch (e) {
    console.warn('Failed to check schema; proceeding with defaults', e.message);
  }
})();

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
  if (order_type && schema.hasOrderType) {
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
  const key = req.params.id;
  let rows;
  if (/^\d+$/.test(key)) {
    [rows] = await pool.query(baseOrderSelect + " WHERE o.id=?", [key]);
  } else {
    [rows] = await pool.query(baseOrderSelect + " WHERE o.order_number=?", [key]);
  }
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
    payment_terms = null, // 'now' | 'installments' | 'later'
    signature = null,

    status = "pending",
  } = req.body;

  try {
    // Compute sequential numbers if not provided
    const ordNum = order_number || (await nextCode("ORD", 4, "order_number"));
    const balId = balance_id || null; // no longer auto-generate balance IDs

    const cols = [
      'order_number','customer_id','supplier_id','driver_id',
      'num_bags','plate_num','product',
    ];
    const vals = [
      ordNum, customer_id, supplier_id, driver_id,
      num_bags, plate_num, product,
    ];
    if (schema.hasOrderType) { cols.push('order_type'); vals.push(order_type); }
    cols.push('first_weight_time','first_weight_kg','second_weight_time','second_weight_kg','net_weight_kg');
    vals.push(toMySQLDateTime(first_weight_time), first_weight_kg, toMySQLDateTime(second_weight_time), second_weight_kg, net_weight_kg);
    cols.push('balance_id','customer_address','fees');
    vals.push(balId, customer_address, fees);
    cols.push('bill_date','unit','price','quantity','total_price','suggested_selling_price','payment_method');
    vals.push(bill_date, unit, price, quantity, total_price, suggested_selling_price, payment_method);
    if (schema.hasPaymentTerms) { cols.push('payment_terms'); vals.push(payment_terms); }
    cols.push('signature','status');
    vals.push(signature, status);

    const placeholders = cols.map(() => '?').join(',');
    const updateSet = cols.filter(c => c !== 'order_number').map(c => `${c}=VALUES(${c})`).join(',\n         ');

    const [r] = await pool.query(
      `INSERT INTO orders (${cols.join(', ')})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE
         ${updateSet}`,
      vals
    );

    const id =
      r.insertId ||
      (await pool.query("SELECT id FROM orders WHERE order_number=?", [
        ordNum,
      ]))[0][0].id;
    res.status(201).json({ id, order_number: ordNum, balance_id: balId });
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
    ...(schema.hasOrderType ? ["order_type"] : []),
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
    ...(schema.hasPaymentTerms ? ["payment_terms"] : []),
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
