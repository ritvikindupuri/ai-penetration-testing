'use server'

import { createClient } from '@/lib/supabase/server'
import type { Target, TargetValidationResult, TargetType } from '@/lib/types'
import crypto from 'crypto'

/**
 * Validates a target before adding it to the system
 */
export async function validateTarget(
  value: string,
  targetType: TargetType
): Promise<TargetValidationResult> {
  // Basic format validation
  switch (targetType) {
    case 'domain':
      if (!isValidDomain(value)) {
        return { valid: false, verified: false, reason: 'Invalid domain format' }
      }
      break
    case 'ip':
      if (!isValidIP(value)) {
        return { valid: false, verified: false, reason: 'Invalid IP address format' }
      }
      break
    case 'ip_range':
      if (!isValidCIDR(value)) {
        return { valid: false, verified: false, reason: 'Invalid IP range (CIDR) format' }
      }
      break
    case 'url':
      if (!isValidURL(value)) {
        return { valid: false, verified: false, reason: 'Invalid URL format' }
      }
      break
    case 'api':
      if (!isValidURL(value)) {
        return { valid: false, verified: false, reason: 'Invalid API endpoint format' }
      }
      break
  }

  // Check for dangerous/prohibited targets
  const prohibitedCheck = checkProhibitedTargets(value)
  if (!prohibitedCheck.valid) {
    return prohibitedCheck
  }

  return { valid: true, verified: false }
}

/**
 * Generates a verification token for a target
 */
export async function generateVerificationToken(targetId: string): Promise<string> {
  const supabase = await createClient()
  
  const token = `secureai-verify-${crypto.randomBytes(16).toString('hex')}`
  
  await supabase
    .from('targets')
    .update({ verification_token: token })
    .eq('id', targetId)
  
  return token
}

/**
 * Verifies a target using DNS TXT record
 */
export async function verifyTargetDNS(target: Target): Promise<boolean> {
  if (!target.verification_token) {
    return false
  }

  try {
    // In a real implementation, this would query DNS TXT records
    // For now, we simulate verification
    const response = await fetch(
      `https://dns.google/resolve?name=_secureai-verify.${target.value}&type=TXT`
    )
    const data = await response.json()
    
    if (data.Answer) {
      for (const answer of data.Answer) {
        if (answer.data?.includes(target.verification_token)) {
          return true
        }
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Verifies a target by checking for a verification file
 */
export async function verifyTargetFile(target: Target): Promise<boolean> {
  if (!target.verification_token) {
    return false
  }

  try {
    const url = target.target_type === 'url' 
      ? `${target.value}/.well-known/secureai-verify.txt`
      : `https://${target.value}/.well-known/secureai-verify.txt`
    
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'User-Agent': 'SecureAI-Verification/1.0' }
    })
    
    if (response.ok) {
      const content = await response.text()
      return content.trim() === target.verification_token
    }
    return false
  } catch {
    return false
  }
}

/**
 * Marks a target as verified
 */
export async function markTargetVerified(
  targetId: string,
  method: 'dns_txt' | 'file' | 'meta_tag' | 'manual'
): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  await supabase
    .from('targets')
    .update({
      verification_status: 'verified',
      verification_method: method,
      verified_at: new Date().toISOString(),
      verified_by: user?.id,
    })
    .eq('id', targetId)
}

// Validation helpers

function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  return domainRegex.test(domain)
}

function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

function isValidCIDR(cidr: string): boolean {
  const [ip, bits] = cidr.split('/')
  if (!ip || !bits) return false
  if (!isValidIP(ip)) return false
  const bitsNum = parseInt(bits)
  return bitsNum >= 0 && bitsNum <= 32
}

function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function checkProhibitedTargets(value: string): TargetValidationResult {
  const lowercaseValue = value.toLowerCase()
  
  // List of prohibited targets (critical infrastructure, government, etc.)
  const prohibitedPatterns = [
    // Government domains
    /\.gov$/,
    /\.mil$/,
    /\.gov\.[a-z]{2}$/,
    // Critical infrastructure
    /localhost/,
    /127\.0\.0\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    // Common platforms (should be authorized separately)
    /google\.com$/,
    /facebook\.com$/,
    /amazon\.com$/,
    /microsoft\.com$/,
    /apple\.com$/,
  ]
  
  for (const pattern of prohibitedPatterns) {
    if (pattern.test(lowercaseValue)) {
      return {
        valid: false,
        verified: false,
        reason: 'This target is prohibited. Please ensure you have explicit authorization to test this target.',
      }
    }
  }
  
  return { valid: true, verified: false }
}
