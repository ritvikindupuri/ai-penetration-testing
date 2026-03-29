-- Allowlist policies - CRITICAL SECURITY TABLE
-- Controls which targets can be scanned and how
CREATE TABLE IF NOT EXISTS public.allowlist_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- What can be scanned
  allowed_targets JSONB NOT NULL DEFAULT '[]', -- domains, IPs, CIDR ranges
  allowed_methods TEXT[] DEFAULT ARRAY['recon', 'scan']::TEXT[], -- scan types permitted
  
  -- When testing is allowed
  time_windows JSONB DEFAULT '[]', -- { "days": ["mon", "tue"], "start": "09:00", "end": "17:00" }
  
  -- Rate limiting
  rate_limits JSONB DEFAULT '{"requests_per_minute": 60, "requests_per_hour": 1000}',
  
  -- Safety controls
  requires_approval BOOLEAN DEFAULT false, -- require human approval for high-risk actions
  max_severity TEXT DEFAULT 'high' CHECK (max_severity IN ('info', 'low', 'medium', 'high', 'critical')),
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.allowlist_policies ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/manage policies in their org
CREATE POLICY "allowlist_select_org" ON public.allowlist_policies
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "allowlist_insert_org" ON public.allowlist_policies
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "allowlist_update_org" ON public.allowlist_policies
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "allowlist_delete_org" ON public.allowlist_policies
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_allowlist_org ON public.allowlist_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_allowlist_active ON public.allowlist_policies(is_active) WHERE is_active = true;
