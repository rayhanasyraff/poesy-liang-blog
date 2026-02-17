/* Payload CMS Layout */
import config from '@payload-config'
import '@payloadcms/next/css'
import React from 'react'
import './custom.scss'

import { createClientConfig } from 'payload'
import { RootProvider } from '@payloadcms/ui/providers/Root'

type Args = {
  children: React.ReactNode
}

export default function Layout({ children }: Args) {
  // Build a minimal i18n object and client config so Payload UI components have expected shape.
  const i18n = {
    language: 'en',
    dateFNSKey: 'en',
    translations: {},
  } as any

  const clientConfig = createClientConfig({ config, i18n, importMap: undefined as any })
n  const languageOptions = Object.entries((config.i18n?.supportedLanguages || {})).reduce((acc: any[], [language, languageConfig]: any) => {
    if (Object.keys(config.i18n?.supportedLanguages || {}).includes(language)) {
      acc.push({ label: (languageConfig as any).translations?.general?.thisLanguage || language, value: language })
    }
    return acc
  }, [])

  return (
    <RootProvider
      config={clientConfig}
      dateFNSKey={i18n.dateFNSKey}
      fallbackLang={config.i18n?.fallbackLanguage}
      isNavOpen={true}
      languageCode={i18n.language}
      languageOptions={languageOptions}
      locale={undefined}
      permissions={null}
      serverFunction={undefined}
      switchLanguageServerAction={undefined}
      theme={undefined}
      translations={i18n.translations}
      user={null}
    >
      {children}
    </RootProvider>
  )
}
