-- ============================================================================
-- Phase 4.10 SOC CoPilot Real Enforcement: IP Blocklist & Account Blocklist
-- ============================================================================

-- 1. IP Blocklist Table
CREATE TABLE IF NOT EXISTS ip_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    website_id VARCHAR(50) NOT NULL DEFAULT 'WEB-001',
    reason TEXT NOT NULL,
    source_incident_id VARCHAR(100),
    initiator VARCHAR(100) NOT NULL DEFAULT 'SOC_COPILOT',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Account Blocklist Table
CREATE TABLE IF NOT EXISTS account_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    website_id VARCHAR(50) NOT NULL DEFAULT 'WEB-001',
    reason TEXT NOT NULL,
    source_incident_id VARCHAR(100),
    initiator VARCHAR(100) NOT NULL DEFAULT 'SOC_COPILOT',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast enforcement lookups
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_lookup ON ip_blocklist(ip_address, website_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_expires_at ON ip_blocklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_account_blocklist_user_lookup ON account_blocklist(user_id, website_id, status);
