export interface SupporterGift {
  id: number
  share_id: string
  user: string
  level: number
  purchase_id: string
  sku_id: string
  created_at: number
}

export interface SupporterLevel {
  id: string
  name: string
  slug: string
  level: number
  is_gift: boolean
  price: number
  price_str: string
  url: string
}
