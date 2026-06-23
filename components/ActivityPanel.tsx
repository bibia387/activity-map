'use client'

import { useEffect, useState } from 'react'
import { Activity, ACTIVITY_CONFIG } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

interface ActivityPanelProps {
  activity: Activity
  onClose: () => void
  userLat: number | null
  userLng: number | null
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function ActivityPanel({ activity, onClose, userLat, userLng }: ActivityPanelProps) {
  const { user } = useAuth()
  const config = ACTIVITY_CONFIG[activity.category]
  const isOwner = user?.id === activity.user_id
  const [count, setCount] = useState(activity.current_count)

  const [remaining, setRemaining] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(activity.ends_at).getTime() - Date.now()
      if (diff <= 0) { setRemaining('終了'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(h > 0 ? `${h}時間${m}分` : `${m}分`)

      const updatedDiff = Date.now() - new Date(activity.started_at).getTime()
      const um = Math.floor(updatedDiff / 60000)
      setLastUpdated(um < 1 ? 'たった今' : um < 60 ? `${um}分前` : `${Math.floor(um / 60)}時間前`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [activity.ends_at, activity.started_at])

  const distance = userLat && userLng
    ? getDistanceKm(userLat, userLng, activity.lat, activity.lng)
    : null

  const handleUpdateCount = async (delta: number) => {
    const newCount = Math.max(1, count + delta)
    setCount(newCount)
    await supabase
      .from('activities')
      .update({ current_count: newCount, started_at: new Date().toISOString() })
      .eq('id', activity.id)
  }

  const handleStopActivity = async () => {
    await supabase
      .from('activities')
      .update({ is_active: false })
      .eq('id', activity.id)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100 }}>
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px 24px 0 0', maxWidth: 400, margin: '0 auto', padding: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 26, flexShrink: 0,
            background: `${config.color}20`, border: `1px solid ${config.color}40`,
          }}>
            {config.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>{config.label}</span>
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{activity.profiles?.display_name ?? 'ユーザー'}</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8',
            cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* 人数 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '14px 18px', marginBottom: 12,
        }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>👥 今いる人数</span>
          {isOwner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => handleUpdateCount(-1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer' }}>−</button>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18, minWidth: 20, textAlign: 'center' }}>{count}</span>
              <button onClick={() => handleUpdateCount(1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer' }}>＋</button>
            </div>
          ) : (
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>{count}人</span>
          )}
        </div>

        {/* バッジ */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {activity.welcomes_participants && (
            <span style={{
              padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
              background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)',
            }}>🙌 参加歓迎</span>
          )}
          {activity.beginner_friendly && (
            <span style={{
              padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
              background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)',
            }}>🔰 初心者歓迎</span>
          )}
          <span style={{
            padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
            background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
          }}>⏱ {remaining}で終了</span>
        </div>

        {/* コメント */}
        {activity.description && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '12px 16px', marginBottom: 12,
          }}>
            <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0 }}>{activity.description}</p>
          </div>
        )}

        {/* 距離・更新時刻 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12, marginBottom: isOwner ? 16 : 4 }}>
          <span>{distance !== null ? `📍 ${distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} 先` : ''}</span>
          <span>🕐 最終更新: {lastUpdated}</span>
        </div>

        {isOwner && (
          <button
            onClick={handleStopActivity}
            style={{
              width: '100%', padding: '10px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            🛑 活動を終了する
          </button>
        )}
      </div>
    </div>
  )
}