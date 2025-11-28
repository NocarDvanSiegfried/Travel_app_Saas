/**
 * Координаты географической точки
 * 
 * @example
 * ```typescript
 * const coords = new Coordinates(62.0278, 129.7042);
 * ```
 */
export class Coordinates {
  constructor(
    /**
     * Широта в градусах (-90 до 90)
     */
    public readonly latitude: number,

    /**
     * Долгота в градусах (-180 до 180)
     */
    public readonly longitude: number
  ) {
    this.validate();
  }

  /**
   * Валидация координат
   */
  private validate(): void {
    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error(`Coordinates: invalid latitude ${this.latitude}. Must be between -90 and 90.`);
    }

    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error(`Coordinates: invalid longitude ${this.longitude}. Must be between -180 and 180.`);
    }
  }

  /**
   * Вычисляет расстояние до другой точки по формуле Haversine (в км)
   */
  public distanceTo(other: Coordinates): number {
    const R = 6371; // Радиус Земли в километрах
    const dLat = this.toRad(other.latitude - this.latitude);
    const dLon = this.toRad(other.longitude - this.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(this.latitude)) *
        Math.cos(this.toRad(other.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Преобразует градусы в радианы
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Преобразует в массив [longitude, latitude] для GeoJSON
   */
  public toGeoJSON(): [number, number] {
    return [this.longitude, this.latitude];
  }

  /**
   * Преобразует в объект для сериализации
   */
  public toJSON(): { latitude: number; longitude: number } {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}






