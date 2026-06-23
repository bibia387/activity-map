'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'

interface NavBarProps {
  onMyLocation: () => void
}

export default function NavBar({ onMyLocation }: NavBarProps) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2 bg-[#111827]/90 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 shadow-lg">
        <span className="text-lg">📍</span>
        <span className="text-white font-bold text-sm">ActMap</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* My location */}
        <button
          onClick={onMyLocation}
          className="w-10 h-10 bg-[#111827]/90 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#1F2937]/90 transition-colors shadow-lg"
          title="現在地に移動"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Profile menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20"
          >
            {(profile?.display_name ?? 'U')[0].toUpperCase()}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-48">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-white text-sm font-medium truncate">{profile?.display_name}</p>
                <p className="text-slate-500 text-xs">ログイン中</p>
              </div>
              <button
                onClick={() => { signOut(); setMenuOpen(false) }}
                className="w-full text-left px-4 py-3 text-slate-300 text-sm hover:bg-white/5 hover:text-red-400 transition-colors"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
