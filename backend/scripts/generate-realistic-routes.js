/**
 * Скрипт для генерации реалистичных маршрутов между городами Якутии
 * 
 * Использует yakutia-cities-reference.json как источник правды
 * Генерирует маршруты с реалистичными ценами и временами на основе расстояний
 */

const fs = require('fs');
const path = require('path');

// Импорт функции расчета расстояния (упрощенная версия для Node.js)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радиус Земли в километрах
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Параметры для расчета оценок
const TRANSPORT_PARAMS = {
  PLANE: {
    averageSpeed: 550,
    pricePerKm: { min: 10, max: 15 },
    overheadTime: 30,
  },
  BUS: {
    averageSpeed: 65,
    pricePerKm: { min: 3, max: 4 },
    overheadTime: 0,
  },
};

function estimateRouteDuration(distance, transportType) {
  const params = TRANSPORT_PARAMS[transportType];
  const travelTime = (distance / params.averageSpeed) * 60;
  return Math.round(travelTime + params.overheadTime);
}

function estimateRoutePrice(distance, transportType) {
  const params = TRANSPORT_PARAMS[transportType];
  const minPrice = Math.round(distance * params.pricePerKm.min);
  const maxPrice = Math.round(distance * params.pricePerKm.max);
  return Math.round((minPrice + maxPrice) / 2);
}

function getOptimalTransportType(distance) {
  if (distance < 200) return 'BUS';
  if (distance < 500) return 'BUS'; // В Якутии для средних расстояний часто автобус
  return 'PLANE';
}

// Загружаем справочник городов
const citiesRefPath = path.join(__dirname, '../data/mock/yakutia-cities-reference.json');
const citiesRef = JSON.parse(fs.readFileSync(citiesRefPath, 'utf-8'));

// Загружаем текущие stops.json для маппинга
const stopsPath = path.join(__dirname, '../data/mock/stops.json');
const stops = JSON.parse(fs.readFileSync(stopsPath, 'utf-8'));

// Создаем маппинг: название города -> ID остановок
const cityToStops = new Map();
for (const stop of stops) {
  const cityName = extractCityFromStopName(stop.name);
  if (cityName) {
    if (!cityToStops.has(cityName)) {
      cityToStops.set(cityName, []);
    }
    cityToStops.get(cityName).push(stop.id);
  }
}

function extractCityFromStopName(stopName) {
  // Упрощенная логика извлечения города
  const words = stopName.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g);
  if (!words || words.length === 0) return null;
  
  const stopTypeWords = new Set(['аэропорт', 'вокзал', 'автостанция', 'автовокзал', 'остановка', 'станция', 'порт']);
  const lastWord = words[words.length - 1].toLowerCase();
  
  if (!stopTypeWords.has(lastWord) && words.length > 1) {
    return words[words.length - 1];
  } else if (words.length > 1) {
    return words[0];
  }
  return words[0];
}

// Генерируем маршруты для всех пар городов Якутии
const newRoutes = [];
const newFlights = [];
let routeIdCounter = 28; // Продолжаем нумерацию с существующих маршрутов
let flightIdCounter = 33; // Продолжаем нумерацию с существующих рейсов

const yakutiaCities = citiesRef.cities.filter(city => {
  // Исключаем города вне Якутии (Москва, Иркутск и т.д.)
  const nonYakutiaCities = ['Москва', 'Иркутск', 'Новосибирск', 'Санкт-Петербург', 'Красноярск'];
  return !nonYakutiaCities.some(nonYakutia => city.name.includes(nonYakutia));
});

for (let i = 0; i < yakutiaCities.length; i++) {
  for (let j = i + 1; j < yakutiaCities.length; j++) {
    const city1 = yakutiaCities[i];
    const city2 = yakutiaCities[j];
    
    // Находим остановки для городов
    const stops1 = cityToStops.get(city1.name) || [];
    const stops2 = cityToStops.get(city2.name) || [];
    
    if (stops1.length === 0 || stops2.length === 0) {
      console.warn(`No stops found for ${city1.name} or ${city2.name}`);
      continue;
    }
    
    // Выбираем основные остановки (аэропорт или автостанция)
    const stop1 = stops1.find(s => {
      const stop = stops.find(st => st.id === s);
      return stop && (stop.type === 'airport' || stop.type === 'bus_station');
    }) || stops1[0];
    
    const stop2 = stops2.find(s => {
      const stop = stops.find(st => st.id === s);
      return stop && (stop.type === 'airport' || stop.type === 'bus_station');
    }) || stops2[0];
    
    const stop1Data = stops.find(s => s.id === stop1);
    const stop2Data = stops.find(s => s.id === stop2);
    
    if (!stop1Data || !stop2Data) continue;
    
    // Рассчитываем расстояние
    const distance = calculateHaversineDistance(
      stop1Data.coordinates.latitude,
      stop1Data.coordinates.longitude,
      stop2Data.coordinates.latitude,
      stop2Data.coordinates.longitude
    );
    
    // Определяем тип транспорта
    const transportType = getOptimalTransportType(distance);
    
    // Рассчитываем время и цену
    const duration = estimateRouteDuration(distance, transportType);
    const price = estimateRoutePrice(distance, transportType);
    
    // Генерируем маршрут
    const routeId = `route-${String(routeIdCounter).padStart(3, '0')}`;
    const routeNumber = transportType === 'PLANE' 
      ? `${city1.name.substring(0, 3).toUpperCase()}-${city2.name.substring(0, 3).toUpperCase()}`
      : String(100 + routeIdCounter);
    
    newRoutes.push({
      id: routeId,
      name: `${city1.name} - ${city2.name} (${transportType === 'PLANE' ? 'Авиа' : 'Автобус'})`,
      routeNumber: routeNumber,
      transportType: transportType,
      stops: [stop1, stop2],
      baseFare: price,
    });
    
    // Генерируем 2-3 рейса для маршрута
    const departureTimes = transportType === 'PLANE' 
      ? ['06:00', '10:30', '14:00']
      : ['07:00', '08:30', '12:00'];
    
    for (let k = 0; k < Math.min(2, departureTimes.length); k++) {
      const [hours, minutes] = departureTimes[k].split(':').map(Number);
      const departureDate = new Date();
      departureDate.setHours(hours, minutes, 0, 0);
      
      const arrivalDate = new Date(departureDate);
      arrivalDate.setMinutes(arrivalDate.getMinutes() + duration);
      
      newFlights.push({
        id: `flight-${String(flightIdCounter).padStart(3, '0')}`,
        routeId: routeId,
        departureTime: departureDate.toISOString(),
        arrivalTime: arrivalDate.toISOString(),
        fromStopId: stop1,
        toStopId: stop2,
        price: price,
        availableSeats: transportType === 'PLANE' ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 30) + 20,
      });
      
      flightIdCounter++;
    }
    
    routeIdCounter++;
  }
}

console.log(`Generated ${newRoutes.length} new routes and ${newFlights.length} new flights`);

// Загружаем существующие данные
const routesPath = path.join(__dirname, '../data/mock/routes.json');
const flightsPath = path.join(__dirname, '../data/mock/flights.json');

const existingRoutes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
const existingFlights = JSON.parse(fs.readFileSync(flightsPath, 'utf-8'));

// Объединяем существующие и новые маршруты (убираем дубликаты)
const allRoutes = [...existingRoutes];
const existingRouteKeys = new Set(existingRoutes.map(r => `${r.stops[0]}-${r.stops[r.stops.length - 1]}`));

for (const route of newRoutes) {
  const key = `${route.stops[0]}-${route.stops[route.stops.length - 1]}`;
  if (!existingRouteKeys.has(key)) {
    allRoutes.push(route);
    existingRouteKeys.add(key);
  }
}

// Объединяем рейсы
const allFlights = [...existingFlights, ...newFlights];

// Сохраняем обновленные данные
fs.writeFileSync(routesPath, JSON.stringify(allRoutes, null, 2), 'utf-8');
fs.writeFileSync(flightsPath, JSON.stringify(allFlights, null, 2), 'utf-8');

console.log(`Total routes: ${allRoutes.length}, Total flights: ${allFlights.length}`);
console.log('Files updated successfully!');









