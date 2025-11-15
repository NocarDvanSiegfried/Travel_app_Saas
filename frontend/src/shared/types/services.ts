export interface ServicePackage {
  id: string
  name: string
  features: string[]
}

export interface IndividualService {
  id: string
  name: string
  description?: string
}

export interface Tour {
  id: string
  name: string
  description: string
  duration: string
  price: number
  imageUrl?: string
}

