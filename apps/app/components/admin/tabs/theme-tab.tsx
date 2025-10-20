'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSettings } from '@/app/actions/settings'

interface ThemeTabProps {
  settings: any
}

export function ThemeTab({ settings }: ThemeTabProps) {
  const [primaryColor, setPrimaryColor] = useState(settings?.theme?.primaryColor || '#000000')
  const [accentColor, setAccentColor] = useState(settings?.theme?.accentColor || '#ec4899')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const result = await updateSettings({
      theme: {
        primaryColor,
        accentColor,
      },
    })

    setSaving(false)
    if (result.success) {
      setMessage('Theme saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Failed to save theme')
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="primaryColor" className="text-sm font-normal">primary</Label>
          <div className="flex gap-3 items-center">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-16 h-9 cursor-pointer p-1"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#000000"
              className="flex-1 h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accentColor" className="text-sm font-normal">accent</Label>
          <div className="flex gap-3 items-center">
            <Input
              id="accentColor"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-16 h-9 cursor-pointer p-1"
            />
            <Input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#ec4899"
              className="flex-1 h-9"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm hover:text-neutral-800 dark:hover:text-neutral-200 transition-all disabled:opacity-50"
        >
          {saving ? 'saving...' : 'save'}
        </button>
        {message && (
          <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
