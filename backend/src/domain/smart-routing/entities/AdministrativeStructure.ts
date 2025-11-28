/**
 * Административная структура города
 * 
 * Определяет полную иерархию: Регион → Район → Город
 * 
 * @example
 * ```typescript
 * const admin = new AdministrativeStructure({
 *   subject: {
 *     type: 'republic',
 *     name: 'Республика Саха (Якутия)',
 *     shortName: 'Якутия',
 *     code: 'SA'
 *   },
 *   district: {
 *     type: 'rayon',
 *     name: 'Олёкминский район',
 *     code: 'OLK'
 *   },
 *   settlement: {
 *     type: 'city',
 *     name: 'Олёкминск',
 *     normalizedName: 'олекминск'
 *   }
 * });
 * ```
 */
export interface AdministrativeStructure {
  /**
   * Субъект Федерации
   */
  subject: {
    /**
     * Тип субъекта
     */
    type: 'republic' | 'oblast' | 'kray' | 'autonomous_okrug' | 'federal_city';

    /**
     * Полное название
     */
    name: string;

    /**
     * Краткое название
     */
    shortName: string;

    /**
     * Код субъекта
     */
    code: string;
  };

  /**
   * Район (опционально, для городов районного значения)
   */
  district?: {
    /**
     * Тип района
     */
    type: 'rayon' | 'municipal_district' | 'urban_okrug';

    /**
     * Название района
     */
    name: string;

    /**
     * Код района (опционально)
     */
    code?: string;
  };

  /**
   * Город/Посёлок
   */
  settlement: {
    /**
     * Тип населённого пункта
     */
    type: 'city' | 'town' | 'village' | 'urban_settlement';

    /**
     * Название населённого пункта
     */
    name: string;

    /**
     * Нормализованное название (для поиска)
     */
    normalizedName: string;

    /**
     * Код населённого пункта (опционально)
     */
    code?: string;
  };

  /**
   * Форматированные названия
   */
  formats: {
    /**
     * Полный формат: "Республика Саха (Якутия), Олёкминский район, Олёкминск"
     */
    full: string;

    /**
     * Средний формат: "Олёкминск, Олёкминский район, Якутия"
     */
    medium: string;

    /**
     * Краткий формат: "Олёкминск"
     */
    short: string;

    /**
     * С контекстом: "Олёкминск (Олёкминский район, Якутия)"
     */
    withContext: string;
  };
}

/**
 * Создаёт административную структуру
 */
export function createAdministrativeStructure(
  subject: AdministrativeStructure['subject'],
  settlement: AdministrativeStructure['settlement'],
  district?: AdministrativeStructure['district']
): AdministrativeStructure {
  // Формируем полный формат
  const fullParts: string[] = [subject.name];
  if (district) {
    fullParts.push(district.name);
  }
  fullParts.push(settlement.name);
  const full = fullParts.join(', ');

  // Формируем средний формат
  const mediumParts: string[] = [settlement.name];
  if (district) {
    mediumParts.push(district.name);
  }
  mediumParts.push(subject.shortName);
  const medium = mediumParts.join(', ');

  // Краткий формат
  const short = settlement.name;

  // С контекстом
  const contextParts: string[] = [];
  if (district) {
    contextParts.push(district.name);
  }
  contextParts.push(subject.shortName);
  const withContext = contextParts.length > 0
    ? `${settlement.name} (${contextParts.join(', ')})`
    : settlement.name;

  return {
    subject,
    district,
    settlement,
    formats: {
      full,
      medium,
      short,
      withContext,
    },
  };
}






