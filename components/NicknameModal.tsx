'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface NicknameModalProps {
  userId: string
  onComplete: () => void
}

export default function NicknameModal({ userId, onComplete }: NicknameModalProps) {
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください')
      return
    }
    if (nickname.trim().length > 20) {
      setError('ニックネームは20文字以内にしてください')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ nickname: nickname.trim() })
      .eq('id', userId)

    if (updateError) {
      setError('保存に失敗しました。もう一度試してください')
      setSaving(false)
      return
    }

    setSaving(false)
    onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
      zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: 32, width: 320, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#111' }}>
          ニックネームを設定
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#666' }}>
          ActMapで表示される名前を入力してください
        </p>
        <input
          type="text"
          placeholder="例：ビサール"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setError('')
          }}
          maxLength={20}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
            fontSize: 16, marginBottom: 8, boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {error && (
          <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 8px' }}>{error}</p>
        )}
        <p style={{ color: '#999', fontSize: 12, margin: '0 0 20px' }}>
          {nickname.length}/20文字
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: saving ? '#9ca3af' : 'linear-gradient(to right, #4f46e5, #7c3aed)',
            color: 'white', fontWeight: 700, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '保存中...' : 'はじめる →'}
        </button>
      </div>
    </div>
  )
}