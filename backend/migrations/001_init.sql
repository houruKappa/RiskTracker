CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM-типы
DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_status AS ENUM ('IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE countermeasure_target AS ENUM ('CAUSE', 'CONSEQUENCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_object_type AS ENUM ('IT_SYSTEM', 'PROJECT', 'PROCESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Пользователи
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Объекты риска
CREATE TABLE IF NOT EXISTS risk_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    object_type risk_object_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Риски
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status risk_status NOT NULL DEFAULT 'IN_PROGRESS',
    title VARCHAR(255) NOT NULL,
    target_id UUID NOT NULL REFERENCES risk_objects(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    probability risk_level NOT NULL,
    impact risk_level NOT NULL,
    financial_loss TEXT,
    reputational_loss risk_level,
    legal_consequences INT CHECK (legal_consequences BETWEEN 1 AND 5),
    comment TEXT,
    max_cause_probability risk_level,
    max_consequence_probability risk_level,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Причины риска
CREATE TABLE IF NOT EXISTS risk_causes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    probability risk_level NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Последствия риска
CREATE TABLE IF NOT EXISTS risk_consequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    probability risk_level NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Контрмеры
CREATE TABLE IF NOT EXISTS countermeasures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    target_type countermeasure_target NOT NULL,
    cause_id UUID REFERENCES risk_causes(id) ON DELETE CASCADE,
    consequence_id UUID REFERENCES risk_consequences(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_deadline CHECK (deadline > created_at),
    CONSTRAINT check_target_integrity CHECK (
        (target_type = 'CAUSE' AND cause_id IS NOT NULL AND consequence_id IS NULL) OR
        (target_type = 'CONSEQUENCE' AND consequence_id IS NOT NULL AND cause_id IS NULL)
    )
);

-- 7. Журнал изменений
CREATE TABLE IF NOT EXISTS entity_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    old_state JSONB,
    new_state JSONB
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_risks_search ON risks(target_id, status);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_countermeasures_assignee ON countermeasures(assignee_id, deadline);
CREATE INDEX IF NOT EXISTS idx_audit_history ON entity_audit_logs(entity_type, entity_id, timestamp DESC);
