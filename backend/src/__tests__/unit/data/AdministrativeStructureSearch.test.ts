/**
 * Тесты для поиска городов с учётом административной структуры
 * 
 * Проверяет:
 * - Поиск по городу
 * - Поиск по району
 * - Поиск по региону
 * - Поиск в формате "Регион → Район → Город"
 * - Приоритеты результатов поиска
 */

import { searchCities } from '../../../domain/smart-routing/data/cities-reference';
import { getCityById } from '../../../domain/smart-routing/data/cities-reference';

describe('AdministrativeStructure - Поиск городов', () => {
  describe('searchCities - многоуровневый поиск', () => {
    it('should find city by exact name', () => {
      const results = searchCities('Олёкминск');
      
      expect(results.length).toBeGreaterThan(0);
      const olekminsk = results.find(c => c.id === 'olekminsk');
      expect(olekminsk).toBeDefined();
      expect(olekminsk?.name).toBe('Олёкминск');
    });

    it('should find city by full administrative format', () => {
      const results = searchCities('Республика Саха (Якутия), Олёкминский район, Олёкминск');
      
      expect(results.length).toBeGreaterThan(0);
      const olekminsk = results.find(c => c.id === 'olekminsk');
      expect(olekminsk).toBeDefined();
    });

    it('should find cities by district name', () => {
      const results = searchCities('Олёкминский район');
      
      expect(results.length).toBeGreaterThan(0);
      // Должны найтись все города в Олёкминском районе
      const olekminsk = results.find(c => c.id === 'olekminsk');
      expect(olekminsk).toBeDefined();
    });

    it('should find cities by region name', () => {
      const results = searchCities('Якутия');
      
      expect(results.length).toBeGreaterThan(0);
      // Должны найтись все города в Якутии
      const yakutsk = results.find(c => c.id === 'yakutsk');
      expect(yakutsk).toBeDefined();
    });

    it('should find city by name with context', () => {
      const results = searchCities('Олёкминск (Олёкминский район, Якутия)');
      
      expect(results.length).toBeGreaterThan(0);
      const olekminsk = results.find(c => c.id === 'olekminsk');
      expect(olekminsk).toBeDefined();
    });

    it('should prioritize exact matches over partial matches', () => {
      const results = searchCities('Олёкминск');
      
      // Точное совпадение должно быть первым
      expect(results[0].id).toBe('olekminsk');
    });

    it('should find city by synonym', () => {
      const results = searchCities('Olyokminsk');
      
      expect(results.length).toBeGreaterThan(0);
      const olekminsk = results.find(c => c.id === 'olekminsk');
      expect(olekminsk).toBeDefined();
    });

    it('should return empty array for empty query', () => {
      const results = searchCities('');
      
      expect(results).toEqual([]);
    });

    it('should return empty array for non-existent city', () => {
      const results = searchCities('НесуществующийГород12345');
      
      expect(results).toEqual([]);
    });
  });

  describe('Administrative structure in City entity', () => {
    it('should have administrative structure in City', () => {
      const cityRef = getCityById('olekminsk');
      
      expect(cityRef).toBeDefined();
      expect(cityRef?.administrative).toBeDefined();
      expect(cityRef?.administrative.subject).toBeDefined();
      expect(cityRef?.administrative.settlement).toBeDefined();
      expect(cityRef?.administrative.district).toBeDefined();
    });

    it('should have full format in administrative structure', () => {
      const cityRef = getCityById('olekminsk');
      
      expect(cityRef).toBeDefined();
      expect(cityRef?.administrative.formats.full).toContain('Олёкминск');
      expect(cityRef?.administrative.formats.full).toContain('Олёкминский район');
      expect(cityRef?.administrative.formats.full).toContain('Якутия');
    });

    it('should have context format in administrative structure', () => {
      const cityRef = getCityById('olekminsk');
      
      expect(cityRef).toBeDefined();
      expect(cityRef?.administrative.formats.withContext).toContain('Олёкминск');
      expect(cityRef?.administrative.formats.withContext).toContain('Олёкминский район');
    });

    it('should have medium format in administrative structure', () => {
      const cityRef = getCityById('olekminsk');
      
      expect(cityRef).toBeDefined();
      expect(cityRef?.administrative.formats.medium).toContain('Олёкминск');
      expect(cityRef?.administrative.formats.medium).toContain('Якутия');
    });

    it('should have short format in administrative structure', () => {
      const cityRef = getCityById('olekminsk');
      
      expect(cityRef).toBeDefined();
      expect(cityRef?.administrative.formats.short).toBe('Олёкминск');
    });
  });

  describe('Search priority and relevance', () => {
    it('should return results sorted by priority', () => {
      const results = searchCities('Олёкминск');
      
      // Точное совпадение должно быть первым
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('olekminsk');
    });

    it('should find multiple cities in same district', () => {
      const results = searchCities('Олёкминский район');
      
      // Должны найтись все города в Олёкминском районе
      expect(results.length).toBeGreaterThan(0);
      const allInDistrict = results.every(c => 
        c.administrative.district?.name === 'Олёкминский район'
      );
      expect(allInDistrict).toBe(true);
    });

    it('should find multiple cities in same region', () => {
      const results = searchCities('Якутия');
      
      // Должны найтись все города в Якутии
      expect(results.length).toBeGreaterThan(0);
      const allInRegion = results.every(c => 
        c.administrative.subject.shortName === 'Якутия' ||
        c.administrative.subject.name.includes('Якутия')
      );
      expect(allInRegion).toBe(true);
    });
  });
});






