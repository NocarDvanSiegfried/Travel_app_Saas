import { BestPrice, OptimalRoute, PopularPlace } from '../types/favorites'

export const bestPricesMock: BestPrice[] = [
  {
    id: '1',
    from: 'Якутск',
    to: 'Москва',
    price: 8500,
    date: '15 декабря',
    isLowestPrice: true,
  },
  {
    id: '2',
    from: 'Якутск',
    to: 'Новосибирск',
    price: 6200,
    date: '18 декабря',
    isLowestPrice: false,
  },
  {
    id: '3',
    from: 'Якутск',
    to: 'Иркутск',
    price: 5800,
    date: '20 декабря',
    isLowestPrice: true,
  },
  {
    id: '4',
    from: 'Якутск',
    to: 'Красноярск',
    price: 5500,
    date: '22 декабря',
    isLowestPrice: false,
  },
  {
    id: '5',
    from: 'Якутск',
    to: 'Владивосток',
    price: 7200,
    date: '25 декабря',
    isLowestPrice: false,
  },
]

export const optimalRoutesMock: OptimalRoute[] = [
  {
    id: '1',
    route: 'Москва → Якутск → Олекминск',
    price: 12500,
    duration: '8 ч 30 мин',
    transfers: 1,
    type: 'cheapest',
  },
  {
    id: '2',
    route: 'Москва → Якутск → Олекминск',
    price: 15200,
    duration: '6 ч 15 мин',
    transfers: 0,
    type: 'fastest',
  },
  {
    id: '3',
    route: 'Москва → Якутск → Олекминск',
    price: 13800,
    duration: '7 ч 20 мин',
    transfers: 1,
    type: 'optimal',
  },
]

export const popularPlacesMock: PopularPlace[] = [
  {
    id: '1',
    name: 'Ленские столбы',
    description: 'Уникальный природный памятник, включённый в список Всемирного наследия ЮНЕСКО',
  },
  {
    id: '2',
    name: 'Булуус',
    description: 'Ледяная пещера с уникальными ледяными образованиями в сердце Якутии',
  },
  {
    id: '3',
    name: 'Тукулааны',
    description: 'Песчаные дюны в сердце тайги — уникальное природное явление',
  },
]

