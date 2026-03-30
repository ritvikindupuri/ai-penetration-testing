// Database types for the pentest platform

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export type TargetType = 'domain' | 'ip' | 'ip_range' | 'url' | 'api'

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired'

export type VerificationMethod = 'dns_txt' | 'file' | 'meta_tag' | 'manual'

export type ScanType = 'recon' | 'passive' | 'active' | 'exploit' | 'full'

export type ScanStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type FindingStatus = 'open' | 'confirmed' | 'false_positive' | 'accepted_risk' | 'remediated' | 'verified'

export type RemediationEffort = 'low' | 'medium' | 'high'

export type ReportType = 'executive' | 'technical' | 'compliance' | 'full'

export type ReportFormat = 'pdf' | 'html' | 'json' | 'markdown'

export type ReportStatus = 'generating' | 'ready' | 'failed'

export type AuditActionCategory = 'auth' | 'scan' | 'finding' | 'report' | 'config' | 'target' | 'policy'

// Agent types
export type AgentType = 
  | 'orchestrator'
  | 'reconnaissance'
  | 'osint'
  | 'vulnerability_scanner'
  | 'verification'
  | 'exploitation'
  | 'payload_generator'
  | 'reporting'

export interface Organization {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string | null
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AllowlistPolicy {
  id: string
  organization_id: string
  name: string
  description: string | null
  allowed_targets: string[]
  excluded_targets: string[]
  allowed_days: number[]
  allowed_hours_start: string
  allowed_hours_end: string
  timezone: string
  allowed_scan_types: ScanType[]
  max_concurrent_scans: number
  rate_limit_requests_per_second: number
  require_target_verification: boolean
  require_approval_for_exploit: boolean
  auto_stop_on_critical: boolean
  is_active: boolean
  valid_from: string
  valid_until: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Target {
  id: string
  organization_id: string
  name: string
  target_type: TargetType
  value: string
  verification_status: VerificationStatus
  verification_method: VerificationMethod | null
  verification_token: string | null
  verified_at: string | null
  verified_by: string | null
  tags: string[]
  metadata: Record<string, unknown>
  notes: string | null
  is_active: boolean
  last_scanned_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Scan {
  id: string
  organization_id: string
  target_id: string
  allowlist_policy_id: string | null
  name: string
  scan_type: ScanType
  status: ScanStatus
  config: Record<string, unknown>
  agents_used: string[]
  progress: number
  current_phase: string | null
  phases_completed: string[]
  started_at: string | null
  completed_at: string | null
  estimated_duration_seconds: number | null
  findings_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  error_message: string | null
  logs: unknown[]
  created_by: string | null
  created_at: string
  updated_at: string
  target?: Target
}

export interface Finding {
  id: string
  organization_id: string
  scan_id: string
  target_id: string
  title: string
  description: string | null
  finding_type: string
  severity: Severity
  cvss_score: number | null
  cvss_vector: string | null
  affected_component: string | null
  affected_url: string | null
  affected_parameter: string | null
  affected_endpoint: string | null
  evidence: Record<string, unknown>
  proof_of_concept: string | null
  request_data: Record<string, unknown> | null
  response_data: Record<string, unknown> | null
  screenshots: string[]
  cwe_id: string | null
  cve_ids: string[]
  owasp_category: string | null
  remediation: string | null
  remediation_effort: RemediationEffort | null
  reference_links: string[]
  status: FindingStatus
  verified_by: string | null
  verified_at: string | null
  discovered_by_agent: string | null
  confidence: number | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  organization_id: string
  scan_id: string | null
  title: string
  report_type: ReportType
  format: ReportFormat
  executive_summary: string | null
  content: Record<string, unknown>
  total_findings: number
  critical_findings: number
  high_findings: number
  medium_findings: number
  low_findings: number
  status: ReportStatus
  file_url: string | null
  file_size_bytes: number | null
  generated_by_agent: string | null
  generation_time_seconds: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  organization_id: string | null
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  action_category: AuditActionCategory
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: AgentType
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface ScanProgress {
  scanId: string
  phase: string
  progress: number
  currentAgent: AgentType
  message: string
  findings: number
}

export interface AllowlistValidationResult {
  allowed: boolean
  reason?: string
  matchedPolicy?: AllowlistPolicy
}

export interface TargetValidationResult {
  valid: boolean
  verified: boolean
  reason?: string
}
