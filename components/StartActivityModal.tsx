'use client'

import { useState } from 'react'
import { ActivityCategory, ACTIVITY_CONFIG } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

interface StartActivityModalProps {
  onClose: () => void
  onStarted: () => void
  currentLat: number
  currentLng: number
}

export default function StartActivityModal({
  onClose,
  onStarted,
  currentLat,
  currentLng,
}: StartActivityModalProps) {
  const { user } = useAuth()
  const [selected, setSelected] = useState<ActivityCategory | null>(null)
  const [description, setDescription] = useState('')
  const [count, setCount] = useState(1)
  const [welcomesParticipants, setWelcomesParticipants] = useState(true)
  const [beginnerFriendly, setBeginnerFriendly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async () => {
    if (!selected || !user) return
    setLoading(true)
    setError('')

    await supabase
      .from('activities')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

    const { error: err } = await supabase
      .from('activities')
      .insert({
        user_id: user.id,
        category: selected,
        description: description.trim(),
        lat: currentLat,
        lng: currentLng,
        started_at: new Date().toISOString(),
        ends_at: endsAt,
        is_active: true,
        max_participants: 10,
        current_count: count,
        welcomes_participants: welcomesParticipants,
        beginner_friendly: beginnerFriendly,
      })

    if (err) {
      console.error('Activity insert error:', err)
      setError('開始できませんでした: ' + err.message)
    } else {
      onStarted()
    }
    setLoading(false)
  }

  const categories = Object.entries(ACTIVITY_CONFIG) as [ActivityCategory, typeof ACTIVITY_CONFIG[ActivityCategory]][]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
        width: '100%', maxWidth: 400, padding: 24, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>活動を開始する</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* カテゴリ選択 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
          {categories.map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 4px', borderRadius: 16,
                border: selected === key ? `2px solid ${config.color}` : '1px solid rgba(255,255,255,0.1)',
                background: selected === key ? `${config.color}30` : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 22 }}>{config.emoji}</span>
              <span style={{ color: '#cbd5e1', fontSize: 10 }}>{config.label}</span>
            </button>
          ))}
        </div>

        {/* 人数 */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>今いる人数</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer' }}
            >−</button>
            <span style={{ color: 'white', fontSize: 20, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{count}</span>
            <button
              onClick={() => setCount(count + 1)}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer' }}
            >＋</button>
            <span style={{ color: '#64748b', fontSize: 13 }}>人</span>
          </div>
        </div>

        {/* バッジ */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setWelcomesParticipants(!welcomesParticipants)}
            style={{
              flex: 1, padding: '10px', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: welcomesParticipants ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.1)',
              background: welcomesParticipants ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
              color: welcomesParticipants ? '#34d399' : '#64748b',
            }}
          >
            🙌 参加歓迎
          </button>
          <button
            onClick={() => setBeginnerFriendly(!beginnerFriendly)}
            style={{
              flex: 1, padding: '10px', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: beginnerFriendly ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
              background: beginnerFriendly ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
              color: beginnerFriendly ? '#60a5fa' : '#64748b',
            }}
          >
            🔰 初心者歓迎
          </button>
        </div>

        {/* コメント */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="コメント（任意）例：3on3やってます！"
          maxLength={60}
          rows={2}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '10px 14px', color: 'white', fontSize: 14, resize: 'none',
            outline: 'none', marginBottom: 16, boxSizing: 'border-box',
          }}
        />

        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

        <button
          onClick={handleStart}
          disabled={!selected || loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 16, border: 'none', fontWeight: 700, color: 'white',
            background: selected ? 'linear-gradient(to right, #2563eb, #3b82f6)' : '#374151',
            cursor: selected ? 'pointer' : 'not-allowed', fontSize: 15,
          }}
        >
          {loading ? '開始中...' : selected ? `${ACTIVITY_CONFIG[selected].emoji} 開始する` : 'カテゴリを選択'}
        </button>

        <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 12 }}>⏱ 最大2時間で自動終了します</p>
      </div>
    </div>
  )
}