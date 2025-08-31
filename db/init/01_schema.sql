-- ============================
-- HGM DB bootstrap (MariaDB)
-- ============================

-- DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NULL,
  UNIQUE KEY uniq_driver_name (name)
);

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(255) NULL,
  UNIQUE KEY uniq_company_name (name)
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL,

  -- Parties
  customer_id INT NULL,
  supplier_id INT NULL,
  driver_id INT NULL,                    -- for Balance Card (Driver & Phone)

  -- Basic shipment
  num_bags INT NULL,
  plate_num VARCHAR(40) NULL,
  product ENUM('flour','bran','shawa2ib') NULL,
  -- Order type
  order_type ENUM('regular','quick') NOT NULL DEFAULT 'regular',

  -- Weighing
  first_weight_time DATETIME NULL,
  first_weight_kg DECIMAL(10,2) NULL,
  second_weight_time DATETIME NULL,
  second_weight_kg DECIMAL(10,2) NULL,
  -- store or compute; stored by default:
  net_weight_kg DECIMAL(10,2) NULL,
  -- To auto-compute instead, comment the previous line and uncomment:
  -- net_weight_kg DECIMAL(10,2) AS (ABS(IFNULL(first_weight_kg,0) - IFNULL(second_weight_kg,0))) STORED,

  -- Balance Card
  balance_id VARCHAR(64) NULL,

  -- Shipping Card (only if supplier = HGM)
  customer_address VARCHAR(255) NULL,
  fees DECIMAL(10,2) NULL,

  -- Bill
  bill_date DATE NULL,
  unit VARCHAR(32) NULL,                   -- e.g., "kg", "bag"
  price DECIMAL(10,2) NULL,                -- price per unit
  quantity DECIMAL(10,2) NULL,
  total_price DECIMAL(10,2) NULL,          -- optionally compute app-side: price*quantity
  suggested_selling_price DECIMAL(10,2) NULL,
  payment_method ENUM('cash','card','transfer','other') NULL,
  signature VARCHAR(160) NULL,             -- signer name or path to signature image

  -- Meta
  status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- FKs
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES companies(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_orders_supplier FOREIGN KEY (supplier_id) REFERENCES companies(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_orders_driver   FOREIGN KEY (driver_id)   REFERENCES drivers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  UNIQUE KEY uniq_order_number (order_number)
);

-- ============================
-- Seed data
-- ============================

-- Ensure supplier HGM exists
INSERT INTO companies (name, address) VALUES ('HGM', '—')
  ON DUPLICATE KEY UPDATE address = VALUES(address);

-- A couple of example companies
INSERT INTO companies (name, address) VALUES
  ('Acme Logistics', '123 Industrial Way'),
  ('BlueLine GmbH', 'Musterstraße 12, Berlin')
ON DUPLICATE KEY UPDATE address = VALUES(address);

-- Some drivers
INSERT INTO drivers (name, phone) VALUES
  ('John Doe', '+49 176 1111111'),
  ('Marta Nowak', '+49 176 2222222')
ON DUPLICATE KEY UPDATE phone = VALUES(phone);

-- ============================
-- Example order using NEW columns
-- Customer = Acme Logistics, Supplier = HGM, Driver = John Doe
-- ============================
INSERT INTO orders (
  order_number,
  customer_id, supplier_id, driver_id,
  num_bags, plate_num, product, order_type,
  first_weight_time, first_weight_kg,
  second_weight_time, second_weight_kg,
  net_weight_kg,
  balance_id,
  customer_address, fees,
  bill_date, unit, price, quantity, total_price, suggested_selling_price, payment_method, signature,
  status
)
SELECT
  'ORD-1001',
  c_customer.id, c_supplier.id, d.id,
  40, 'B-AB 1234', 'flour', 'regular',
  '2025-08-28 10:15:00', 18000,
  '2025-08-28 11:05:00', 12000,
  6000,                               -- net = first - second
  'BAL-7788',
  'Musterstraße 12, Berlin', 150.00,
  '2025-08-28', 'kg', 0.45, 6000, 2700.00, 0.55, 'transfer', 'Gatekeeper Jane',
  'pending'
FROM companies c_customer, companies c_supplier, drivers d
WHERE c_customer.name = 'Acme Logistics'
  AND c_supplier.name = 'HGM'
  AND d.name = 'John Doe'
ON DUPLICATE KEY UPDATE
  customer_id = VALUES(customer_id),
  supplier_id = VALUES(supplier_id),
  driver_id   = VALUES(driver_id),
  num_bags    = VALUES(num_bags),
  plate_num   = VALUES(plate_num),
  product     = VALUES(product),
  first_weight_time = VALUES(first_weight_time),
  first_weight_kg   = VALUES(first_weight_kg),
  second_weight_time = VALUES(second_weight_time),
  second_weight_kg   = VALUES(second_weight_kg),
  net_weight_kg = VALUES(net_weight_kg),
  balance_id = VALUES(balance_id),
  customer_address = VALUES(customer_address),
  fees = VALUES(fees),
  bill_date = VALUES(bill_date),
  unit = VALUES(unit),
  price = VALUES(price),
  quantity = VALUES(quantity),
  total_price = VALUES(total_price),
  suggested_selling_price = VALUES(suggested_selling_price),
  payment_method = VALUES(payment_method),
  signature = VALUES(signature),
  status = VALUES(status);
