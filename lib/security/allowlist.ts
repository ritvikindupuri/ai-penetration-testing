'use server'

import { createClient } from '@/lib/supabase/server'
import type { AllowlistPolicy, AllowlistValidationResult, Target, ScanType } from '@/lib/types'

/**
 * Validates if a target is allowed to be scanned based on allowlist policies
 */
export async function validateTargetAgainstAllowlist(
  target: Target,
  scanType: ScanType,
  organizationId: string
): Promise<AllowlistValidationResult> {
  const supabase = await createClient()

  // Get active allowlist policies for the organization
  const { data: policies, error } = await supabase
    .from('allowlist_policies')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)

  if (error || !policies || policies.length === 0) {
    return {
      allowed: false,
      reason: 'No active allowlist policy found. Please create an allowlist policy first.',
    }
  }

  // Check each policy
  for (const policy of policies as AllowlistPolicy[]) {
    const result = checkPolicyMatch(target, scanType, policy)
    if (result.allowed) {
      return result
    }
  }

  return {
    allowed: false,
    reason: 'Target does not match any allowlist policy.',
  }
}

/**
 * Checks if a target matches a specific allowlist policy
 */
function checkPolicyMatch(
  target: Target,
  scanType: ScanType,
  policy: AllowlistPolicy
): AllowlistValidationResult {
  // Check if scan type is allowed
  if (!policy.allowed_scan_types.includes(scanType)) {
    return {
      allowed: false,
      reason: `Scan type "${scanType}" is not allowed by policy "${policy.name}".`,
      matchedPolicy: policy,
    }
  }

  // Check time restrictions
  if (!isWithinAllowedTime(policy)) {
    return {
      allowed: false,
      reason: `Current time is outside allowed scanning hours for policy "${policy.name}".`,
      matchedPolicy: policy,
    }
  }

  // Check if target verification is required but not verified
  if (policy.require_target_verification && target.verification_status !== 'verified') {
    return {
      allowed: false,
      reason: `Target verification is required by policy "${policy.name}" but target is not verified.`,
      matchedPolicy: policy,
    }
  }

  // Check if target matches allowed patterns
  const targetValue = target.value.toLowerCase()
  const isAllowed = policy.allowed_targets.some((pattern) => matchTargetPattern(targetValue, pattern))

  if (!isAllowed && policy.allowed_targets.length > 0) {
    return {
      allowed: false,
      reason: `Target "${target.value}" does not match any allowed target patterns in policy "${policy.name}".`,
      matchedPolicy: policy,
    }
  }

  // Check if target is excluded
  const isExcluded = policy.excluded_targets.some((pattern) => matchTargetPattern(targetValue, pattern))

  if (isExcluded) {
    return {
      allowed: false,
      reason: `Target "${target.value}" is explicitly excluded by policy "${policy.name}".`,
      matchedPolicy: policy,
    }
  }

  return {
    allowed: true,
    matchedPolicy: policy,
  }
}

/**
 * Checks if the current time is within the allowed scanning window
 */
function isWithinAllowedTime(policy: AllowlistPolicy): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay()

  // Check if current day is allowed
  if (!policy.allowed_days.includes(dayOfWeek)) {
    return false
  }

  // Convert current time to policy timezone for comparison
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: policy.timezone,
  })

  const currentTime = timeString.substring(0, 8)
  const startTime = policy.allowed_hours_start
  const endTime = policy.allowed_hours_end

  return currentTime >= startTime && currentTime <= endTime
}

/**
 * Matches a target value against a pattern (supports wildcards and CIDR)
 */
function matchTargetPattern(targetValue: string, pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase().trim()

  // Exact match
  if (targetValue === normalizedPattern) {
    return true
  }

  // Wildcard match (e.g., *.example.com)
  if (normalizedPattern.includes('*')) {
    const regexPattern = normalizedPattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(targetValue)
  }

  // Subdomain match (e.g., pattern "example.com" matches "sub.example.com")
  if (targetValue.endsWith(`.${normalizedPattern}`)) {
    return true
  }

  // CIDR match for IP ranges
  if (normalizedPattern.includes('/')) {
    return matchCIDR(targetValue, normalizedPattern)
  }

  return false
}

/**
 * Checks if an IP address falls within a CIDR range
 */
function matchCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/')
  if (!bits) return false

  const ipParts = ip.split('.').map(Number)
  const rangeParts = range.split('.').map(Number)
  const mask = parseInt(bits)

  if (ipParts.length !== 4 || rangeParts.length !== 4) return false

  const ipNum =
    (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
  const rangeNum =
    (rangeParts[0] << 24) |
    (rangeParts[1] << 16) |
    (rangeParts[2] << 8) |
    rangeParts[3]
  const maskNum = ~((1 << (32 - mask)) - 1)

  return (ipNum & maskNum) === (rangeNum & maskNum)
}

/**
 * Checks if exploitation requires approval based on policy
 */
export async function requiresExploitApproval(
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: policies } = await supabase
    .from('allowlist_policies')
    .select('require_approval_for_exploit')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(1)
    .single()

  return policies?.require_approval_for_exploit ?? true
}

/**
 * Gets the rate limit for scanning from the policy
 */
export async function getScanRateLimit(
  organizationId: string
): Promise<number> {
  const supabase = await createClient()

  const { data: policies } = await supabase
    .from('allowlist_policies')
    .select('rate_limit_requests_per_second')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(1)
    .single()

  return policies?.rate_limit_requests_per_second ?? 10
}

/**
 * Logs an audit event
 */
export async function logAuditEvent(params: {
  action: string
  actionCategory: 'auth' | 'scan' | 'finding' | 'report' | 'config' | 'target' | 'policy'
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Get user profile for organization_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  await supabase.from('audit_logs').insert({
    organization_id: profile?.organization_id,
    user_id: user.id,
    user_email: user.email,
    user_role: profile?.role,
    action: params.action,
    action_category: params.actionCategory,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    details: params.details || {},
  })
}
