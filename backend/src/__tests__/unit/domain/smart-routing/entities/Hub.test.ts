/**
 * Unit Tests: Hub
 * 
 * Тесты для Entity хаба.
 * Цель: 95-100% покрытие кода.
 * 
 * Проверяет:
 * - Создание хаба
 * - Связи с другими хабами
 * - Расписание
 * - Методы хаба (isFederal, isRegional, isAvailableOnDate, getAllConnections, hasConnection)
 * - Граничные условия
 * - Негативные сценарии
 */

import { Hub } from '../../../../../domain/smart-routing/entities/Hub';
import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../../../domain/smart-routing/enums/HubLevel';
import { YAKUTSK_HUB, MIRNY_HUB, MOSCOW_HUB } from '../../../../fixtures/hubs';

describe('Hub', () => {
  describe('constructor', () => {
    it('should create hub with valid parameters', () => {
      const hub = new Hub(
        'test-hub',
        'Тестовый хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'daily',
        }
      );

      expect(hub.id).toBe('test-hub');
      expect(hub.name).toBe('Тестовый хаб');
      expect(hub.level).toBe(HubLevel.REGIONAL);
      expect(hub.coordinates).toBeDefined();
      expect(hub.connections).toBeDefined();
      expect(hub.schedule).toBeDefined();
    });

    it('should create hub with airport code', () => {
      const hub = new Hub(
        'test-hub',
        'Тестовый хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'daily',
        },
        'YAK'
      );

      expect(hub.airportCode).toBe('YAK');
    });

    it('should throw error for empty id', () => {
      expect(() => {
        new Hub(
          '',
          'Хаб',
          HubLevel.REGIONAL,
          new Coordinates(62.0278, 129.7042),
          {
            federal: [],
            regional: [],
            local: [],
          },
          {
            frequency: 'daily',
          }
        );
      }).toThrow('Hub: id is required');
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new Hub(
          'test-hub',
          '',
          HubLevel.REGIONAL,
          new Coordinates(62.0278, 129.7042),
          {
            federal: [],
            regional: [],
            local: [],
          },
          {
            frequency: 'daily',
          }
        );
      }).toThrow('Hub: name is required');
    });

    it('should throw error for seasonal frequency without season', () => {
      expect(() => {
        new Hub(
          'test-hub',
          'Хаб',
          HubLevel.REGIONAL,
          new Coordinates(62.0278, 129.7042),
          {
            federal: [],
            regional: [],
            local: [],
          },
          {
            frequency: 'seasonal',
            // season missing
          }
        );
      }).toThrow('Hub: season is required when frequency is seasonal');
    });

    it('should throw error for invalid days (less than 1)', () => {
      expect(() => {
        new Hub(
          'test-hub',
          'Хаб',
          HubLevel.REGIONAL,
          new Coordinates(62.0278, 129.7042),
          {
            federal: [],
            regional: [],
            local: [],
          },
          {
            frequency: 'weekly',
            days: [0, 1, 2], // 0 is invalid
          }
        );
      }).toThrow(/invalid days/);
    });

    it('should throw error for invalid days (greater than 7)', () => {
      expect(() => {
        new Hub(
          'test-hub',
          'Хаб',
          HubLevel.REGIONAL,
          new Coordinates(62.0278, 129.7042),
          {
            federal: [],
            regional: [],
            local: [],
          },
          {
            frequency: 'weekly',
            days: [1, 2, 8], // 8 is invalid
          }
        );
      }).toThrow(/invalid days/);
    });
  });

  describe('isFederal', () => {
    it('should return true for federal hub', () => {
      const hub = MOSCOW_HUB;
      expect(hub.isFederal()).toBe(true);
    });

    it('should return false for regional hub', () => {
      const hub = YAKUTSK_HUB;
      expect(hub.isRegional()).toBe(true);
      expect(hub.isFederal()).toBe(false);
    });
  });

  describe('isRegional', () => {
    it('should return true for regional hub', () => {
      const hub = YAKUTSK_HUB;
      expect(hub.isRegional()).toBe(true);
    });

    it('should return false for federal hub', () => {
      const hub = MOSCOW_HUB;
      expect(hub.isFederal()).toBe(true);
      expect(hub.isRegional()).toBe(false);
    });
  });

  describe('isAvailableOnDate', () => {
    it('should return true for daily frequency on any date', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'daily',
        }
      );

      const dates = [
        new Date('2024-01-15'),
        new Date('2024-06-15'),
        new Date('2024-12-25'),
      ];

      dates.forEach((date) => {
        expect(hub.isAvailableOnDate(date)).toBe(true);
      });
    });

    it('should return true for weekly frequency on specified days', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'weekly',
          days: [1, 3, 5], // Понедельник, среда, пятница
        }
      );

      // Понедельник (2024-01-15 - понедельник)
      expect(hub.isAvailableOnDate(new Date('2024-01-15'))).toBe(true);
      
      // Вторник (2024-01-16 - вторник)
      expect(hub.isAvailableOnDate(new Date('2024-01-16'))).toBe(false);
    });

    it('should handle Sunday correctly (converted to 7)', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'weekly',
          days: [7], // Воскресенье
        }
      );

      // Воскресенье (2024-01-14 - воскресенье)
      expect(hub.isAvailableOnDate(new Date('2024-01-14'))).toBe(true);
    });

    it('should return true for seasonal frequency within season', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'seasonal',
          season: {
            start: '2024-06-01',
            end: '2024-10-18',
          },
        }
      );

      const dateInSeason = new Date('2024-07-15');
      const dateBeforeSeason = new Date('2024-05-31');
      const dateAfterSeason = new Date('2024-10-19');

      expect(hub.isAvailableOnDate(dateInSeason)).toBe(true);
      expect(hub.isAvailableOnDate(dateBeforeSeason)).toBe(false);
      expect(hub.isAvailableOnDate(dateAfterSeason)).toBe(false);
    });

    it('should return true for seasonal frequency on start date', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'seasonal',
          season: {
            start: '2024-06-01',
            end: '2024-10-18',
          },
        }
      );

      expect(hub.isAvailableOnDate(new Date('2024-06-01'))).toBe(true);
    });

    it('should return true for seasonal frequency on end date', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'seasonal',
          season: {
            start: '2024-06-01',
            end: '2024-10-18',
          },
        }
      );

      expect(hub.isAvailableOnDate(new Date('2024-10-18'))).toBe(true);
    });
  });

  describe('getAllConnections', () => {
    it('should return all connections from all categories', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: ['moscow-hub', 'novosibirsk-hub'],
          regional: ['mirny-hub'],
          local: ['srednekolymsk-airport'],
        },
        {
          frequency: 'daily',
        }
      );

      const connections = hub.getAllConnections();
      expect(connections).toHaveLength(4);
      expect(connections).toContain('moscow-hub');
      expect(connections).toContain('novosibirsk-hub');
      expect(connections).toContain('mirny-hub');
      expect(connections).toContain('srednekolymsk-airport');
    });

    it('should return empty array for hub without connections', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'daily',
        }
      );

      const connections = hub.getAllConnections();
      expect(connections).toHaveLength(0);
    });
  });

  describe('hasConnection', () => {
    it('should return true for existing connection', () => {
      const hub = YAKUTSK_HUB;
      const connections = hub.getAllConnections();
      
      if (connections.length > 0) {
        expect(hub.hasConnection(connections[0])).toBe(true);
      }
    });

    it('should return false for non-existing connection', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: [],
          regional: [],
          local: [],
        },
        {
          frequency: 'daily',
        }
      );

      expect(hub.hasConnection('non-existing-hub')).toBe(false);
    });

    it('should check connections in all categories', () => {
      const hub = new Hub(
        'test-hub',
        'Хаб',
        HubLevel.REGIONAL,
        new Coordinates(62.0278, 129.7042),
        {
          federal: ['moscow-hub'],
          regional: ['mirny-hub'],
          local: ['srednekolymsk-airport'],
        },
        {
          frequency: 'daily',
        }
      );

      expect(hub.hasConnection('moscow-hub')).toBe(true);
      expect(hub.hasConnection('mirny-hub')).toBe(true);
      expect(hub.hasConnection('srednekolymsk-airport')).toBe(true);
      expect(hub.hasConnection('non-existing')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize hub to JSON', () => {
      const hub = YAKUTSK_HUB;
      const json = hub.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('level');
      expect(json).toHaveProperty('coordinates');
      expect(json).toHaveProperty('connections');
      expect(json).toHaveProperty('schedule');
    });
  });
});




