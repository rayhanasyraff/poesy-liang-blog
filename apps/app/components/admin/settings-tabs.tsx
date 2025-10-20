'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SiteInfoTab } from './tabs/site-info-tab'
import { SocialLinksTab } from './tabs/social-links-tab'
import { ThemeTab } from './tabs/theme-tab'
import { PreviewTab } from './tabs/preview-tab'

interface SettingsTabsProps {
  initialSettings: any
}

export function SettingsTabs({ initialSettings }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="site-info" className="w-full">
      <TabsList className="inline-flex h-auto p-0 bg-transparent border-0 gap-4">
        <TabsTrigger
          value="site-info"
          className="h-auto p-0 bg-transparent border-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold font-normal transition-all hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          site info
        </TabsTrigger>
        <TabsTrigger
          value="social"
          className="h-auto p-0 bg-transparent border-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold font-normal transition-all hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          social
        </TabsTrigger>
        <TabsTrigger
          value="theme"
          className="h-auto p-0 bg-transparent border-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold font-normal transition-all hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          theme
        </TabsTrigger>
        <TabsTrigger
          value="preview"
          className="h-auto p-0 bg-transparent border-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold font-normal transition-all hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="site-info" className="mt-8">
        <SiteInfoTab settings={initialSettings} />
      </TabsContent>

      <TabsContent value="social" className="mt-8">
        <SocialLinksTab settings={initialSettings} />
      </TabsContent>

      <TabsContent value="theme" className="mt-8">
        <ThemeTab settings={initialSettings} />
      </TabsContent>

      <TabsContent value="preview" className="mt-8">
        <PreviewTab />
      </TabsContent>
    </Tabs>
  )
}
