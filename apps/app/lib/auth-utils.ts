import { redirect } from 'next/navigation'

export async function getAuthUser() {
  // TODO: Implement authentication without Payload CMS
  return { email: 'admin@example.com', name: 'Admin' }
}

export async function requireAuth() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/')
  }

  return user
}
