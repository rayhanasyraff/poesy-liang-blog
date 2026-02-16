/* Payload CMS Layout */
import config from '@payload-config'
import '@payloadcms/next/css'
import React from 'react'
import './custom.scss'

import { initReq } from '@payloadcms/next/dist/utilities/initReq'
import { getClientConfig } from '@payloadcms/ui/dist/utilities/getClientConfig'
import { RootProvider } from '@payloadcms/ui/dist/providers/Root'
import { getNavPrefs } from '@payloadcms/next/dist/elements/Nav/getNavPrefs'

type Args = {
  children: React.ReactNode
}

export default async function Layout({ children }: Args) {
  // Initialize a minimal request to produce client config and req props for Payload's RootProvider
  const { req, cookies, headers, languageCode, permissions } = await initReq({ configPromise: config, importMap: undefined, key: 'PayloadAdminPartial' })

  const clientConfig = getClientConfig({ config: req.payload.config, i18n: req.i18n, importMap: undefined, user: req.user })
  const navPrefs = await getNavPrefs(req)
  const languageOptions = Object.entries(req.payload.config.i18n.supportedLanguages || {}).reduce((acc, [language, languageConfig]) => {
    if (Object.keys(req.payload.config.i18n.supportedLanguages).includes(language)) {
      acc.push({ label: languageConfig.translations.general.thisLanguage, value: language })
    }
    return acc
  }, [])

  return (
    <RootProvider
      config={clientConfig}
      dateFNSKey={req.i18n.dateFNSKey}
      fallbackLang={req.payload.config.i18n.fallbackLanguage}
      isNavOpen={navPrefs?.open ?? true}
      languageCode={languageCode}
      languageOptions={languageOptions}
      locale={req.locale}
      permissions={req.user ? permissions : null}
      serverFunction={undefined}
      switchLanguageServerAction={undefined}
      theme={undefined}
      translations={req.i18n.translations}
      user={req.user}
    >
      {children}
    </RootProvider>
  )
}
