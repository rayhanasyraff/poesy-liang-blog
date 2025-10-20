'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSettings } from '@/app/actions/settings'

interface SocialLinksTabProps {
  settings: any
}

export function SocialLinksTab({ settings }: SocialLinksTabProps) {
  const [socialLinks, setSocialLinks] = useState(settings?.socialLinks || [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function addLink() {
    setSocialLinks([...socialLinks, { platform: 'twitter', url: '' }])
  }

  function removeLink(index: number) {
    setSocialLinks(socialLinks.filter((_: any, i: number) => i !== index))
  }

  function updateLink(index: number, field: string, value: string) {
    const updated = [...socialLinks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialLinks(updated)
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const result = await updateSettings({
      socialLinks,
    })

    setSaving(false)
    if (result.success) {
      setMessage('Social links saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Failed to save social links')
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-3">
        {socialLinks.map((link: any, index: number) => (
          <div key={index} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm font-normal">platform</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={link.platform}
                onChange={(e) => updateLink(index, 'platform', e.target.value)}
              >
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="github">GitHub</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm font-normal">url</Label>
              <Input
                value={link.url}
                onChange={(e) => updateLink(index, 'url', e.target.value)}
                placeholder="https://..."
                className="h-9"
              />
            </div>
            <button
              onClick={() => removeLink(index)}
              className="h-9 text-sm hover:text-red-600 transition-all"
            >
              remove
            </button>
          </div>
        ))}

        <button
          onClick={addLink}
          className="text-sm hover:text-neutral-800 dark:hover:text-neutral-200 transition-all"
        >
          + add link
        </button>
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
