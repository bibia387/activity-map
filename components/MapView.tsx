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
  const photoMarkersRef = useRef<Map<string, any>>(new Map())
  const [photos, setPhotos] = useState<LocationPhoto[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<LocationPhoto | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadLat, setUploadLat] = useState<number | null>(null)
  const [uploadLng, setUploadLng] = useState<number | null>(null)
  const [locationName, setLocationName] = useState('')

  // 写真を取得
  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    const { data } = await supabase.from('location_photos').select('*')
    if (data) setPhotos(data as LocationPhoto[])
  }

  // 今日すでに投稿したか確認
  const checkTodayUpload = async () => {
    if (!currentUserId) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('location_photos')
      .select('id')
      .eq('user_id', currentUserId)
      .gte('created_at', today.toISOString())
    return data && data.length > 0
  }

  // 写真アップロード
  const handleUpload = async (file: File) => {
    if (!currentUserId || !uploadLat || !uploadLng) return
    setUploading(true)

    const alreadyUploaded = await checkTodayUpload()
    if (alreadyUploaded) {
      alert('1日1枚までです。明日また投稿できます！')
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
      lat: uploadLat,
      lng: uploadLng,
      photo_url: urlData.publicUrl,
      location_name: locationName,
    })

    setUploading(false)
    setShowUploadModal(false)
    setLocationName('')
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

      // CartoDB Light
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
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

  // 写真マーカーを地図に表示
  useEffect(() => {
    if (!mapInstanceRef.current) return
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current

      photoMarkersRef.current.forEach((marker) => map.removeLayer(marker))
      photoMarkersRef.current.clear()

      photos.forEach((photo) => {
        const icon = L.divIcon({
          html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid white;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;"><img src="${photo.photo_url}" style="width:100%;height:100%;object-fit:cover;"/></div>`,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        })

        const marker = L.marker([photo.lat, photo.lng], { icon })
          .addTo(map)
          .on('click', () => setSelectedPhoto(photo))

        photoMarkersRef.current.set(photo.id, marker)
      })
    })
  }, [photos, mapInstanceRef.current])

  return (
    <>
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* 写真投稿ボタン */}
      {currentUserId && userLat && userLng && (
        <button
          onClick={() => {
            setUploadLat(userLat)
            setUploadLng(userLng)
            setShowUploadModal(true)
          }}
          style={{
            position: 'absolute', bottom: 100, right: 16, zIndex: 1000,
            background: 'white', border: 'none', borderRadius: '50%',
            width: 48, height: 48, fontSize: 22, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          📷
        </button>
      )}

      {/* 写真投稿モーダル */}
      {showUploadModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 24, width: 320,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>📷 写真を投稿</h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>1日1枚まで投稿できます</p>
            <input
              type="text"
              placeholder="場所の名前（例：山伏公園）"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid #ddd', marginBottom: 12, fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              style={{ marginBottom: 12, width: '100%' }}
            />
            {uploading && <p style={{ color: '#3b82f6', fontSize: 13 }}>アップロード中...</p>}
            <button
              onClick={() => setShowUploadModal(false)}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                border: '1px solid #ddd', background: 'white', cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 写真表示モーダル */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', maxWidth: 340 }}
            onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.photo_url} style={{ width: '100%', display: 'block' }} />
            {selectedPhoto.location_name && (
              <div style={{ padding: '12px 16px', fontWeight: 600 }}>
                📍 {selectedPhoto.location_name}
              </div>
            )}
            <button
              onClick={() => setSelectedPhoto(null)}
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