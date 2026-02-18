'use server'

import { redirect } from 'next/navigation'

export async function logout() {
  // TODO: Implement logout without Payload CMS
  redirect('/')
}
