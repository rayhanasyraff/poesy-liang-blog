'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({
      slug: 'siteSettings',
    })
    return settings
  } catch (error) {
    console.error('Error fetching settings:', error)
    return null
  }
}

export async function updateSettings(data: any) {
  try {
    const payload = await getPayload({ config })
    const updated = await payload.updateGlobal({
      slug: 'siteSettings',
      data,
    })

    // Revalidate relevant paths
    revalidatePath('/admin/settings')
    revalidatePath('/admin')
    revalidatePath('/')

    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating settings:', error)
    return { success: false, error: 'Failed to update settings' }
  }
}
