'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateSettings } from '@/app/actions/settings'

interface SiteInfoTabProps {
  settings: any
}

export function SiteInfoTab({ settings }: SiteInfoTabProps) {
  const [siteTitle, setSiteTitle] = useState(settings?.siteTitle || '')
  const [siteTagline, setSiteTagline] = useState(settings?.siteTagline || '')
  const [siteDescription, setSiteDescription] = useState(settings?.siteDescription || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const result = await updateSettings({
      siteTitle,
      siteTagline,
      siteDescription,
    })

    setSaving(false)
    if (result.success) {
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Failed to save settings')
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="siteTitle" className="text-sm font-normal">title</Label>
          <Input
            id="siteTitle"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            placeholder="POESY 小詩"
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="siteTagline" className="text-sm font-normal">tagline</Label>
          <Input
            id="siteTagline"
            value={siteTagline}
            onChange={(e) => setSiteTagline(e.target.value)}
            placeholder="Artist"
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="siteDescription" className="text-sm font-normal">description</Label>
          <Textarea
            id="siteDescription"
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            placeholder="Describe your website..."
            rows={3}
            className="resize-none"
          />
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
