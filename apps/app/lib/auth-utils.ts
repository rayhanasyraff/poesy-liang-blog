import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getAuthUser() {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()

    // Convert cookies to Headers format
    const headers = new Headers()
    cookieStore.getAll().forEach((cookie) => {
      headers.append('cookie', `${cookie.name}=${cookie.value}`)
    })

    const { user } = await payload.auth({
      headers,
    })

    return user
  } catch (error) {
    console.error('Error getting auth user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/dashboard/login')
  }

  return user
}
