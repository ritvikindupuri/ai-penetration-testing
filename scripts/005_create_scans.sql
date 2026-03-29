-- Scan sessions
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
  
  -- Scan configuration
  scan_type TEXT NOT NULL CHECK (scan_type IN ('full', 'recon', 'vuln_scan', 'web_app', 'api', 'network', 'custom')),
  scan_config JSONB DEFAULT '{}', -- additional configuration
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results summary
  findings_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  
  -- Agent logs (streaming data)
  agent_logs JSONB DEFAULT '[]',
  
  -- Metadata
  started_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "scans_select_org" ON public.scans
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "scans_insert_org" ON public.scans
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "scans_update_org" ON public.scans
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "scans_delete_org" ON public.scans
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_org ON public.scans(org_id);
CREATE INDEX IF NOT EXISTS idx_scans_target ON public.scans(target_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_started ON public.scans(started_at DESC);
