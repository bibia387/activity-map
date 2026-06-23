'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, ACTIVITY_CONFIG } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import dynamic from 'next/dynamic'
import StartActivityModal from './StartActivityModal'
import ActivityPanel from './ActivityPanel'
import NavBar from './NavBar'

const MapView = dynamic(() => import('./MapView'), { ssr: false })

export default function MapPage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [locationError, setLocationError] = useState('')
  const [showStartModal, setShowStartModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [myActivity, setMyActivity] = useState<Activity | null>(null)
  const [zoomTarget, setZoomTarget] = useState<{ lat: number; lng: number } | null>(null)

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('このブラウザは位置情報に対応していません')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setLocationError('')
      },
      () => setLocationError('位置情報の取得に失敗しました')
    )
  }, [])

  useEffect(() => { getLocation() }, [getLocation])

  const fetchActivities = useCallback(async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('activities')
      .select('*, profiles(display_name, avatar_url)')
      .eq('is_active', true)
      .gt('ends_at', now)
      .order('created_at', { ascending: false })

    if (data) {
      setActivities(data as Activity[])
      const mine = data.find(a => a.user_id === user?.id) ?? null
      setMyActivity(mine as Activity | null)
    }
  }, [user?.id])

  useEffect(() => {
    fetchActivities()
    const channel = supabase
      .channel('activities-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
        fetchActivities()
      })
      .subscribe()
    const interval = setInterval(fetchActivities, 5 * 60 * 1000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchActivities])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <MapView
          activities={activities}
          userLat={userLat}
          userLng={userLng}
          currentUserId={user?.id ?? null}
          onActivityClick={(a) => setSelectedActivity(a)}
          zoomToLat={zoomTarget?.lat ?? null}
          zoomToLng={zoomTarget?.lng ?? null}
        />
      </div>

      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>

        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, pointerEvents: 'auto' }}>
          <NavBar onMyLocation={getLocation} />
        </div>

        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'auto', background: 'rgba(17,24,39,0.9)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9999,
          padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{activities.length}件の活動中</span>
        </div>

        {locationError && (
          <div style={{
            position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'auto', background: 'rgba(127,29,29,0.9)',
            border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13,
            padding: '8px 16px', borderRadius: 12, whiteSpace: 'nowrap',
          }}>
            {locationError}
          </div>
        )}

        {myActivity && (
          <div
            style={{
              position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'auto',
              background: `${ACTIVITY_CONFIG[myActivity.category]?.color}20`,
              border: `1px solid ${ACTIVITY_CONFIG[myActivity.category]?.color}60`,
              borderRadius: 9999, padding: '8px 16px', display: 'flex', alignItems: 'center',
              gap: 8, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            onClick={() => setSelectedActivity(myActivity)}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACTIVITY_CONFIG[myActivity.category]?.color, display: 'inline-block' }} />
            <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
              {ACTIVITY_CONFIG[myActivity.category]?.emoji} {ACTIVITY_CONFIG[myActivity.category]?.label}中
            </span>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
          <button
            onClick={() => {
              if (!userLat || !userLng) {
                getLocation()
                return
              }
              setShowStartModal(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px',
              borderRadius: 16, fontWeight: 700, color: 'white',
              background: 'linear-gradient(to right, #2563eb, #3b82f6)', border: 'none',
              cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            ＋ {myActivity ? '活動を変更する' : '活動を開始する'}
          </button>
        </div>

      </div>

      {showStartModal && userLat && userLng && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
          <StartActivityModal
            onClose={() => setShowStartModal(false)}
            onStarted={() => {
              setShowStartModal(false)
              fetchActivities()
              setZoomTarget({ lat: userLat, lng: userLng })
            }}
            currentLat={userLat}
            currentLng={userLng}
          />
        </div>
      )}

      {selectedActivity && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
          <ActivityPanel
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            userLat={userLat}
            userLng={userLng}
          />
        </div>
      )}
    </div>
  )
}