CREATE TABLE IF NOT EXISTS packets (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  src_ip VARCHAR(100),
  dst_ip VARCHAR(100),
  src_port INT,
  dst_port INT,
  protocol VARCHAR(50),
  length INT,
  label VARCHAR(200)
);
