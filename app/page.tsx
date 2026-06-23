'use client'

import { useAuth } from '@/components/AuthProvider'
import LoginScreen from '@/components/LoginScreen'
import MapPage from '@/components/MapPage'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center animate-pulse">
            <span className="text-2xl">📍</span>
          </div>
          <p className="text-slate-500 text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  return user ? <MapPage /> : <LoginScreen />
}
