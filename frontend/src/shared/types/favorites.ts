export interface BestPrice {
  id: string
  from: string
  to: string
  price: number
  date?: string
  isLowestPrice: boolean
}

export interface OptimalRoute {
  id: string
  route: string
  price: number
  duration: string
  transfers: number
  type: 'cheapest' | 'fastest' | 'optimal'
}

export interface PopularPlace {
  id: string
  name: string
  description: string
  imageUrl?: string
}

