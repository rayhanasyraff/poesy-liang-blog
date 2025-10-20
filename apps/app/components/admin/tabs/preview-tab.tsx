'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function PreviewTab() {
  const [key, setKey] = useState(0)

  function refreshPreview() {
    setKey(prev => prev + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <button onClick={refreshPreview} className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-all">
          refresh
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-all">
          open ↗
        </a>
      </div>

      <div className="border rounded-md overflow-hidden">
        <iframe
          key={key}
          src="/"
          className="w-full h-[600px]"
          title="Website Preview"
        />
      </div>
    </div>
  )
}
