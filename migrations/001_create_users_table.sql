-- Створення таблиці користувачів
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Індекс для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

