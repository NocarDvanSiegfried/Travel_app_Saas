import { TaxiOption, CarRental, BusRoute } from '../domain/types'

export const taxiMock: TaxiOption[] = [
  {
    id: '1',
    price: 450,
    carType: 'Эконом',
    estimatedTime: '15 мин',
  },
  {
    id: '2',
    price: 650,
    carType: 'Комфорт',
    estimatedTime: '12 мин',
  },
  {
    id: '3',
    price: 850,
    carType: 'Бизнес',
    estimatedTime: '10 мин',
  },
]

export const carRentalsMock: CarRental[] = [
  {
    id: '1',
    brand: 'Toyota',
    model: 'Camry',
    transmission: 'Автомат',
    pricePerDay: 2500,
    carType: 'Комфорт',
    hasAirConditioning: true,
  },
  {
    id: '2',
    brand: 'Hyundai',
    model: 'Solaris',
    transmission: 'Механика',
    pricePerDay: 1800,
    carType: 'Эконом',
    hasAirConditioning: true,
  },
  {
    id: '3',
    brand: 'Kia',
    model: 'Rio',
    transmission: 'Автомат',
    pricePerDay: 2000,
    carType: 'Эконом',
    hasAirConditioning: false,
  },
  {
    id: '4',
    brand: 'Volkswagen',
    model: 'Polo',
    transmission: 'Механика',
    pricePerDay: 2200,
    carType: 'Комфорт',
    hasAirConditioning: true,
  },
  {
    id: '5',
    brand: 'Nissan',
    model: 'Almera',
    transmission: 'Автомат',
    pricePerDay: 2400,
    carType: 'Комфорт',
    hasAirConditioning: true,
  },
  {
    id: '6',
    brand: 'Mercedes-Benz',
    model: 'E-Class',
    transmission: 'Автомат',
    pricePerDay: 5500,
    carType: 'Бизнес',
    hasAirConditioning: true,
  },
  {
    id: '7',
    brand: 'BMW',
    model: 'X5',
    transmission: 'Автомат',
    pricePerDay: 6800,
    carType: 'SUV',
    hasAirConditioning: true,
  },
  {
    id: '8',
    brand: 'Lada',
    model: 'Granta',
    transmission: 'Механика',
    pricePerDay: 1500,
    carType: 'Эконом',
    hasAirConditioning: false,
  },
]

export const busRoutesMock: BusRoute[] = [
  {
    id: '1',
    route: 'Якутск → Москва',
    departureTime: '08:00',
    arrivalTime: '12:30',
    price: 3500,
  },
  {
    id: '2',
    route: 'Якутск → Новосибирск',
    departureTime: '14:20',
    arrivalTime: '18:45',
    price: 2800,
  },
  {
    id: '3',
    route: 'Якутск → Иркутск',
    departureTime: '06:30',
    arrivalTime: '11:15',
    price: 3200,
  },
  {
    id: '4',
    route: 'Якутск → Красноярск',
    departureTime: '10:00',
    arrivalTime: '15:30',
    price: 2900,
  },
]

