export interface TaxiOption {
  id: string
  price: number
  carType: string
  estimatedTime: string
}

export type CarType = 'Эконом' | 'Комфорт' | 'Бизнес' | 'SUV'

export interface CarRental {
  id: string
  brand: string
  model: string
  transmission: string
  pricePerDay: number
  carType: CarType
  hasAirConditioning: boolean
  imageUrl?: string
}

export interface CarRentalFilters {
  driverAge?: number
  carType?: CarType
  transmission?: 'Автомат' | 'Механика'
  hasAirConditioning: boolean
  priceMin?: number
  priceMax?: number
}

export interface BusRoute {
  id: string
  route: string
  departureTime: string
  arrivalTime: string
  price: number
}

