'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Container from '@/components/shared/container'
import { ModeToggle } from '@/components/ui/theme-toggle'

const ADMIN_NAV_ITEMS = {
  blog: '/admin',
  about: '/admin/about',
  settings: '/admin/settings',
}

interface AdminHeaderProps {
  user: {
    email?: string | null
    name?: string | null
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname()

  return (
    <header>
      <Container size="large">
        <nav
          className="flex flex-col fade items-center md:items-start justify-start py-8 tracking-tight w-full sm:pr-0 md:pr-6 lg:pr-0"
          aria-label="Admin navigation"
        >
          <div className="flex flex-row items-center">
            <div className="flex flex-col">
              <span className="text-medium inline-block font-medium">
                Poesy Liang
              </span>
              <span className="opacity-60">admin</span>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between sm:justify-end w-full mt-8 sm:mt-4 mb-0 sm:mb-4 tracking-tight">
            <div className="inline-flex items-center">
              {Object.entries(ADMIN_NAV_ITEMS).map(([name, href]) => (
                <Link
                  key={name}
                  href={href}
                  className={cn(
                    pathname === href || (pathname && pathname.startsWith(href + '/') && name !== 'blog')
                      ? 'font-semibold'
                      : 'font-normal',
                    'transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2'
                  )}
                >
                  {name}
                </Link>
              ))}
            </div>
            <ModeToggle />
          </div>
        </nav>
      </Container>
    </header>
  )
}
