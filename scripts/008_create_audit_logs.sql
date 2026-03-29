-- Immutable audit logs - CRITICAL FOR COMPLIANCE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Action details
  action TEXT NOT NULL, -- e.g., 'scan.started', 'target.created', 'finding.verified'
  resource_type TEXT NOT NULL, -- e.g., 'scan', 'target', 'finding', 'policy'
  resource_id UUID,
  
  -- Context
  details JSONB DEFAULT '{}', -- additional context
  ip_address INET,
  user_agent TEXT,
  
  -- Agent context (for agent actions)
  agent_name TEXT,
  agent_action TEXT,
  
  -- Immutable timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Audit logs are APPEND-ONLY
-- Only SELECT is allowed, no UPDATE or DELETE
CREATE POLICY "audit_select_org" ON public.audit_logs
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "audit_insert_org" ON public.audit_logs
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    OR org_id IS NULL -- allow system-level logs
  );

-- NO UPDATE OR DELETE POLICIES - logs are immutable

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
