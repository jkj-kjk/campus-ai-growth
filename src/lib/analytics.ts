import { supabase } from './supabase'

export type GrowthEventName =
  | 'page_view'
  | 'registration_started'
  | 'registration_completed'
  | 'referral_link_copied'
  | 'whatsapp_share_clicked'
  | 'referral_link_visit'

export type ExperimentVariant = 'A' | 'B' | 'C'

function getSessionId() {
  const key = 'campus_ai_session_id'
  const existing = sessionStorage.getItem(key)
  if (existing) return existing

  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  sessionStorage.setItem(key, id)
  return id
}

export function getExperimentVariant(): ExperimentVariant {
  const key = 'campus_ai_experiment_variant'
  const forced = new URLSearchParams(window.location.search).get('variant')?.toUpperCase()
  if (forced === 'A' || forced === 'B' || forced === 'C') {
    localStorage.setItem(key, forced)
    return forced
  }

  const existing = localStorage.getItem(key)?.toUpperCase()
  if (existing === 'A' || existing === 'B' || existing === 'C') return existing

  const variant = (['A', 'B', 'C'] as ExperimentVariant[])[Math.floor(Math.random() * 3)]
  localStorage.setItem(key, variant)
  return variant
}

export function getAttributionSource() {
  const params = new URLSearchParams(window.location.search)
  const utm = params.get('utm_source')?.toLowerCase()
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
    college: 'College Community',
    community: 'College Community',
    friend: 'Friend',
  }
  return (utm && map[utm]) || null
}

export async function trackEvent(
  eventName: GrowthEventName,
  details: {
    registrationId?: string | null
    referralCode?: string | null
    source?: string | null
    messageVariant?: string | null
    metadata?: Record<string, unknown>
  } = {},
) {
  if (!supabase) return

  const { error } = await supabase.rpc('log_growth_event', {
    p_event_name: eventName,
    p_session_id: getSessionId(),
    p_registration_id: details.registrationId ?? null,
    p_referral_code: details.referralCode ?? null,
    p_source: details.source ?? null,
    p_message_variant: details.messageVariant ?? null,
    p_metadata: details.metadata ?? {},
  })

  if (error) console.warn('Growth event not recorded:', error.message)
}

export function markOnce(key: string) {
  const storageKey = `campus_ai_event:${key}`
  if (sessionStorage.getItem(storageKey)) return false
  sessionStorage.setItem(storageKey, '1')
  return true
}
