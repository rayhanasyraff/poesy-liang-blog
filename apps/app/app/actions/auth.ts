'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function logout() {
  try {
    // Call Payload's logout endpoint
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

    await fetch(`${serverURL}/api/users/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Clear cookies
    const cookieStore = await cookies()
    cookieStore.delete('payload-token')
  } catch (error) {
    console.error('Logout error:', error)
  }

  redirect('/')
}
