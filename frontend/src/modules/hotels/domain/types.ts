export interface Hotel {
  id: string
  city: string
  name: string
  rating: number
  pricePerNight: number
  description: string
  imageUrl?: string
  distanceFromCenter?: number
  hasBreakfast?: boolean
  hasParking?: boolean
}

export type SortOption = 'rating' | 'price-asc' | 'price-desc'

export interface HotelFilters {
  closeToCenter: boolean
  hasBreakfast: boolean
  hasParking: boolean
  highRating: boolean
  priceMin?: number
  priceMax?: number
}

