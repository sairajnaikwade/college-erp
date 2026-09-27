-- ============================================================================
-- Phase 4.2 Notices Schema: Notices & Campus Bulletins
-- ============================================================================

CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('ACADEMIC', 'ADMINISTRATIVE', 'EXAMINATION', 'EVENT', 'GENERAL', 'URGENT')),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    target_role VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (target_role IN ('ALL', 'STUDENT', 'STAFF', 'ADMIN')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimized querying and role filtering
CREATE INDEX IF NOT EXISTS idx_notices_published_at ON notices(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_target_role ON notices(target_role);
CREATE INDEX IF NOT EXISTS idx_notices_department_id ON notices(department_id);
CREATE INDEX IF NOT EXISTS idx_notices_is_published ON notices(is_published);
CREATE INDEX IF NOT EXISTS idx_notices_expires_at ON notices(expires_at);
CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category);
CREATE INDEX IF NOT EXISTS idx_notices_priority ON notices(priority);
