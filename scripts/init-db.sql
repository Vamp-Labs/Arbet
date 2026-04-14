-- Arbet Database Initialization Script
-- PostgreSQL schema for production deployment

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vaults table
CREATE TABLE IF NOT EXISTS vaults (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vault_address VARCHAR(255) UNIQUE NOT NULL,
    authority VARCHAR(255) NOT NULL,
    balance BIGINT DEFAULT 0,
    initial_balance BIGINT DEFAULT 0,
    cumulative_pnl BIGINT DEFAULT 0,
    max_balance BIGINT DEFAULT 0,
    min_balance BIGINT DEFAULT 0,
    position_limit_bps SMALLINT DEFAULT 500,
    max_drawdown_bps SMALLINT DEFAULT 1000,
    is_paused BOOLEAN DEFAULT FALSE,
    num_trades BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    vault_id INT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    trade_id BIGINT NOT NULL,
    buy_market_id VARCHAR(255) NOT NULL,
    sell_market_id VARCHAR(255) NOT NULL,
    buy_amount BIGINT NOT NULL,
    sell_amount BIGINT NOT NULL,
    actual_edge_bps SMALLINT DEFAULT 0,
    pnl_lamports BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    execution_slot BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    vault_id INT REFERENCES vaults(id) ON DELETE CASCADE,
    opportunity_id VARCHAR(255) UNIQUE NOT NULL,
    buy_market_id VARCHAR(255) NOT NULL,
    sell_market_id VARCHAR(255) NOT NULL,
    buy_price DECIMAL(10, 8) NOT NULL,
    sell_price DECIMAL(10, 8) NOT NULL,
    spread_bps SMALLINT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent logs table
CREATE TABLE IF NOT EXISTS agent_logs (
    id SERIAL PRIMARY KEY,
    vault_id INT REFERENCES vaults(id) ON DELETE CASCADE,
    agent_name VARCHAR(100),
    action VARCHAR(255),
    details JSONB,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk checks table
CREATE TABLE IF NOT EXISTS risk_checks (
    id SERIAL PRIMARY KEY,
    vault_id INT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    check_type VARCHAR(100),
    passed BOOLEAN DEFAULT TRUE,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trade embeddings table (for RAG)
CREATE TABLE IF NOT EXISTS trade_embeddings (
    id SERIAL PRIMARY KEY,
    trade_id INT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    reasoning_text TEXT NOT NULL,
    embedding BYTEA NOT NULL,
    embedding_model VARCHAR(100) DEFAULT 'nomic-embed-text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_vaults_address ON vaults(vault_address);
CREATE INDEX IF NOT EXISTS idx_trades_vault_id ON trades(vault_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_vault_id ON opportunities(vault_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_spread ON opportunities(spread_bps);
CREATE INDEX IF NOT EXISTS idx_agent_logs_vault_id ON agent_logs(vault_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_risk_checks_vault_id ON risk_checks(vault_id);
CREATE INDEX IF NOT EXISTS idx_trade_embeddings_trade_id ON trade_embeddings(trade_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_vaults_timestamp
BEFORE UPDATE ON vaults
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_trades_timestamp
BEFORE UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arbet;
