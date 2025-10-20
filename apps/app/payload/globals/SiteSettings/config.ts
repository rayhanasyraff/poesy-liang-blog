import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  access: {
    read: () => true,
    update: ({ req }) => !!req.user, // Only authenticated users can update
  },
  fields: [
    {
      name: 'siteTitle',
      type: 'text',
      required: true,
      defaultValue: 'POESY 小詩',
    },
    {
      name: 'siteTagline',
      type: 'text',
      defaultValue: 'Artist',
    },
    {
      name: 'siteDescription',
      type: 'textarea',
      defaultValue: 'POESY 小詩 - Artist',
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            { label: 'Twitter', value: 'twitter' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'GitHub', value: 'github' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'YouTube', value: 'youtube' },
          ],
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'theme',
      type: 'group',
      fields: [
        {
          name: 'primaryColor',
          type: 'text',
          defaultValue: '#000000',
          admin: {
            description: 'Primary color for the theme (hex code)',
          },
        },
        {
          name: 'accentColor',
          type: 'text',
          defaultValue: '#ec4899',
          admin: {
            description: 'Accent color for the theme (hex code)',
          },
        },
      ],
    },
  ],
}
