export interface SettingItem {
  name: string
  description: string
  index: number
  value: boolean
}

export interface SettingsCategory {
  name: string
  description: string
  index: number
  settings: SettingItem[]
}

export type SettingsCategories = Record<string, SettingsCategory>
