export type ActivityCategory =
  | 'basketball'
  | 'soccer'
  | 'baseball'
  | 'gym'

export const ACTIVITY_CONFIG: Record<ActivityCategory, { label: string; emoji: string; color: string; bgColor: string }> = {
  basketball: { label: 'バスケ',   emoji: '🏀', color: '#F97316', bgColor: '#FFF7ED' },
  soccer:     { label: 'サッカー', emoji: '⚽', color: '#22C55E', bgColor: '#F0FDF4' },
  baseball:   { label: '野球',     emoji: '⚾', color: '#3B82F6', bgColor: '#EFF6FF' },
  gym:        { label: 'ジム',     emoji: '💪', color: '#A855F7', bgColor: '#FAF5FF' },
}

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Activity {
  id: string
  user_id: string
  category: ActivityCategory
  description: string
  lat: number
  lng: number
  started_at: string
  ends_at: string
  is_active: boolean
  max_participants: number
  current_count: number
  welcomes_participants: boolean
  beginner_friendly: boolean
  created_at: string
  profiles?: Profile
}