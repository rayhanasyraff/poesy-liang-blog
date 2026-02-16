/* Payload CMS Layout */
import config from '@payload-config'
import '@payloadcms/next/css'
import React from 'react'
import './custom.scss'

type Args = {
  children: React.ReactNode
}



const Layout = ({ children }: Args) => <>{children}</>

export default Layout
