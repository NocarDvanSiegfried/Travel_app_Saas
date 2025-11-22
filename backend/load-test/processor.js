/**
 * Artillery processor for load testing
 * 
 * Provides helper functions and data for load tests
 */

const cities = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Новосибирск',
  'Екатеринбург',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
  'Уфа',
  'Красноярск',
  'Воронеж',
  'Пермь',
  'Волгоград',
];

/**
 * Get random city for route search
 */
function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

/**
 * Get random city pair (different cities)
 */
function getRandomCityPair() {
  const city1 = getRandomCity();
  let city2 = getRandomCity();
  while (city2 === city1) {
    city2 = getRandomCity();
  }
  return { city1, city2 };
}

/**
 * Get random date in YYYY-MM-DD format (tomorrow to 30 days ahead)
 */
function getRandomDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const randomDays = Math.floor(Math.random() * 30) + 1;
  const date = new Date(tomorrow);
  date.setDate(date.getDate() + randomDays);
  return date.toISOString().split('T')[0];
}

module.exports = {
  getRandomCity,
  getRandomCityPair,
  getRandomDate,
  // Artillery hooks
  beforeRequest: (requestParams, context, ee, next) => {
    // Replace placeholders with random cities
    if (requestParams.url && requestParams.url.includes('{{ $randomCity }}')) {
      const city = getRandomCity();
      requestParams.url = requestParams.url.replace(/\{\{ \$randomCity \}\}/g, city);
    }
    // Replace placeholders with random dates
    if (requestParams.url && requestParams.url.includes('{{ $randomDate }}')) {
      const date = getRandomDate();
      requestParams.url = requestParams.url.replace(/\{\{ \$randomDate \}\}/g, date);
    }
    return next();
  },
};

