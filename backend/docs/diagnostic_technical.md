# Расширенный план модернизации системы мультимодального поиска маршрутов

**Дата:** 2025-01-XX  
**Версия:** 3.0.0  
**Статус:** Готов к реализации  
**Основан на:** `MULTIMODAL_ROUTE_SYSTEM_IMPROVEMENT_PLAN.md`, `IMPROVED_TECHNICAL_PLAN.md`

---

## 📋 Содержание

1. [Диагностика текущей ситуации](#1-диагностика-текущей-ситуации)
2. [План по исправлению нормализации данных](#2-план-по-исправлению-нормализации-данных)
3. [План добавления российских городов](#3-план-добавления-российских-городов)
4. [План построения смешанных маршрутов](#4-план-построения-смешанных-маршрутов)
5. [План реализации переправы](#5-план-реализации-переправы)
6. [План по исправлению работы GraphBuilderWorker](#6-план-по-исправлению-работы-graphbuilderworker)
7. [Чёткий список изменений по файлам](#7-чёткий-список-изменений-по-файлам)
8. [Готовый порядок работ](#8-готовый-порядок-работ)
9. [Контр-проверка после внедрения](#9-контр-проверка-после-внедрения)

---

## 1. Диагностика текущей ситуации

### 1.1 Почему исчез «Якутск»

**Корневая причина:**
- **Файл:** `backend/src/shared/utils/city-normalizer.ts`, функция `extractCityFromStopName()` (строки 121-180)
- **Проблема:** Функция извлекает последнее слово в скобках как город
- **Пример:** "Аэропорт Якутск (Туймаада)" → извлекается "Туймаада" вместо "Якутск"
- **Где происходит:**
  - `ODataSyncWorker.ts:267` → `cityName = extractCityFromStopName(stopData.name, stopData.address)`
  - `RouteGraphBuilder.ts:72` → `const cityName = extractCityFromStopName(stop.name, stop.metadata?.address)`
- **Результат:** Остановка сохраняется с `city_id = "Туймаада"`, при поиске по "Якутск" не находится

**Текущая логика:**
```typescript
// Строки 134-158: извлекает последнее слово, игнорируя скобки
const words = stopName.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g);
const lastWord = words[words.length - 1].toLowerCase();
// Проблема: не обрабатывает паттерн "Аэропорт [Город] ([Аэропорт])"
```

### 1.2 Почему появился «Туймада»

**Корневая причина:**
- Та же, что в 1.1: `extractCityFromStopName()` извлекает "Туймаада" как отдельный город
- **Где происходит:**
  - `ODataSyncWorker.ts` → сохранение остановки с `city_id = "Туймаада"`
  - `VirtualEntitiesGeneratorWorker.ts:519` → `const cityName = stop.cityId || this.extractCityFromStopName(stop.name)`
  - Если "Туймаада" не найдена в `yakutia-cities-reference.json`, может создаться виртуальная остановка

**Результат:** В БД появляется запись с `city_id = "Туймаада"` (или нормализованное "туймаада"), которая не должна существовать

### 1.3 Почему часть городов пропала или размножилась

**Корневые причины:**

1. **Нет валидации перед сохранением:**
   - `ODataSyncWorker.parseODataResponse()` (строки 252-284) не валидирует данные перед созданием `RealStop`
   - Могут сохраняться остановки с пустым `city_id`, некорректными координатами, опечатками

2. **Нет проверки на дубликаты:**
   - Один и тот же город может сохраниться с разными `city_id` (например, "Якутск" и "якутск")
   - Нормализация не применяется при сохранении в БД

3. **Нет whitelist допустимых городов:**
   - `extractCityFromStopName()` может извлечь мусорные значения (служебные слова, опечатки)
   - Нет проверки, что извлеченный город есть в reference

### 1.4 Где возникают мусорные города из OData

**Источники мусорных данных:**

1. **ODataSyncWorker.parseODataResponse()** (строки 258-284):
   - Нет валидации обязательных полей (`name`, `latitude`, `longitude`)
   - Нет проверки корректности координат (диапазон, NaN)
   - Нет проверки извлеченного `city_id` (не пустой, не служебное слово)

2. **extractCityFromStopName()** (строки 121-180):
   - Может извлечь служебные слова ("центральная", "главный") как города
   - Может извлечь опечатки из OData
   - Не проверяет, что извлеченное значение есть в reference

3. **VirtualEntitiesGeneratorWorker** (строки 519-684):
   - Может создать виртуальные остановки для городов, не найденных в reference
   - Нет проверки, что город не является названием аэропорта или пригорода

### 1.5 Как именно сейчас строится граф и что ломает связность

**Текущий процесс построения графа:**

1. **GraphBuilderWorker.executeWorkerLogic()** (строки 94-446):
   - Загружает все остановки (real + virtual) из PostgreSQL
   - Загружает все маршруты (real + virtual) из PostgreSQL
   - Загружает все рейсы из PostgreSQL
   - Строит граф: узлы = остановки, рёбра = маршруты

2. **Проблемы связности:**

   **a) Нет рёбер пересадки:**
   - Если остановки в одном городе (например, "Аэропорт Якутск" и "Автостанция Якутск"), между ними нет ребра
   - Невозможно построить маршрут "Москва → Аэропорт Якутск → Автостанция Якутск → Олёкминск"

   **b) Нет поддержки смешанных маршрутов:**
   - Граф не учитывает возможность пересадок между разными типами транспорта
   - Нет рёбер типа `TRANSFER` для пересадок в одном городе

   **c) Нет ferry-маршрутов:**
   - Переправа Якутск ↔ Нижний Бестях не реализована
   - Нет типа транспорта `FERRY` в графе

   **d) Нет федеральных городов:**
   - Федеральные города отсутствуют в reference
   - Виртуальные остановки для них не создаются
   - Маршруты из федеральных городов не строятся

3. **RouteGraphBuilder.buildFromDataset()** (строки 35-937):
   - Строит граф из датасета, но не создает рёбра пересадки
   - Не учитывает возможность смешанных маршрутов

---

## 2. План по исправлению нормализации данных

### 2.1 Нормализация аэропортов (особенно аэропорт Якутска)

#### Шаг 1: Создать справочник аэропортов

**Файл:** `backend/data/reference/airports-reference.json` (НОВЫЙ)

```json
{
  "version": "1.0.0",
  "description": "Справочник аэропортов и их городов для нормализации названий остановок",
  "airports": [
    {
      "name": "Туймаада",
      "city": "Якутск",
      "aliases": ["Туймада", "Yakutsk Airport", "YKS"],
      "normalizedName": "туймаада"
    },
    {
      "name": "Шереметьево",
      "city": "Москва",
      "aliases": ["SVO", "Sheremetyevo"],
      "normalizedName": "шереметьево"
    },
    {
      "name": "Домодедово",
      "city": "Москва",
      "aliases": ["DME", "Domodedovo"],
      "normalizedName": "домодедово"
    },
    {
      "name": "Внуково",
      "city": "Москва",
      "aliases": ["VKO", "Vnukovo"],
      "normalizedName": "внуково"
    },
    {
      "name": "Пулково",
      "city": "Санкт-Петербург",
      "aliases": ["LED", "Pulkovo"],
      "normalizedName": "пулково"
    },
    {
      "name": "Толмачёво",
      "city": "Новосибирск",
      "aliases": ["OVB", "Tolmachevo"],
      "normalizedName": "толмачёво"
    },
    {
      "name": "Емельяново",
      "city": "Красноярск",
      "aliases": ["KJA", "Yemelyanovo"],
      "normalizedName": "емельяново"
    },
    {
      "name": "Кольцово",
      "city": "Екатеринбург",
      "aliases": ["SVX", "Koltsovo"],
      "normalizedName": "кольцово"
    }
  ]
}
```

#### Шаг 2: Создать утилиту для загрузки справочника аэропортов

**Файл:** `backend/src/shared/utils/airports-loader.ts` (НОВЫЙ)

```typescript
import fs from 'fs';
import path from 'path';
import { normalizeCityName } from './city-normalizer';

export interface AirportReference {
  name: string;
  city: string;
  aliases: string[];
  normalizedName: string;
}

export function loadAirportsReference(): Map<string, string> {
  const airportsMap = new Map<string, string>();
  
  const referencePath = path.join(
    __dirname,
    '../../../data/reference/airports-reference.json'
  );
  
  if (!fs.existsSync(referencePath)) {
    console.warn(`[AirportsLoader] Reference file not found: ${referencePath}`);
    return airportsMap;
  }
  
  const fileContent = fs.readFileSync(referencePath, 'utf-8');
  const reference = JSON.parse(fileContent);
  
  for (const airport of reference.airports) {
    // Добавляем основное название
    airportsMap.set(normalizeCityName(airport.name), airport.city);
    // Добавляем алиасы
    for (const alias of airport.aliases) {
      airportsMap.set(normalizeCityName(alias), airport.city);
    }
  }
  
  return airportsMap;
}

export function getCityByAirportName(airportName: string): string | undefined {
  const airportsMap = loadAirportsReference();
  const normalized = normalizeCityName(airportName);
  return airportsMap.get(normalized);
}
```

#### Шаг 3: Обновить `extractCityFromStopName()` в `city-normalizer.ts`

**Файл:** `backend/src/shared/utils/city-normalizer.ts` (ОБНОВИТЬ)

**Изменения:**
1. Импортировать `getCityByAirportName` из `airports-loader.ts`
2. Модифицировать функцию `extractCityFromStopName()` (строки 121-180):

```typescript
export function extractCityFromStopName(stopName?: string, address?: string): string {
  if (!stopName) {
    return address ? extractCityFromAddress(address) : '';
  }

  // ШАГ 1: Проверка паттерна "Аэропорт [Город] ([Название аэропорта])"
  const airportPattern = /Аэропорт\s+([А-Яа-яЁё\-\s]+)\s*\(([^)]+)\)/i;
  const airportMatch = stopName.match(airportPattern);
  
  if (airportMatch) {
    const cityPart = airportMatch[1].trim(); // "Якутск"
    const airportName = airportMatch[2].trim(); // "Туймаада"
    
    // Проверяем, является ли название в скобках известным аэропортом
    const cityFromReference = getCityByAirportName(airportName);
    if (cityFromReference) {
      return cityFromReference; // "Якутск" вместо "Туймаада"
    }
    
    // Fallback: извлекаем город из части ДО скобок
    return extractCityFromPart(cityPart);
  }

  // ШАГ 2: Проверка паттерна "Аэропорт [Город]" (без скобок)
  const airportSimplePattern = /Аэропорт\s+([А-Яа-яЁё\-\s]+)/i;
  const airportSimpleMatch = stopName.match(airportSimplePattern);
  
  if (airportSimpleMatch) {
    return extractCityFromPart(airportSimpleMatch[1].trim());
  }

  // ШАГ 3: Существующая логика для других форматов
  // ... (остальной код без изменений)
}

function extractCityFromPart(part: string): string {
  const words = part.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g);
  if (!words || words.length === 0) {
    return part.trim();
  }
  
  const stopTypeWords = new Set([
    'аэропорт', 'вокзал', 'автостанция', 'автовокзал', 'остановка', 'станция',
    'центральная', 'главный', 'пассажирский'
  ]);
  
  const lastWord = words[words.length - 1].toLowerCase();
  if (!stopTypeWords.has(lastWord) && words.length > 1) {
    return words[words.length - 1];
  } else if (words.length > 1) {
    return words[0];
  } else {
    return words[0];
  }
}
```

### 2.2 Правильные связи «Нижний Бестях → Якутск»

#### Шаг 1: Создать справочник пригородов

**Файл:** `backend/data/reference/suburbs-reference.json` (НОВЫЙ)

```json
{
  "version": "1.0.0",
  "description": "Справочник пригородов и их основных городов",
  "suburbs": [
    {
      "name": "Нижний Бестях",
      "mainCity": "Якутск",
      "type": "ferry_terminal",
      "normalizedName": "нижний бестях"
    },
    {
      "name": "Беркакит",
      "mainCity": "Нерюнгри",
      "type": "railway_station",
      "normalizedName": "беркакит"
    }
  ]
}
```

#### Шаг 2: Создать утилиту для загрузки справочника пригородов

**Файл:** `backend/src/shared/utils/suburbs-loader.ts` (НОВЫЙ)

```typescript
import fs from 'fs';
import path from 'path';
import { normalizeCityName } from './city-normalizer';

export interface SuburbReference {
  name: string;
  mainCity: string;
  type: string;
  normalizedName: string;
}

export function loadSuburbsReference(): Map<string, string> {
  const suburbsMap = new Map<string, string>();
  
  const referencePath = path.join(
    __dirname,
    '../../../data/reference/suburbs-reference.json'
  );
  
  if (!fs.existsSync(referencePath)) {
    console.warn(`[SuburbsLoader] Reference file not found: ${referencePath}`);
    return suburbsMap;
  }
  
  const fileContent = fs.readFileSync(referencePath, 'utf-8');
  const reference = JSON.parse(fileContent);
  
  for (const suburb of reference.suburbs) {
    suburbsMap.set(normalizeCityName(suburb.name), suburb.mainCity);
  }
  
  return suburbsMap;
}

export function getMainCityBySuburb(suburbName: string): string | undefined {
  const suburbsMap = loadSuburbsReference();
  const normalized = normalizeCityName(suburbName);
  return suburbsMap.get(normalized);
}
```

#### Шаг 3: Обновить `ODataSyncWorker.parseODataResponse()`

**Файл:** `backend/src/application/workers/ODataSyncWorker.ts` (ОБНОВИТЬ)

**Изменения в методе `parseODataResponse()` (строки 252-284):**

```typescript
import { getCityByAirportName } from '../../shared/utils/airports-loader';
import { getMainCityBySuburb } from '../../shared/utils/suburbs-loader';
import { isCityInUnifiedReference } from '../../shared/utils/unified-cities-loader';

private parseODataResponse(response: ODataResponse): {
  stops: RealStop[];
  routes: Route[];
  flights: Flight[];
} {
  const stops = response.stops.map((stopData: any) => {
    // ... существующий код для координат ...
    
    // Извлекаем city_id
    let cityName = stopData.cityName;
    if (!cityName && stopData.name) {
      cityName = extractCityFromStopName(stopData.name, stopData.address);
    }
    
    // НОРМАЛИЗАЦИЯ: Проверяем пригороды
    if (cityName) {
      const mainCity = getMainCityBySuburb(cityName);
      if (mainCity) {
        cityName = mainCity; // "Нижний Бестях" → "Якутск"
      }
    }
    
    // НОРМАЛИЗАЦИЯ: Проверяем аэропорты (если cityName все еще похож на название аэропорта)
    if (cityName) {
      const cityFromAirport = getCityByAirportName(cityName);
      if (cityFromAirport) {
        cityName = cityFromAirport; // "Туймаада" → "Якутск"
      }
    }
    
    // ВАЛИДАЦИЯ: Проверяем, что city_id есть в unified-cities-reference.json
    if (cityName && !isCityInUnifiedReference(cityName)) {
      this.log('WARN', `City "${cityName}" not found in unified reference, skipping stop "${stopData.name}"`);
      return null; // Пропускаем остановку
    }
    
    // ... остальной код создания RealStop ...
  }).filter(stop => stop !== null); // Фильтруем null
    
  // ... остальной код ...
}
```

### 2.3 Фильтрация OData

#### Шаг 1: Создать валидатор для остановок

**Файл:** `backend/src/shared/validators/stop-validator.ts` (НОВЫЙ)

```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateStopData(stopData: {
  name?: string;
  latitude?: number;
  longitude?: number;
  cityId?: string;
}): ValidationResult {
  const errors: string[] = [];
  
  // Проверка name
  if (!stopData.name || stopData.name.trim().length < 3) {
    errors.push('Stop name must be at least 3 characters');
  }
  
  // Проверка latitude
  if (stopData.latitude === undefined || stopData.latitude === null) {
    errors.push('Latitude is required');
  } else if (isNaN(stopData.latitude) || stopData.latitude < -90 || stopData.latitude > 90) {
    errors.push(`Invalid latitude: ${stopData.latitude}`);
  }
  
  // Проверка longitude
  if (stopData.longitude === undefined || stopData.longitude === null) {
    errors.push('Longitude is required');
  } else if (isNaN(stopData.longitude) || stopData.longitude < -180 || stopData.longitude > 180) {
    errors.push(`Invalid longitude: ${stopData.longitude}`);
  }
  
  // Проверка cityId (если извлечен)
  if (stopData.cityId) {
    const stopTypeWords = new Set([
      'аэропорт', 'вокзал', 'автостанция', 'автовокзал', 'остановка', 'станция',
      'центральная', 'главный', 'пассажирский', 'туймаада', 'туймада'
    ]);
    
    const normalizedCityId = stopData.cityId.toLowerCase().trim();
    if (stopTypeWords.has(normalizedCityId)) {
      errors.push(`Invalid cityId: "${stopData.cityId}" is a stop type word, not a city`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

#### Шаг 2: Интегрировать валидатор в `ODataSyncWorker`

**Файл:** `backend/src/application/workers/ODataSyncWorker.ts` (ОБНОВИТЬ)

**Изменения:**
```typescript
import { validateStopData } from '../../shared/validators/stop-validator';

private parseODataResponse(response: ODataResponse): {
  stops: RealStop[];
  routes: Route[];
  flights: Flight[];
  validationStats: {
    totalStops: number;
    validStops: number;
    invalidStops: number;
    errors: Array<{ stopName: string; errors: string[] }>;
  };
} {
  const validationErrors: Array<{ stopName: string; errors: string[] }> = [];
  
  const stops = response.stops
    .map((stopData: any) => {
      // ... нормализация city_id (как в разделе 2.2) ...
      
      // ВАЛИДАЦИЯ
      const validation = validateStopData({
        name: stopData.name,
        latitude: stopData.coordinates?.latitude ?? stopData.latitude,
        longitude: stopData.coordinates?.longitude ?? stopData.longitude,
        cityId: cityName
      });
      
      if (!validation.isValid) {
        validationErrors.push({
          stopName: stopData.name || 'Unknown',
          errors: validation.errors
        });
        return null; // Пропускаем невалидную остановку
      }
      
      // ... создание RealStop ...
    })
    .filter(stop => stop !== null);
  
  return {
    stops,
    routes: /* ... */,
    flights: /* ... */,
    validationStats: {
      totalStops: response.stops.length,
      validStops: stops.length,
      invalidStops: validationErrors.length,
      errors: validationErrors
    }
  };
}
```

### 2.4 Единый справочник городов, включая федеральные

#### Шаг 1: Создать справочник федеральных городов

**Файл:** `backend/data/reference/russia-federal-cities-reference.json` (НОВЫЙ)

```json
{
  "version": "1.0.0",
  "description": "Справочник федеральных городов России",
  "cities": [
    {
      "name": "Москва",
      "normalizedName": "москва",
      "latitude": 55.7558,
      "longitude": 37.6173,
      "region": "Central",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Шереметьево", "Домодедово", "Внуково"]
    },
    {
      "name": "Санкт-Петербург",
      "normalizedName": "санкт-петербург",
      "latitude": 59.9343,
      "longitude": 30.3351,
      "region": "Northwest",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Пулково"]
    },
    {
      "name": "Новосибирск",
      "normalizedName": "новосибирск",
      "latitude": 55.0084,
      "longitude": 82.9357,
      "region": "Siberia",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Толмачёво"]
    },
    {
      "name": "Красноярск",
      "normalizedName": "красноярск",
      "latitude": 56.0089,
      "longitude": 92.8537,
      "region": "Siberia",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Емельяново"]
    },
    {
      "name": "Иркутск",
      "normalizedName": "иркутск",
      "latitude": 52.2680,
      "longitude": 104.3889,
      "region": "Siberia",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Иркутск"]
    },
    {
      "name": "Хабаровск",
      "normalizedName": "хабаровск",
      "latitude": 48.4802,
      "longitude": 135.0719,
      "region": "FarEast",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Хабаровск"]
    },
    {
      "name": "Владивосток",
      "normalizedName": "владивосток",
      "latitude": 43.1155,
      "longitude": 131.8855,
      "region": "FarEast",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Владивосток"]
    },
    {
      "name": "Екатеринбург",
      "normalizedName": "екатеринбург",
      "latitude": 56.8431,
      "longitude": 60.6454,
      "region": "Ural",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Кольцово"]
    },
    {
      "name": "Казань",
      "normalizedName": "казань",
      "latitude": 55.8304,
      "longitude": 49.0661,
      "region": "Volga",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Казань"]
    },
    {
      "name": "Нижний Новгород",
      "normalizedName": "нижний новгород",
      "latitude": 56.2965,
      "longitude": 43.9361,
      "region": "Volga",
      "isKeyCity": true,
      "isFederalCity": true,
      "airports": ["Стригино"]
    }
  ]
}
```

#### Шаг 2: Создать утилиту для загрузки объединенного справочника

**Файл:** `backend/src/shared/utils/unified-cities-loader.ts` (НОВЫЙ)

```typescript
import fs from 'fs';
import path from 'path';
import { normalizeCityName } from './city-normalizer';
import { loadYakutiaCitiesReference, type YakutiaCity } from './yakutia-cities-loader';

export interface UnifiedCity {
  name: string;
  normalizedName: string;
  latitude: number;
  longitude: number;
  region: string;
  isKeyCity: boolean;
  isFederalCity: boolean;
  airports?: string[];
}

let unifiedCitiesCache: Map<string, UnifiedCity> | null = null;

export function loadUnifiedCitiesReference(): Map<string, UnifiedCity> {
  if (unifiedCitiesCache) {
    return unifiedCitiesCache;
  }
  
  const citiesMap = new Map<string, UnifiedCity>();
  
  // Загружаем города Якутии
  const yakutiaCities = loadYakutiaCitiesReference();
  for (const [normalizedName, city] of yakutiaCities.entries()) {
    citiesMap.set(normalizedName, {
      name: city.name,
      normalizedName: city.normalizedName,
      latitude: city.latitude,
      longitude: city.longitude,
      region: 'Yakutia',
      isKeyCity: city.isKeyCity,
      isFederalCity: false
    });
  }
  
  // Загружаем федеральные города
  const federalCitiesPath = path.join(
    __dirname,
    '../../../data/reference/russia-federal-cities-reference.json'
  );
  
  if (fs.existsSync(federalCitiesPath)) {
    const fileContent = fs.readFileSync(federalCitiesPath, 'utf-8');
    const reference = JSON.parse(fileContent);
    
    for (const city of reference.cities) {
      const normalizedKey = normalizeCityName(city.normalizedName || city.name);
      citiesMap.set(normalizedKey, {
        name: city.name,
        normalizedName: city.normalizedName || normalizeCityName(city.name),
        latitude: city.latitude,
        longitude: city.longitude,
        region: city.region,
        isKeyCity: city.isKeyCity ?? true,
        isFederalCity: city.isFederalCity ?? true,
        airports: city.airports
      });
    }
  }
  
  unifiedCitiesCache = citiesMap;
  return citiesMap;
}

export function getUnifiedCity(cityName: string): UnifiedCity | undefined {
  const citiesMap = loadUnifiedCitiesReference();
  const normalized = normalizeCityName(cityName);
  return citiesMap.get(normalized);
}

export function isCityInUnifiedReference(cityName: string): boolean {
  return getUnifiedCity(cityName) !== undefined;
}

export function getAllFederalCities(): UnifiedCity[] {
  const citiesMap = loadUnifiedCitiesReference();
  return Array.from(citiesMap.values()).filter(city => city.isFederalCity);
}

export function getAllYakutiaCities(): UnifiedCity[] {
  const citiesMap = loadUnifiedCitiesReference();
  return Array.from(citiesMap.values()).filter(city => !city.isFederalCity);
}
```

---

## 3. План добавления российских городов так, чтобы они стабильно работали

### 3.1 Москва, СПб, Новосибирск, Красноярск, Иркутск, Владивосток, Хабаровск и др.

**Города для добавления:**
- Москва, Санкт-Петербург, Новосибирск, Красноярск, Иркутск, Хабаровск, Владивосток, Екатеринбург, Казань, Нижний Новгород

**Все они уже включены в `russia-federal-cities-reference.json` (см. раздел 2.4)**

### 3.2 Как встроить их в существующий пайплайн

#### Шаг 1: Обновить `VirtualEntitiesGeneratorWorker`

**Файл:** `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts` (ОБНОВИТЬ)

**Изменения:**

1. **Импорты (строки 27-33):**
```typescript
// ЗАМЕНИТЬ:
import {
  getAllYakutiaCities,
  getYakutiaCity,
  isYakutiaCity,
  type YakutiaCity,
} from '../../shared/utils/yakutia-cities-loader';

// НА:
import {
  getAllYakutiaCities,
  getAllFederalCities,
  getUnifiedCity,
  isCityInUnifiedReference,
  type UnifiedCity,
} from '../../shared/utils/unified-cities-loader';
```

2. **Конструктор (строки 55-63):**
```typescript
constructor(
  private readonly stopRepository: IStopRepository,
  private readonly routeRepository: IRouteRepository,
  private readonly flightRepository: IFlightRepository,
  private readonly datasetRepository: IDatasetRepository,
  // УДАЛИТЬ: private readonly citiesDirectory: CityCoordinates
) {
  super('virtual-entities-generator', 'Virtual Entities Generator Worker', '1.0.0');
}
```

3. **Метод `generateVirtualStops()` (строки ~100-200):**
```typescript
private async generateVirtualStops(): Promise<VirtualStop[]> {
  const virtualStops: VirtualStop[] = [];
  
  // Загружаем все города (Якутия + федеральные)
  const yakutiaCities = getAllYakutiaCities();
  const federalCities = getAllFederalCities();
  const allCities = [...yakutiaCities, ...federalCities];
  
  // Получаем все реальные остановки из БД
  const realStops = await this.stopRepository.getAllRealStops();
  const realCitiesSet = new Set(
    realStops
      .map(stop => stop.cityId)
      .filter(cityId => cityId)
      .map(cityId => normalizeCityName(cityId!))
  );
  
  // Генерируем виртуальные остановки только для городов без реальных остановок
  for (const city of allCities) {
    // Пропускаем, если уже есть реальная остановка
    if (realCitiesSet.has(city.normalizedName)) {
      continue;
    }
    
    // Генерируем только для ключевых городов
    if (!city.isKeyCity) {
      continue;
    }
    
    const virtualStop = new VirtualStop(
      generateVirtualStopId(city.name),
      city.name,
      city.latitude,
      city.longitude,
      city.name, // cityId
      false, // isAirport
      false, // isRailwayStation
      { cityName: city.name, _virtual: true }
    );
    
    virtualStops.push(virtualStop);
  }
  
  return virtualStops;
}
```

4. **Метод `ensureYakutiaCitiesConnectivity()` → переименовать в `ensureCitiesConnectivity()` (строки 499-600):**
```typescript
private async ensureCitiesConnectivity(): Promise<VirtualRoute[]> {
  const virtualRoutes: VirtualRoute[] = [];
  
  const yakutiaCities = getAllYakutiaCities();
  const federalCities = getAllFederalCities();
  const hubCity = getUnifiedCity(this.hubCityName); // "Якутск"
  
  if (!hubCity) {
    this.log('ERROR', `Hub city "${this.hubCityName}" not found in unified reference`);
    return virtualRoutes;
  }
  
  // ПАРЫ: федеральный город → город Якутии
  for (const federalCity of federalCities) {
    for (const yakutiaCity of yakutiaCities) {
      // Пропускаем, если уже есть реальный маршрут
      const routeExists = await this.checkRouteExists(
        generateVirtualStopId(federalCity.name),
        generateVirtualStopId(yakutiaCity.name)
      );
      
      if (routeExists) {
        continue;
      }
      
      // Создаем hub-based маршрут: федеральный город → Якутск → город Якутии
      if (yakutiaCity.name !== hubCity.name) {
        // Маршрут 1: федеральный город → Якутск (air)
        const route1 = new VirtualRoute(
          generateVirtualRouteId(
            generateVirtualStopId(federalCity.name),
            generateVirtualStopId(hubCity.name)
          ),
          generateVirtualStopId(federalCity.name),
          generateVirtualStopId(hubCity.name),
          'PLANE', // air transport
          240, // 4 hours
          2000, // ~2000 km
          { _virtual: true, hubBased: true }
        );
        
        // Маршрут 2: Якутск → город Якутии (ground)
        const route2 = new VirtualRoute(
          generateVirtualRouteId(
            generateVirtualStopId(hubCity.name),
            generateVirtualStopId(yakutiaCity.name)
          ),
          generateVirtualStopId(hubCity.name),
          generateVirtualStopId(yakutiaCity.name),
          'BUS', // ground transport
          180, // 3 hours
          200, // ~200 km
          { _virtual: true, hubBased: true }
        );
        
        virtualRoutes.push(route1, route2);
      } else {
        // Прямой маршрут: федеральный город → Якутск (air)
        const route = new VirtualRoute(
          generateVirtualRouteId(
            generateVirtualStopId(federalCity.name),
            generateVirtualStopId(hubCity.name)
          ),
          generateVirtualStopId(federalCity.name),
          generateVirtualStopId(hubCity.name),
          'PLANE',
          240,
          2000,
          { _virtual: true }
        );
        
        virtualRoutes.push(route);
      }
    }
  }
  
  // ПАРЫ: федеральный город → федеральный город (прямые авиамаршруты)
  for (let i = 0; i < federalCities.length; i++) {
    for (let j = i + 1; j < federalCities.length; j++) {
      const city1 = federalCities[i];
      const city2 = federalCities[j];
      
      const routeExists = await this.checkRouteExists(
        generateVirtualStopId(city1.name),
        generateVirtualStopId(city2.name)
      );
      
      if (routeExists) {
        continue;
      }
      
      // Прямой авиамаршрут
      const route = new VirtualRoute(
        generateVirtualRouteId(
          generateVirtualStopId(city1.name),
          generateVirtualStopId(city2.name)
        ),
        generateVirtualStopId(city1.name),
        generateVirtualStopId(city2.name),
        'PLANE',
        180, // 3 hours
        1500, // ~1500 km
        { _virtual: true }
      );
      
      virtualRoutes.push(route);
    }
  }
  
  // ПАРЫ: город Якутии → город Якутии (существующая логика)
  // ... (оставить существующий код)
  
  return virtualRoutes;
}
```

### 3.3 Как обеспечить реальные и виртуальные маршруты

#### Шаг 1: Создать `AirRouteGeneratorWorker`

**Файл:** `backend/src/application/workers/AirRouteGeneratorWorker.ts` (НОВЫЙ)

```typescript
import { BaseBackgroundWorker } from './base/BaseBackgroundWorker';
import type { WorkerExecutionResult } from './base/IBackgroundWorker';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
import { Route } from '../../domain/entities/Route';
import { Flight } from '../../domain/entities/Flight';
import { getAllFederalCities, getUnifiedCity } from '../../shared/utils/unified-cities-loader';
import { generateVirtualStopId } from '../../shared/utils/city-normalizer';

export class AirRouteGeneratorWorker extends BaseBackgroundWorker {
  private hubCityName: string = 'Якутск';

  constructor(
    private readonly routeRepository: IRouteRepository,
    private readonly flightRepository: IFlightRepository,
    private readonly datasetRepository: IDatasetRepository
  ) {
    super('air-route-generator', 'Air Route Generator Worker', '1.0.0');
  }

  public async canRun(): Promise<boolean> {
    // Запускается после ODataSyncWorker, перед VirtualEntitiesGeneratorWorker
    const latestDataset = await this.datasetRepository.getLatestDataset();
    return latestDataset !== null;
  }

  protected async executeWorkerLogic(): Promise<WorkerExecutionResult> {
    const startTime = Date.now();

    try {
      const federalCities = getAllFederalCities();
      const hubCity = getUnifiedCity(this.hubCityName);

      if (!hubCity) {
        throw new Error(`Hub city "${this.hubCityName}" not found`);
      }

      const generatedRoutes: Route[] = [];
      const generatedFlights: Flight[] = [];

      // Для каждого федерального города создаем авиамаршрут в Якутск
      for (const federalCity of federalCities) {
        // Проверяем, есть ли уже реальный маршрут
        const existingRoutes = await this.routeRepository.findRoutesByStops(
          generateVirtualStopId(federalCity.name),
          generateVirtualStopId(hubCity.name)
        );

        if (existingRoutes.length > 0) {
          this.log('INFO', `Route ${federalCity.name} → ${hubCity.name} already exists, skipping`);
          continue;
        }

        // Создаем маршрут
        const route = new Route(
          `air-route-${federalCity.normalizedName}-${hubCity.normalizedName}`,
          generateVirtualStopId(federalCity.name),
          generateVirtualStopId(hubCity.name),
          [
            { stopId: generateVirtualStopId(federalCity.name), order: 1 },
            { stopId: generateVirtualStopId(hubCity.name), order: 2 }
          ],
          'PLANE',
          240, // 4 hours
          2000, // ~2000 km
          15000 // base fare
        );

        generatedRoutes.push(route);

        // Генерируем рейсы (ежедневно, 2-3 рейса в день)
        const flightTimes = ['08:00', '14:00', '20:00'];
        for (const time of flightTimes) {
          const flight = new Flight(
            `flight-${route.id}-${time.replace(':', '')}`,
            route.id,
            time,
            240, // duration
            15000 // fare
          );
          generatedFlights.push(flight);
        }
      }

      // Сохраняем маршруты и рейсы
      for (const route of generatedRoutes) {
        await this.routeRepository.save(route);
      }

      for (const flight of generatedFlights) {
        await this.flightRepository.save(flight);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        message: `Generated ${generatedRoutes.length} air routes and ${generatedFlights.length} flights`,
        executionTimeMs: executionTime,
        metadata: {
          routesGenerated: generatedRoutes.length,
          flightsGenerated: generatedFlights.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating air routes: ${error instanceof Error ? error.message : String(error)}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }
}
```

#### Шаг 2: Интегрировать в пайплайн воркеров

**Файл:** `backend/src/infrastructure/workers/initializeWorkers.ts` (ОБНОВИТЬ)

**Изменения:**
```typescript
import { AirRouteGeneratorWorker } from '../../application/workers/AirRouteGeneratorWorker';

// В функции инициализации воркеров:
const airRouteGeneratorWorker = new AirRouteGeneratorWorker(
  routeRepository,
  flightRepository,
  datasetRepository
);

// Порядок выполнения:
// 1. ODataSyncWorker
// 2. AirRouteGeneratorWorker (НОВЫЙ)
// 3. VirtualEntitiesGeneratorWorker
// 4. GraphBuilderWorker
```

---

## 4. План построения смешанных маршрутов

### 4.1 Самолёт → переправа → автобус

**Пример:** Москва → Якутск → Нижний Бестях → Чурапча

**Требования:**
1. Рёбра пересадки между остановками в одном городе
2. Ferry-маршруты (Якутск ↔ Нижний Бестях)
3. Правильные веса для пересадок

### 4.2 Самолёт → автобус

**Пример:** Москва → Якутск → Чурапча

**Требования:**
1. Рёбра пересадки: Аэропорт Якутск → Автостанция Якутск
2. Вес пересадки: 90 минут (air → ground)

### 4.3 Пересадки с корректными весами

**Логика весов пересадки:**
- **Air → Ground:** 90 минут (получение багажа, переход из аэропорта в город)
- **Ground → Air:** 120 минут (регистрация, досмотр)
- **Ground → Ground:** 60 минут (пересадка на автобус/такси)
- **Air → Ferry:** 90 минут (переход из аэропорта на пристань)
- **Ferry → Ground:** 30 минут (быстрая пересадка с парома)

### 4.4 Реалистичные маршруты

**Примеры:**
- Москва → Якутск → Н. Бестях → Чурапча
- Москва → Новосибирск → Якутск → Олёкминск

**Требования:**
1. Поддержка многосегментных маршрутов
2. Правильные веса для каждого сегмента
3. Учет времени пересадки

---

## 5. План реализации переправы Якутск—Нижний Бестях

### 5.1 Новые типы остановок

**Файл:** `backend/data/mock/stops.json` (ОБНОВИТЬ)

**Добавить:**
```json
{
  "id": "stop-027",
  "name": "Паромная переправа Нижний Бестях",
  "coordinates": {
    "latitude": 61.9500,
    "longitude": 129.6000
  },
  "type": "ferry_terminal",
  "cityId": "якутск"
},
{
  "id": "stop-028",
  "name": "Пристань Якутск",
  "coordinates": {
    "latitude": 62.0278,
    "longitude": 129.7042
  },
  "type": "ferry_terminal",
  "cityId": "якутск"
}
```

### 5.2 Ferry-маршруты

**Файл:** `backend/data/mock/routes.json` (ОБНОВИТЬ)

**Добавить:**
```json
{
  "id": "route-032",
  "name": "Якутск - Нижний Бестях (Паром)",
  "routeNumber": "FERRY-001",
  "transportType": "FERRY",
  "stops": ["stop-028", "stop-027"],
  "baseFare": 500,
  "distance": 15,
  "duration": 20,
  "metadata": {
    "ferrySchedule": {
      "summer": {
        "start": "06:00",
        "end": "23:00",
        "frequency": 30
      },
      "winter": {
        "start": "07:00",
        "end": "22:00",
        "frequency": 45
      }
    }
  }
},
{
  "id": "route-033",
  "name": "Нижний Бестях - Якутск (Паром)",
  "routeNumber": "FERRY-002",
  "transportType": "FERRY",
  "stops": ["stop-027", "stop-028"],
  "baseFare": 500,
  "distance": 15,
  "duration": 20,
  "metadata": {
    "ferrySchedule": {
      "summer": {
        "start": "06:00",
        "end": "23:00",
        "frequency": 30
      },
      "winter": {
        "start": "07:00",
        "end": "22:00",
        "frequency": 45
      }
    }
  }
}
```

### 5.3 Логика сезонности

**Расчет веса переправы:**
- **Летом:** 20 минут (переправа) + 15-20 минут (ожидание) = **35-40 минут**
- **Зимой:** 20 минут (переправа) + 30-45 минут (ожидание) = **50-65 минут**

### 5.4 Вес переправы и пересадок

**Реализация в `GraphBuilderWorker` (см. раздел 6)**

---

## 6. План по исправлению работы GraphBuilderWorker

### 6.1 Добавление пересадок между транспортами

**Файл:** `backend/src/application/workers/GraphBuilderWorker.ts` (ОБНОВИТЬ)

**Изменения в методе `buildGraphStructure()` (строки ~130-300):**

```typescript
private buildGraphStructure(
  stops: Array<RealStop | VirtualStop>,
  routes: Array<Route | VirtualRoute>,
  flights: Flight[]
): { nodes: GraphNode[]; edges: GraphNeighbor[] } {
  // ... существующий код создания узлов ...
  
  // ШАГ 1: Создаем рёбра из маршрутов
  const edges: GraphNeighbor[] = [];
  
  for (const route of routes) {
    // ... существующий код создания рёбер из маршрутов ...
  }
  
  // ШАГ 2: Создаем рёбра пересадки между остановками в одном городе
  const stopsByCity = new Map<string, Array<RealStop | VirtualStop>>();
  
  for (const stop of stops) {
    const cityId = stop.cityId || extractCityFromStopName(stop.name);
    if (!cityId) continue;
    
    const normalizedCity = normalizeCityName(cityId);
    if (!stopsByCity.has(normalizedCity)) {
      stopsByCity.set(normalizedCity, []);
    }
    stopsByCity.get(normalizedCity)!.push(stop);
  }
  
  // Для каждого города создаем рёбра пересадки между остановками
  for (const [city, cityStops] of stopsByCity.entries()) {
    if (cityStops.length < 2) continue;
    
    // Создаем рёбра пересадки между всеми парами остановок в городе
    for (let i = 0; i < cityStops.length; i++) {
      for (let j = i + 1; j < cityStops.length; j++) {
        const stop1 = cityStops[i];
        const stop2 = cityStops[j];
        
        // Определяем тип пересадки и вес
        const transferWeight = this.calculateTransferWeight(stop1, stop2);
        
        // Создаем двунаправленные рёбра пересадки
        edges.push({
          fromStopId: stop1.id,
          toStopId: stop2.id,
          weight: transferWeight,
          transportType: 'TRANSFER',
          routeId: `transfer-${stop1.id}-${stop2.id}`
        });
        
        edges.push({
          fromStopId: stop2.id,
          toStopId: stop1.id,
          weight: transferWeight,
          transportType: 'TRANSFER',
          routeId: `transfer-${stop2.id}-${stop1.id}`
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Рассчитать вес пересадки между двумя остановками
 */
private calculateTransferWeight(
  stop1: RealStop | VirtualStop,
  stop2: RealStop | VirtualStop
): number {
  const isStop1Airport = stop1.isAirport || stop1.name.toLowerCase().includes('аэропорт');
  const isStop2Airport = stop2.isAirport || stop2.name.toLowerCase().includes('аэропорт');
  const isStop1Ferry = stop1.name.toLowerCase().includes('переправа') || stop1.name.toLowerCase().includes('пристань');
  const isStop2Ferry = stop2.name.toLowerCase().includes('переправа') || stop2.name.toLowerCase().includes('пристань');
  const isStop1Ground = stop1.name.toLowerCase().includes('автостанция') || stop1.name.toLowerCase().includes('вокзал');
  const isStop2Ground = stop2.name.toLowerCase().includes('автостанция') || stop2.name.toLowerCase().includes('вокзал');
  
  // Air → Ground: 90 минут
  if (isStop1Airport && isStop2Ground) {
    return 90;
  }
  
  // Ground → Air: 120 минут
  if (isStop1Ground && isStop2Airport) {
    return 120;
  }
  
  // Air → Ferry: 90 минут
  if (isStop1Airport && isStop2Ferry) {
    return 90;
  }
  
  // Ferry → Ground: 30 минут
  if (isStop1Ferry && isStop2Ground) {
    return 30;
  }
  
  // Ground → Ground: 60 минут
  if (isStop1Ground && isStop2Ground) {
    return 60;
  }
  
  // По умолчанию: 60 минут
  return 60;
}
```

### 6.2 Вес пересадок (разные сценарии)

**Логика расчета веса пересадки:**

| Тип пересадки | Вес (минуты) | Обоснование |
|---------------|--------------|-------------|
| Air → Ground | 90 | Получение багажа, переход из аэропорта в город |
| Ground → Air | 120 | Регистрация, досмотр, переход в аэропорт |
| Ground → Ground | 60 | Пересадка на автобус/такси |
| Air → Ferry | 90 | Переход из аэропорта на пристань |
| Ferry → Ground | 30 | Быстрая пересадка с парома |
| Ferry → Ferry | 20 | Пересадка между паромами (редко) |

### 6.3 Валидация графа (отдельный модуль)

**Файл:** `backend/src/shared/validators/graph-validator.ts` (НОВЫЙ)

```typescript
import type { GraphNode, GraphNeighbor } from '../../domain/repositories/IGraphRepository';

export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    isolatedNodes: number;
    invalidWeights: number;
    disconnectedComponents: number;
  };
}

export function validateGraphStructure(
  nodes: GraphNode[],
  edges: GraphNeighbor[]
): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Статистика
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    isolatedNodes: 0,
    invalidWeights: 0,
    disconnectedComponents: 0
  };
  
  // Проверка 1: Все рёбра имеют корректный вес
  for (const edge of edges) {
    if (edge.weight <= 0 || isNaN(edge.weight) || !isFinite(edge.weight)) {
      errors.push(`Invalid edge weight: ${edge.weight} for edge ${edge.fromStopId} → ${edge.toStopId}`);
      stats.invalidWeights++;
    }
  }
  
  // Проверка 2: Все узлы имеют хотя бы одно входящее или исходящее ребро
  const nodeIds = new Set(nodes.map(n => n.id));
  const connectedNodes = new Set<string>();
  
  for (const edge of edges) {
    connectedNodes.add(edge.fromStopId);
    connectedNodes.add(edge.toStopId);
  }
  
  for (const node of nodes) {
    if (!connectedNodes.has(node.id)) {
      warnings.push(`Isolated node: ${node.id} (${node.name})`);
      stats.isolatedNodes++;
    }
  }
  
  // Проверка 3: Связность графа (BFS от hub-узла "Якутск")
  const hubNode = nodes.find(n => 
    n.cityName && n.cityName.toLowerCase().includes('якутск')
  );
  
  if (hubNode) {
    const reachableNodes = bfsFromNode(hubNode.id, edges);
    if (reachableNodes.size < nodes.length * 0.8) {
      warnings.push(`Graph connectivity issue: only ${reachableNodes.size}/${nodes.length} nodes reachable from hub`);
      stats.disconnectedComponents = nodes.length - reachableNodes.size;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

function bfsFromNode(startNodeId: string, edges: GraphNeighbor[]): Set<string> {
  const visited = new Set<string>();
  const queue = [startNodeId];
  visited.add(startNodeId);
  
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    for (const edge of edges) {
      if (edge.fromStopId === currentNodeId && !visited.has(edge.toStopId)) {
        visited.add(edge.toStopId);
        queue.push(edge.toStopId);
      }
    }
  }
  
  return visited;
}

export function validateTransferEdges(edges: GraphNeighbor[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  for (const edge of edges) {
    if (edge.transportType === 'TRANSFER') {
      // Проверка: вес пересадки в диапазоне 30-120 минут
      if (edge.weight < 30 || edge.weight > 120) {
        errors.push(`Invalid transfer weight: ${edge.weight} minutes (expected 30-120)`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFerryEdges(edges: GraphNeighbor[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  for (const edge of edges) {
    if (edge.transportType === 'FERRY') {
      // Проверка: вес ferry-маршрута в диапазоне 20-65 минут
      if (edge.weight < 20 || edge.weight > 65) {
        errors.push(`Invalid ferry weight: ${edge.weight} minutes (expected 20-65)`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 6.4 Интеграция валидации в GraphBuilderWorker

**Файл:** `backend/src/application/workers/GraphBuilderWorker.ts` (ОБНОВИТЬ)

**Изменения в методе `executeWorkerLogic()` (после построения графа):**

```typescript
import {
  validateGraphStructure,
  validateTransferEdges,
  validateFerryEdges
} from '../../shared/validators/graph-validator';

protected async executeWorkerLogic(): Promise<WorkerExecutionResult> {
  // ... существующий код построения графа ...
  
  // ВАЛИДАЦИЯ ГРАФА
  this.log('INFO', 'Validating graph structure...');
  
  const graphValidation = validateGraphStructure(nodes, edges);
  if (!graphValidation.isValid) {
    this.log('ERROR', `Graph validation failed: ${graphValidation.errors.join(', ')}`);
    // Не прерываем выполнение, но логируем ошибки
  }
  
  if (graphValidation.warnings.length > 0) {
    this.log('WARN', `Graph validation warnings: ${graphValidation.warnings.join(', ')}`);
  }
  
  const transferValidation = validateTransferEdges(edges);
  if (!transferValidation.isValid) {
    this.log('WARN', `Transfer edges validation: ${transferValidation.errors.join(', ')}`);
  }
  
  const ferryValidation = validateFerryEdges(edges);
  if (!ferryValidation.isValid) {
    this.log('WARN', `Ferry edges validation: ${ferryValidation.errors.join(', ')}`);
  }
  
  // ... остальной код сохранения графа ...
}
```

### 6.5 Отладка графа для федеральных городов

**Добавить логирование в `GraphBuilderWorker`:**
- Количество узлов для каждого федерального города
- Количество рёбер, связывающих федеральные города с Якутией
- Проверка связности федеральных городов с hub-узлом (Якутск)

---

## 7. Чёткий список изменений по файлам

### 7.1 Новые файлы для создания

| Файл | Назначение | Приоритет |
|------|------------|-----------|
| `backend/data/reference/airports-reference.json` | Справочник аэропортов | 🔴 КРИТИЧНО |
| `backend/data/reference/suburbs-reference.json` | Справочник пригородов | 🔴 КРИТИЧНО |
| `backend/data/reference/russia-federal-cities-reference.json` | Справочник федеральных городов | 🟠 ВЫСОКИЙ |
| `backend/src/shared/utils/airports-loader.ts` | Загрузка справочника аэропортов | 🔴 КРИТИЧНО |
| `backend/src/shared/utils/suburbs-loader.ts` | Загрузка справочника пригородов | 🔴 КРИТИЧНО |
| `backend/src/shared/utils/unified-cities-loader.ts` | Загрузка объединенного справочника | 🟠 ВЫСОКИЙ |
| `backend/src/shared/validators/stop-validator.ts` | Валидация остановок | 🔴 КРИТИЧНО |
| `backend/src/shared/validators/graph-validator.ts` | Валидация графа | 🟡 СРЕДНИЙ |
| `backend/src/application/workers/AirRouteGeneratorWorker.ts` | Генератор авиамаршрутов | 🟠 ВЫСОКИЙ |

### 7.2 Файлы для обновления

| Файл | Изменения | Приоритет |
|------|-----------|-----------|
| `backend/src/shared/utils/city-normalizer.ts` | Исправить `extractCityFromStopName()` для обработки аэропортов | 🔴 КРИТИЧНО |
| `backend/src/application/workers/ODataSyncWorker.ts` | Добавить нормализацию и валидацию в `parseODataResponse()` | 🔴 КРИТИЧНО |
| `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts` | Использовать `unified-cities-loader`, обновить `ensureCitiesConnectivity()` | 🟠 ВЫСОКИЙ |
| `backend/src/application/workers/GraphBuilderWorker.ts` | Добавить рёбра пересадки, валидацию графа | 🟡 СРЕДНИЙ |
| `backend/src/application/route-builder/RouteGraphBuilder.ts` | Поддержка ferry-маршрутов, пересадок | 🟡 СРЕДНИЙ |
| `backend/data/mock/stops.json` | Добавить остановки для переправы и федеральных городов | 🟠 ВЫСОКИЙ |
| `backend/data/mock/routes.json` | Добавить ferry-маршруты и авиамаршруты из федеральных городов | 🟠 ВЫСОКИЙ |
| `backend/data/mock/flights.json` | Добавить рейсы для новых маршрутов | 🟠 ВЫСОКИЙ |
| `backend/src/infrastructure/workers/initializeWorkers.ts` | Интегрировать `AirRouteGeneratorWorker` | 🟠 ВЫСОКИЙ |

### 7.3 Функции для переписания

| Функция | Файл | Изменения |
|---------|------|-----------|
| `extractCityFromStopName()` | `city-normalizer.ts` | Добавить обработку паттерна "Аэропорт [Город] ([Аэропорт])" |
| `parseODataResponse()` | `ODataSyncWorker.ts` | Добавить нормализацию через справочники, валидацию |
| `generateVirtualStops()` | `VirtualEntitiesGeneratorWorker.ts` | Использовать объединенный справочник, проверять реальные остановки |
| `ensureYakutiaCitiesConnectivity()` | `VirtualEntitiesGeneratorWorker.ts` | Переименовать в `ensureCitiesConnectivity()`, добавить федеральные города |
| `buildGraphStructure()` | `GraphBuilderWorker.ts` | Добавить рёбра пересадки, расчет веса пересадки |
| `calculateWeightWithValidation()` | `GraphBuilderWorker.ts` | Добавить расчет веса для ferry-маршрутов с учетом сезонности |

### 7.4 Структуры данных для расширения

| Структура | Файл | Изменения |
|-----------|------|-----------|
| `TransportType` enum | `domain/entities/Route.ts` | Убедиться, что `FERRY` присутствует |
| `GraphNeighbor` interface | `domain/repositories/IGraphRepository.ts` | Добавить поле `transportType?: string` |
| `Route.metadata` | `domain/entities/Route.ts` | Добавить `ferrySchedule?: { summer: {...}, winter: {...} }` |
| `VirtualRoute` | `domain/entities/VirtualRoute.ts` | Поддержка `FERRY` типа транспорта |

---

## 8. Готовый порядок работ

### Этап 1: Критические исправления (Приоритет: 🔴 КРИТИЧНО)

**Время:** 2-3 дня

#### Задача 1.1: Создать справочники аэропортов и пригородов
- [ ] Создать `backend/data/reference/airports-reference.json`
- [ ] Создать `backend/data/reference/suburbs-reference.json`
- [ ] Создать `backend/src/shared/utils/airports-loader.ts`
- [ ] Создать `backend/src/shared/utils/suburbs-loader.ts`
- [ ] Написать unit-тесты для загрузчиков

#### Задача 1.2: Исправить `extractCityFromStopName()`
- [ ] Импортировать `getCityByAirportName` в `city-normalizer.ts`
- [ ] Добавить обработку паттерна "Аэропорт [Город] ([Аэропорт])"
- [ ] Добавить обработку паттерна "Аэропорт [Город]" (без скобок)
- [ ] Написать unit-тесты для новых паттернов

#### Задача 1.3: Обновить `ODataSyncWorker`
- [ ] Импортировать `getCityByAirportName`, `getMainCityBySuburb`, `isCityInUnifiedReference`
- [ ] Добавить нормализацию через справочники в `parseODataResponse()`
- [ ] Создать `backend/src/shared/validators/stop-validator.ts`
- [ ] Интегрировать валидатор в `parseODataResponse()`
- [ ] Добавить логирование статистики валидации
- [ ] Написать unit-тесты для нормализации и валидации

**Ожидаемый результат:**
- ✅ "Аэропорт Якутск (Туймаада)" → `city_id = "Якутск"`
- ✅ "Нижний Бестях" → `city_id = "Якутск"`
- ✅ "Туймаада" не появляется как отдельный город
- ✅ Мусорные записи фильтруются при загрузке данных

---

### Этап 2: Федеральные города (Приоритет: 🟠 ВЫСОКИЙ)

**Время:** 3-4 дня

#### Задача 2.1: Создать справочник федеральных городов
- [ ] Создать `backend/data/reference/russia-federal-cities-reference.json`
- [ ] Включить 10 федеральных городов с координатами и аэропортами
- [ ] Проверить корректность координат

#### Задача 2.2: Создать объединенный справочник
- [ ] Создать `backend/src/shared/utils/unified-cities-loader.ts`
- [ ] Реализовать `loadUnifiedCitiesReference()`
- [ ] Реализовать `getAllFederalCities()`, `getAllYakutiaCities()`
- [ ] Реализовать `isCityInUnifiedReference()`
- [ ] Написать unit-тесты

#### Задача 2.3: Обновить `VirtualEntitiesGeneratorWorker`
- [ ] Заменить импорты на `unified-cities-loader`
- [ ] Обновить `generateVirtualStops()` для работы с объединенным справочником
- [ ] Переименовать `ensureYakutiaCitiesConnectivity()` → `ensureCitiesConnectivity()`
- [ ] Добавить логику для федеральных городов → Якутия (hub-based)
- [ ] Добавить логику для федеральных городов → федеральные города (прямые)
- [ ] Написать unit-тесты

#### Задача 2.4: Создать `AirRouteGeneratorWorker`
- [ ] Создать `backend/src/application/workers/AirRouteGeneratorWorker.ts`
- [ ] Реализовать генерацию авиамаршрутов из федеральных городов в Якутск
- [ ] Реализовать генерацию рейсов для маршрутов
- [ ] Интегрировать в пайплайн воркеров (`initializeWorkers.ts`)
- [ ] Написать unit-тесты

**Ожидаемый результат:**
- ✅ 10 федеральных городов доступны в системе
- ✅ Маршруты из федеральных городов в Якутию строятся (через Якутск)
- ✅ Маршруты между федеральными городами строятся (прямые)

---

### Этап 3: Смешанные маршруты и переправа (Приоритет: 🟡 СРЕДНИЙ)

**Время:** 4-5 дней

#### Задача 3.1: Расширить mock-данные
- [ ] Добавить остановки для федеральных городов в `stops.json`
- [ ] Добавить остановки для переправы (Якутск, Нижний Бестях) в `stops.json`
- [ ] Добавить авиамаршруты из федеральных городов в `routes.json`
- [ ] Добавить ferry-маршруты (Якутск ↔ Нижний Бестях) в `routes.json`
- [ ] Добавить рейсы для новых маршрутов в `flights.json`

#### Задача 3.2: Обновить `GraphBuilderWorker` для пересадок
- [ ] Добавить группировку остановок по городам
- [ ] Реализовать создание рёбер пересадки между остановками в одном городе
- [ ] Реализовать `calculateTransferWeight()` с разными сценариями
- [ ] Добавить поддержку типа ребра `TRANSFER`
- [ ] Написать unit-тесты

#### Задача 3.3: Обновить `GraphBuilderWorker` для ferry-маршрутов
- [ ] Добавить расчет веса для ferry-маршрутов (20 минут + ожидание)
- [ ] Учесть сезонность (лето/зима) при расчете веса
- [ ] Использовать `metadata.ferrySchedule` для расчета времени ожидания
- [ ] Написать unit-тесты

#### Задача 3.4: Обновить `RouteGraphBuilder`
- [ ] Добавить поддержку `FERRY` типа транспорта
- [ ] Создавать рёбра для ferry-маршрутов с корректным весом
- [ ] Написать unit-тесты

**Ожидаемый результат:**
- ✅ Смешанные маршруты (air + ground + ferry) строятся корректно
- ✅ Переправа Якутск ↔ Нижний Бестях работает как ferry-транспорт
- ✅ Пересадки между транспортами работают с правильными весами

---

### Этап 4: Валидация и оптимизация (Приоритет: 🟡 СРЕДНИЙ)

**Время:** 3-4 дня

#### Задача 4.1: Создать валидатор графа
- [ ] Создать `backend/src/shared/validators/graph-validator.ts`
- [ ] Реализовать `validateGraphStructure()`
- [ ] Реализовать `validateTransferEdges()`
- [ ] Реализовать `validateFerryEdges()`
- [ ] Написать unit-тесты

#### Задача 4.2: Интегрировать валидацию в `GraphBuilderWorker`
- [ ] Вызывать валидацию после построения графа
- [ ] Логировать ошибки и предупреждения
- [ ] Добавить статистику валидации в результат выполнения

#### Задача 4.3: Отладка графа для федеральных городов
- [ ] Добавить логирование количества узлов для каждого федерального города
- [ ] Добавить проверку связности федеральных городов с hub-узлом
- [ ] Добавить метрики для мониторинга

**Ожидаемый результат:**
- ✅ Граф валидируется на корректность узлов и весов
- ✅ Обнаруживаются и логируются проблемы связности
- ✅ Система устойчива к ошибкам

---

## 9. Контр-проверка после внедрения

### 9.1 Чеклист проверки Якутска

- [ ] **Проверка 1:** Якутск появляется в списке доступных городов
  - Запрос: `GET /api/v1/routes/search?from=Якутск&to=Олёкминск`
  - Ожидаемый результат: Маршрут найден, `fromCity = "Якутск"`

- [ ] **Проверка 2:** Остановка "Аэропорт Якутск (Туймаада)" имеет `city_id = "Якутск"`
  - Запрос к БД: `SELECT city_id FROM stops WHERE name LIKE '%Якутск%'`
  - Ожидаемый результат: Все остановки с "Якутск" имеют `city_id = "Якутск"` или `city_id = "якутск"` (нормализованное)

- [ ] **Проверка 3:** "Туймада" не появляется как отдельный город
  - Запрос к БД: `SELECT DISTINCT city_id FROM stops WHERE city_id LIKE '%туйма%'`
  - Ожидаемый результат: Пустой результат или только "Якутск"

### 9.2 Чеклист проверки мусорных городов

- [ ] **Проверка 1:** Нет городов с служебными словами
  - Запрос к БД: `SELECT DISTINCT city_id FROM stops WHERE city_id IN ('центральная', 'главный', 'пассажирский')`
  - Ожидаемый результат: Пустой результат

- [ ] **Проверка 2:** Все города из БД есть в `unified-cities-reference.json`
  - Скрипт: Сравнить `SELECT DISTINCT city_id FROM stops` с `unified-cities-reference.json`
  - Ожидаемый результат: Все `city_id` найдены в справочнике

- [ ] **Проверка 3:** Нет остановок с пустым или некорректным `city_id`
  - Запрос к БД: `SELECT * FROM stops WHERE city_id IS NULL OR city_id = ''`
  - Ожидаемый результат: Пустой результат

### 9.3 Чеклист проверки федеральных городов

- [ ] **Проверка 1:** Москва и другие города доступны в системе
  - Запрос: `GET /api/v1/routes/search?from=Москва&to=Якутск`
  - Ожидаемый результат: Маршрут найден, `fromCity = "Москва"`

- [ ] **Проверка 2:** Виртуальные остановки созданы для федеральных городов
  - Запрос к БД: `SELECT * FROM stops WHERE city_id IN ('москва', 'новосибирск', 'красноярск') AND is_virtual = true`
  - Ожидаемый результат: Виртуальные остановки найдены для всех федеральных городов

- [ ] **Проверка 3:** Маршруты из федеральных городов строятся
  - Запросы:
    - `GET /api/v1/routes/search?from=Москва&to=Олёкминск`
    - `GET /api/v1/routes/search?from=Новосибирск&to=Мирный`
  - Ожидаемый результат: Маршруты найдены, проходят через Якутск (hub)

### 9.4 Чеклист проверки смешанных маршрутов

- [ ] **Проверка 1:** Маршрут "Москва → Якутск → Чурапча" строится
  - Запрос: `GET /api/v1/routes/search?from=Москва&to=Чурапча`
  - Ожидаемый результат: Маршрут найден, содержит сегменты:
    - Москва → Якутск (PLANE)
    - Пересадка в Якутске (TRANSFER, 90 минут)
    - Якутск → Чурапча (BUS)

- [ ] **Проверка 2:** Маршрут "Москва → Якутск → Нижний Бестях" строится
  - Запрос: `GET /api/v1/routes/search?from=Москва&to=Нижний Бестях`
  - Ожидаемый результат: Маршрут найден, содержит сегменты:
    - Москва → Якутск (PLANE)
    - Пересадка в Якутске (TRANSFER, 90 минут)
    - Якутск → Нижний Бестях (FERRY)

- [ ] **Проверка 3:** Маршрут "Москва → Новосибирск → Якутск → Олёкминск" строится
  - Запрос: `GET /api/v1/routes/search?from=Москва&to=Олёкминск`
  - Ожидаемый результат: Маршрут найден, содержит сегменты:
    - Москва → Новосибирск (PLANE, опционально)
    - Новосибирск → Якутск (PLANE)
    - Пересадка в Якутске (TRANSFER, 90 минут)
    - Якутск → Олёкминск (BUS)

### 9.5 Чеклист проверки переправы

- [ ] **Проверка 1:** Переправа Якутск ↔ Нижний Бестях работает
  - Запрос: `GET /api/v1/routes/search?from=Якутск&to=Нижний Бестях`
  - Ожидаемый результат: Маршрут найден, тип транспорта = `FERRY`, вес = 40-65 минут

- [ ] **Проверка 2:** Ferry-маршруты созданы в графе
  - Запрос к Redis: Проверить наличие рёбер с `transportType = "FERRY"`
  - Ожидаемый результат: Рёбра найдены между остановками переправы

- [ ] **Проверка 3:** Учитывается сезонность расписания переправы
  - Проверить расчет веса для лета (35-40 минут) и зимы (50-65 минут)
  - Ожидаемый результат: Вес корректно рассчитывается в зависимости от сезона

### 9.6 Чеклист проверки графа

- [ ] **Проверка 1:** Граф полон и связен
  - Запустить валидацию графа: `validateGraphStructure()`
  - Ожидаемый результат: `isValid = true`, нет изолированных узлов

- [ ] **Проверка 2:** Рёбра пересадки созданы корректно
  - Запустить валидацию: `validateTransferEdges()`
  - Ожидаемый результат: Все рёбра пересадки имеют вес 30-120 минут

- [ ] **Проверка 3:** Ferry-рёбра имеют корректный вес
  - Запустить валидацию: `validateFerryEdges()`
  - Ожидаемый результат: Все ferry-рёбра имеют вес 20-65 минут

- [ ] **Проверка 4:** Все узлы достижимы из hub-узла (Якутск)
  - Запустить BFS от Якутска
  - Ожидаемый результат: Не менее 80% узлов достижимы

### 9.7 Итоговый чеклист

- [ ] ✅ Якутск снова в данных
- [ ] ✅ Нет мусорных городов
- [ ] ✅ Москва и другие города строят маршруты
- [ ] ✅ Смешанные маршруты строятся
- [ ] ✅ Переправа работает
- [ ] ✅ Граф полон и связен
- [ ] ✅ Все тесты проходят
- [ ] ✅ Нет ошибок в логах
- [ ] ✅ Производительность не ухудшилась

---

## 📊 Итоговая сводка

### Время выполнения

- **Этап 1 (Критические исправления):** 2-3 дня
- **Этап 2 (Федеральные города):** 3-4 дня
- **Этап 3 (Смешанные маршруты и переправа):** 4-5 дней
- **Этап 4 (Валидация и оптимизация):** 3-4 дня

**Итого:** 12-16 дней разработки

### Критерии успеха

1. ✅ Якутск появляется в списке доступных городов
2. ✅ "Туймада" не появляется как отдельный город
3. ✅ Мусорные записи фильтруются при загрузке данных
4. ✅ 10 федеральных городов доступны в системе
5. ✅ Маршруты из федеральных городов в Якутию строятся
6. ✅ Смешанные маршруты (air + ground + ferry) строятся корректно
7. ✅ Переправа Якутск ↔ Нижний Бестях работает как ferry-транспорт
8. ✅ Пересадки между транспортами работают корректно
9. ✅ Граф валидируется на корректность узлов и весов
10. ✅ Система устойчива к ошибкам, повторные ошибки не возникают

---

**Конец документа**
