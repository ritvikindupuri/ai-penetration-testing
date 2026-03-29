-- Security findings / vulnerabilities
CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Vulnerability details
  vulnerability_type TEXT NOT NULL, -- e.g., 'xss', 'sqli', 'csrf', 'ssrf', 'open_redirect'
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Technical details
  affected_url TEXT,
  affected_parameter TEXT,
  evidence JSONB DEFAULT '{}', -- request/response, screenshots, etc.
  reproduction_steps TEXT[],
  
  -- CVSS scoring
  cvss_score NUMERIC(3, 1) CHECK (cvss_score >= 0 AND cvss_score <= 10),
  cvss_vector TEXT,
  cwe_id TEXT, -- e.g., 'CWE-79'
  cve_id TEXT, -- if known CVE
  
  -- Remediation
  remediation TEXT,
  remediation_effort TEXT CHECK (remediation_effort IN ('trivial', 'low', 'medium', 'high', 'complex')),
  references TEXT[],
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'in_progress', 'resolved', 'false_positive', 'accepted_risk')),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  -- Agent info
  discovered_by_agent TEXT, -- which agent found this
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "findings_select_org" ON public.findings
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "findings_insert_org" ON public.findings
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "findings_update_org" ON public.findings
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "findings_delete_org" ON public.findings
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_findings_scan ON public.findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_target ON public.findings(target_id);
CREATE INDEX IF NOT EXISTS idx_findings_org ON public.findings(org_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON public.findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_status ON public.findings(status);
CREATE INDEX IF NOT EXISTS idx_findings_type ON public.findings(vulnerability_type);
