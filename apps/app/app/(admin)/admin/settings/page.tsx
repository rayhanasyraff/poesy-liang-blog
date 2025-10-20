import { getSettings } from '@/app/actions/settings'
import { SettingsTabs } from '@/components/admin/settings-tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

export const metadata = {
  title: 'Settings | Admin | POESY 小詩',
}

export default async function AdminSettings() {
  const settings = await getSettings()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end gap-6 text-sm">
        <Link href="/admin/dashboard" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-all">
          dashboard ↗
        </Link>
        <Link href="/" target="_blank" className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-all">
          view site ↗
        </Link>
        <form action={logout} className="inline">
          <button type="submit" className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-all">
            logout
          </button>
        </form>
      </div>

      <SettingsTabs initialSettings={settings} />
    </div>
  )
}
