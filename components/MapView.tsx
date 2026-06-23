'use client'

import { useEffect, useRef } from 'react'
import { Activity, ACTIVITY_CONFIG } from '@/types'

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
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
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

  // 活動開始時に自動ズーム
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

  return <div ref={mapRef} className="absolute inset-0 w-full h-full" />
}