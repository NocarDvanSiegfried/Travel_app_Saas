/**
 * Список городов и сёл Якутии для автоподстановки
 * Используются города, которые есть в OData и подходят по региону
 */

const rawCities = [
  'Якутск',
  'Нерюнгри',
  'Мирный',
  'Удачный',
  'Алдан',
  'Олекминск',
  'Ленск',
  'Вилюйск',
  'Чурапча',
  'Амга',
]

const normalizeCity = (city: string): string | null => {
  const trimmed = city.trim().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').replace(/\s+/g, ' ')
  if (!trimmed || trimmed.length <= 1) {
    return null
  }
  const firstChar = trimmed.charAt(0).toUpperCase()
  const rest = trimmed.slice(1).toLowerCase()
  return firstChar + rest
}

const cleanedCities = rawCities
  .map(normalizeCity)
  .filter((city): city is string => city !== null && city.length > 1)
  .filter((city, index, array) => array.indexOf(city) === index)

export const YAKUTIA_CITIES = cleanedCities as readonly string[]

export type YakutiaCity = typeof YAKUTIA_CITIES[number]

