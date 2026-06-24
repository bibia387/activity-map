'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, ACTIVITY_CONFIG } from '@/types'
import { supabase } from '@/lib/supabase'

interface LocationPhoto {
  id: string
  user_id: string
  lat: number
  lng: number
  photo_url: string
  location_name: string
  created_at: string
}

interface SpecialLocation {
  id: string
  name: string
  lat: number
  lng: number
  effect: 'sparkle' | 'aura'
}

const SPECIAL_LOCATIONS: SpecialLocation[] = [
  { id: 'yamabushi', name: '山伏公園', lat: 35.716568, lng: 139.783532, effect: 'sparkle' },
  { id: 'okachimachi', name: '御徒町台東中学校', lat: 35.70694, lng: 139.777461, effect: 'aura' },
]

interface MapViewProps {
  activities: Activity[]
  userLat: number | null
  userLng: number | null
  currentUserId: string | null
  onActivityClick: (activity: Activity) => void
  zoomToLat?: number | null
  zoomToLng?: number | null
}

export default function MapView({ activities, userLat, userLng, currentUserId, onActivityClick, zoomToLat, zoomToLng }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const userMarkerRef = useRef<any>(null)
  const specialMarkersRef = useRef<Map<string, any>>(new Map())
  const [photos, setPhotos] = useState<Record<string, LocationPhoto[]>>({})
  const [selectedLocation, setSelectedLocation] = useState<SpecialLocation | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showUploadForLocation, setShowUploadForLocation] = useState<string | null>(null)

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    const { data } = await supabase.from('location_photos').select('*')
    if (data) {
      const grouped: Record<string, LocationPhoto[]> = {}
      data.forEach((photo: LocationPhoto) => {
        if (!grouped[photo.location_name]) grouped[photo.location_name] = []
        grouped[photo.location_name].push(photo)
      })
      setPhotos(grouped)
    }
  }

  const checkTodayUpload = async (locationName: string) => {
    if (!currentUserId) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('location_photos')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('location_name', locationName)
      .gte('created_at', today.toISOString())
    return data && data.length > 0
  }

  const handleUpload = async (file: File, location: SpecialLocation) => {
    if (!currentUserId) return
    setUploading(true)

    const alreadyUploaded = await checkTodayUpload(location.name)
    if (alreadyUploaded) {
      alert('この場所には今日すでに投稿しています。明日また投稿できます！')
      setUploading(false)
      return
    }

    const ext = file.name.split('.').pop()
    const fileName = `${currentUserId}_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('location-photos')
      .upload(fileName, file)

    if (uploadError) {
      alert('アップロードに失敗しました')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('location-photos').getPublicUrl(fileName)

    await supabase.from('location_photos').insert({
      user_id: currentUserId,
      lat: location.lat,
      lng: location.lng,
      photo_url: urlData.publicUrl,
      location_name: location.name,
    })

    setUploading(false)
    setShowUploadForLocation(null)
    fetchPhotos()
  }

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const defaultLat = userLat ?? 35.6812
      const defaultLng = userLng ?? 139.7671

      const map = L.map(mapRef.current!, {
        center: [defaultLat, defaultLng],
        zoom: 15,
        zoomControl: false,
      })

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; OpenStreetMap &copy; CartoDB',
          maxZoom: 20,
        }
      ).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current.clear()
        userMarkerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !userLat || !userLng) return
    import('leaflet').then((L) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLat, userLng])
      } else {
        const icon = L.divIcon({
          html: `<div style="width:16px;height:16px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        userMarkerRef.current = L.marker([userLat, userLng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup('現在地')
        mapInstanceRef.current.setView([userLat, userLng], 15)
      }
    })
  }, [userLat, userLng])

  useEffect(() => {
    if (!mapInstanceRef.current || !zoomToLat || !zoomToLng) return
    mapInstanceRef.current.setView([zoomToLat, zoomToLng], 17, { animate: true })
  }, [zoomToLat, zoomToLng])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current
      const currentIds = new Set(activities.map(a => a.id))

      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(marker)
          markersRef.current.delete(id)
        }
      })

      activities.forEach((activity) => {
        const config = ACTIVITY_CONFIG[activity.category]
        if (!config || markersRef.current.has(activity.id)) return

        const isMine = activity.user_id === currentUserId
        const ringColor = isMine ? '#FBBF24' : 'white'
        const ringWidth = isMine ? 4 : 2
        const labelHtml = isMine
          ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#FBBF24;color:#111;font-size:10px;font-weight:700;padding:1px 8px;border-radius:8px;white-space:nowrap;">自分</div>`
          : ''

        const icon = L.divIcon({
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              ${labelHtml}
              <div style="position:absolute;width:52px;height:52px;background:${config.color}20;border:2px solid ${config.color}60;border-radius:50%;animation:pulse 2s infinite;"></div>
              <div style="width:40px;height:40px;background:${config.color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px ${config.color}80;border:${ringWidth}px solid ${ringColor};cursor:pointer;z-index:1;">${config.emoji}</div>
            </div>
            <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.3);opacity:0.2}}</style>
          `,
          className: '',
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        })

        const marker = L.marker([activity.lat, activity.lng], { icon })
          .addTo(map)
          .on('click', () => onActivityClick(activity))

        markersRef.current.set(activity.id, marker)
      })
    })
  }, [activities, currentUserId, onActivityClick])

  // 特別な場所のマーカーを表示
  useEffect(() => {
    if (!mapInstanceRef.current) return
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current

      SPECIAL_LOCATIONS.forEach((loc) => {
        if (specialMarkersRef.current.has(loc.id)) return

        const locationPhotos = photos[loc.name] || []
        const latestPhoto = locationPhotos[locationPhotos.length - 1]

        const photoHtml = latestPhoto
          ? `<img src="${latestPhoto.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
          : `<div style="width:100%;height:100%;background:${loc.effect === 'sparkle' ? '#f59e0b' : '#8b5cf6'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;">${loc.effect === 'sparkle' ? '🌟' : '✨'}</div>`

        const sparkleHtml = loc.effect === 'sparkle' ? `
          <div style="position:absolute;inset:-20px;pointer-events:none;">
            <div style="position:absolute;top:0;left:50%;width:4px;height:4px;background:#fbbf24;border-radius:50%;animation:sparkle1 1.5s infinite;"></div>
            <div style="position:absolute;top:20%;right:0;width:3px;height:3px;background:#fcd34d;border-radius:50%;animation:sparkle2 1.8s infinite;"></div>
            <div style="position:absolute;bottom:0;left:30%;width:5px;height:5px;background:#f59e0b;border-radius:50%;animation:sparkle3 1.2s infinite;"></div>
            <div style="position:absolute;top:40%;left:0;width:3px;height:3px;background:#fbbf24;border-radius:50%;animation:sparkle4 2s infinite;"></div>
            <div style="position:absolute;bottom:20%;right:10%;width:4px;height:4px;background:#fcd34d;border-radius:50%;animation:sparkle1 1.6s infinite 0.3s;"></div>
            <div style="position:absolute;top:10%;left:20%;width:6px;height:6px;background:#f59e0b;border-radius:50%;animation:sparkle2 1.4s infinite 0.5s;"></div>
          </div>
        ` : ''

        const auraHtml = loc.effect === 'aura' ? `
          <div style="position:absolute;inset:-15px;border-radius:50%;border:2px solid rgba(139,92,246,0.6);animation:aura1 2s infinite;pointer-events:none;"></div>
          <div style="position:absolute;inset:-28px;border-radius:50%;border:2px solid rgba(139,92,246,0.4);animation:aura2 2s infinite 0.5s;pointer-events:none;"></div>
          <div style="position:absolute;inset:-41px;border-radius:50%;border:2px solid rgba(139,92,246,0.2);animation:aura3 2s infinite 1s;pointer-events:none;"></div>
        ` : ''

        const icon = L.divIcon({
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;width:60px;height:60px;">
              ${sparkleHtml}
              ${auraHtml}
              <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:3px solid ${loc.effect === 'sparkle' ? '#fbbf24' : '#8b5cf6'};box-shadow:0 0 16px ${loc.effect === 'sparkle' ? 'rgba(251,191,36,0.8)' : 'rgba(139,92,246,0.8)'};cursor:pointer;position:relative;z-index:2;">
                ${photoHtml}
              </div>
              <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:${loc.effect === 'sparkle' ? '#fbbf24' : '#8b5cf6'};color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;white-space:nowrap;">${loc.name}</div>
            </div>
            <style>
              @keyframes sparkle1{0%,100%{transform:translate(0,0) scale(1);opacity:1}50%{transform:translate(-8px,-12px) scale(1.5);opacity:0.3}}
              @keyframes sparkle2{0%,100%{transform:translate(0,0) scale(1);opacity:0.8}50%{transform:translate(10px,-8px) scale(2);opacity:0.2}}
              @keyframes sparkle3{0%,100%{transform:translate(0,0) scale(1);opacity:1}50%{transform:translate(-5px,10px) scale(1.8);opacity:0.1}}
              @keyframes sparkle4{0%,100%{transform:translate(0,0) scale(1);opacity:0.9}50%{transform:translate(8px,6px) scale(1.3);opacity:0.4}}
              @keyframes aura1{0%{transform:scale(1);opacity:0.8}100%{transform:scale(1.5);opacity:0}}
              @keyframes aura2{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.5);opacity:0}}
              @keyframes aura3{0%{transform:scale(1);opacity:0.4}100%{transform:scale(1.5);opacity:0}}
            </style>
          `,
          className: '',
          iconSize: [60, 80],
          iconAnchor: [30, 40],
        })

        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(map)
          .on('click', () => setSelectedLocation(loc))

        specialMarkersRef.current.set(loc.id, marker)
      })
    })
  }, [mapInstanceRef.current, photos])

  return (
    <>
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* 特別な場所のパネル */}
      {selectedLocation && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => { setSelectedLocation(null); setShowUploadForLocation(null) }}
        >
          <div style={{
            background: 'white', borderRadius: 20, overflow: 'hidden', width: 340, maxHeight: '80vh',
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              background: selectedLocation.effect === 'sparkle'
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: 'white',
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {selectedLocation.effect === 'sparkle' ? '🌟' : '✨'} {selectedLocation.name}
              </h3>
            </div>

            {/* 写真一覧 */}
            <div style={{ padding: 16, overflowY: 'auto', maxHeight: 300 }}>
              {(photos[selectedLocation.name] || []).length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', fontSize: 14 }}>まだ写真がありません</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(photos[selectedLocation.name] || []).map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.photo_url}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* アップロードボタン */}
            {currentUserId && (
              <div style={{ padding: '0 16px 16px' }}>
                {showUploadForLocation === selectedLocation.id ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(file, selectedLocation)
                      }}
                      style={{ width: '100%', marginBottom: 8 }}
                    />
                    {uploading && <p style={{ color: '#3b82f6', fontSize: 13 }}>アップロード中...</p>}
                    <button
                      onClick={() => setShowUploadForLocation(null)}
                      style={{
                        width: '100%', padding: 10, borderRadius: 8,
                        border: '1px solid #ddd', background: 'white', cursor: 'pointer',
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUploadForLocation(selectedLocation.id)}
                    style={{
                      width: '100%', padding: 12, borderRadius: 10, border: 'none',
                      background: selectedLocation.effect === 'sparkle' ? '#fbbf24' : '#8b5cf6',
                      color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 15,
                    }}
                  >
                    📷 写真を投稿する（1日1枚）
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => { setSelectedLocation(null); setShowUploadForLocation(null) }}
              style={{
                width: '100%', padding: 12, border: 'none',
                background: '#f3f4f6', cursor: 'pointer', fontSize: 14,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}