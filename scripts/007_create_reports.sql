-- Generated security reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  
  -- Report metadata
  title TEXT NOT NULL,
  report_type TEXT DEFAULT 'full' CHECK (report_type IN ('executive', 'technical', 'compliance', 'full')),
  format TEXT DEFAULT 'json' CHECK (format IN ('json', 'pdf', 'html', 'markdown')),
  
  -- Content
  executive_summary TEXT,
  content JSONB DEFAULT '{}', -- full report content
  
  -- Stats at time of generation
  findings_included INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  high_findings INTEGER DEFAULT 0,
  medium_findings INTEGER DEFAULT 0,
  low_findings INTEGER DEFAULT 0,
  
  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Storage
  file_url TEXT, -- for PDF exports
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "reports_select_org" ON public.reports
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "reports_insert_org" ON public.reports
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "reports_delete_org" ON public.reports
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_org ON public.reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_scan ON public.reports(scan_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated ON public.reports(generated_at DESC);
