-- Scan targets - must match an allowlist policy
CREATE TABLE IF NOT EXISTS public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  allowlist_policy_id UUID REFERENCES public.allowlist_policies(id) ON DELETE SET NULL,
  
  -- Target definition
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('domain', 'ip', 'cidr', 'url', 'api')),
  target_value TEXT NOT NULL, -- domain/IP/URL
  
  -- Ownership verification
  verified BOOLEAN DEFAULT false,
  verification_method TEXT CHECK (verification_method IN ('dns_txt', 'meta_tag', 'file', 'manual')),
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "targets_select_org" ON public.targets
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "targets_insert_org" ON public.targets
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "targets_update_org" ON public.targets
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "targets_delete_org" ON public.targets
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_targets_org ON public.targets(org_id);
CREATE INDEX IF NOT EXISTS idx_targets_policy ON public.targets(allowlist_policy_id);
CREATE INDEX IF NOT EXISTS idx_targets_verified ON public.targets(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_targets_value ON public.targets(target_value);
