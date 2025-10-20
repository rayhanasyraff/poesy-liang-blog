import { requireAuth } from '@/lib/auth-utils'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth() // Redirect to /admin/login if not logged in

  return (
    <main className="antialiased lg:max-w-2xl md:max-w-full mx-4 mb-40 flex flex-col md:flex-row mt-2 sm:mt-8 lg:mx-auto bg-background transition-all duration-300 ease-out">
      <section className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0">
        <AdminHeader user={user} />
        {children}
      </section>
    </main>
  )
}
