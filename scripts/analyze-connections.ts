/**
 * Скрипт для анализа соединений и поиска проблемных маршрутов
 * 
 * Использование: npx ts-node scripts/analyze-connections.ts
 */

import { ALL_CONNECTIONS } from '../backend/src/domain/smart-routing/data/connections-model';
import { ConnectionsValidator } from '../backend/src/domain/smart-routing/data/connections-validator';
import { ALL_CITIES } from '../backend/src/domain/smart-routing/data/cities-reference';

console.log('🔍 Анализ соединений...\n');

// Статистика по типам транспорта
const stats = {
  airplane: 0,
  train: 0,
  bus: 0,
  ferry: 0,
  winter_road: 0,
};

// Проблемные соединения
const problematic: Array<{
  connection: typeof ALL_CONNECTIONS[0];
  reason: string;
}> = [];

// Анализ всех соединений
for (const connection of ALL_CONNECTIONS) {
  // Статистика
  stats[connection.type]++;

  // Проверка валидации
  const validation = ConnectionsValidator.validateConnection(connection);
  if (!validation.isValid) {
    problematic.push({
      connection,
      reason: validation.reason || 'Неизвестная причина',
    });
  }
}

// Вывод статистики
console.log('📊 Статистика соединений:');
console.log(`  Авиа: ${stats.airplane}`);
console.log(`  ЖД: ${stats.train}`);
console.log(`  Автобус: ${stats.bus}`);
console.log(`  Паром: ${stats.ferry}`);
console.log(`  Зимник: ${stats.winter_road}`);
console.log(`  Всего: ${ALL_CONNECTIONS.length}\n`);

// Вывод проблемных соединений
if (problematic.length > 0) {
  console.log(`⚠️  Найдено ${problematic.length} проблемных соединений:\n`);
  for (const { connection, reason } of problematic) {
    console.log(`  ❌ ${connection.id} (${connection.type})`);
    console.log(`     ${connection.fromCityId} → ${connection.toCityId}`);
    console.log(`     Расстояние: ${connection.distance} км`);
    console.log(`     Причина: ${reason}\n`);
  }
} else {
  console.log('✅ Все соединения валидны!\n');
}

// Проверка автобусных маршрутов > 1500 км
const longBusRoutes = ALL_CONNECTIONS.filter(
  (c) => c.type === 'bus' && c.distance > 1500
);
if (longBusRoutes.length > 0) {
  console.log(`⚠️  Найдено ${longBusRoutes.length} автобусных маршрутов > 1500 км:\n`);
  for (const route of longBusRoutes) {
    console.log(`  ❌ ${route.id}: ${route.fromCityId} → ${route.toCityId} (${route.distance} км)\n`);
  }
}

// Проверка прямых авиарейсов между малыми аэропортами
const smallAirports = ALL_CITIES.filter(
  (c) =>
    c.infrastructure.hasAirport &&
    c.infrastructure.airportClass === 'D' &&
    !c.isHub
);

const directFlightsBetweenSmallAirports = ALL_CONNECTIONS.filter((c) => {
  if (c.type !== 'airplane' || !c.isDirect) {
    return false;
  }
  const fromCity = ALL_CITIES.find((city) => city.id === c.fromCityId);
  const toCity = ALL_CITIES.find((city) => city.id === c.toCityId);
  if (!fromCity || !toCity) {
    return false;
  }
  const fromIsSmall = smallAirports.some((sa) => sa.id === fromCity.id);
  const toIsSmall = smallAirports.some((sa) => sa.id === toCity.id);
  return fromIsSmall && toIsSmall && c.distance > 500;
});

if (directFlightsBetweenSmallAirports.length > 0) {
  console.log(
    `⚠️  Найдено ${directFlightsBetweenSmallAirports.length} прямых авиарейсов между малыми аэропортами:\n`
  );
  for (const route of directFlightsBetweenSmallAirports) {
    console.log(
      `  ❌ ${route.id}: ${route.fromCityId} → ${route.toCityId} (${route.distance} км)\n`
    );
  }
}

// Проверка связности
const cityIds = new Set<string>();
ALL_CONNECTIONS.forEach((c) => {
  cityIds.add(c.fromCityId);
  cityIds.add(c.toCityId);
});

console.log(`\n📈 Статистика связности:`);
console.log(`  Уникальных городов в соединениях: ${cityIds.size}`);
console.log(`  Всего городов в справочнике: ${ALL_CITIES.length}`);

// Поиск изолированных городов
const connectedCities = new Set<string>();
ALL_CONNECTIONS.forEach((c) => {
  connectedCities.add(c.fromCityId);
  connectedCities.add(c.toCityId);
});

const isolatedCities = ALL_CITIES.filter((c) => !connectedCities.has(c.id));
if (isolatedCities.length > 0) {
  console.log(`\n⚠️  Найдено ${isolatedCities.length} изолированных городов:\n`);
  for (const city of isolatedCities) {
    console.log(`  ❌ ${city.id}: ${city.name}`);
  }
} else {
  console.log(`\n✅ Все города связаны!`);
}

console.log('\n✅ Анализ завершён!');






