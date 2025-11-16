/**
 * Сервис для работы с метаданными OData
 */

import { ODataMetadataParser, IODataMetadata, IODataEntityType, IODataEntitySet } from './ODataMetadataParser';
import { ODataClient } from '../odata-client';
import { ICacheService } from '../../../cache/ICacheService';

export class ODataMetadataService {
  private metadata: IODataMetadata | null = null;
  private metadataCacheKey = 'odata:metadata';

  constructor(
    private readonly odataClient: ODataClient,
    private readonly cache?: ICacheService
  ) {}

  /**
   * Загрузить метаданные
   */
  async loadMetadata(forceReload: boolean = false): Promise<IODataMetadata> {
    if (!forceReload && this.metadata) {
      return this.metadata;
    }

    if (this.cache && !forceReload) {
      const cached = await this.cache.get<IODataMetadata>(this.metadataCacheKey);
      if (cached) {
        this.metadata = cached;
        return cached;
      }
    }

    const metadataUrl = this.buildMetadataUrl();
    const response = await this.odataClient.makeRequest(metadataUrl);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to load metadata: HTTP ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let xmlText: string;
    
    if (contentType.includes('xml')) {
      xmlText = await response.text();
    } else {
      // Попробуем как текст, если content-type не указан
      xmlText = await response.text();
    }

    if (!xmlText || xmlText.trim().length === 0) {
      throw new Error('Metadata XML is empty');
    }

    const parser = new ODataMetadataParser();
    const parsedMetadata = await parser.parseMetadata(xmlText);

    this.metadata = parsedMetadata;

    if (this.cache) {
      await this.cache.set(this.metadataCacheKey, parsedMetadata, 86400);
    }

    return parsedMetadata;
  }

  /**
   * Получить EntityType по имени
   */
  async getEntityType(entityTypeName: string): Promise<IODataEntityType | null> {
    const metadata = await this.loadMetadata();

    for (const schema of metadata['edmx:Edmx']['edmx:DataServices'].Schema) {
      const entityType = schema.EntityType.find(
        (et) => et.Name === entityTypeName || `${schema.Namespace}.${et.Name}` === entityTypeName
      );
      if (entityType) {
        return entityType;
      }
    }

    return null;
  }

  /**
   * Получить EntitySet по имени
   */
  async getEntitySet(entitySetName: string): Promise<IODataEntitySet | null> {
    const metadata = await this.loadMetadata();

    for (const schema of metadata['edmx:Edmx']['edmx:DataServices'].Schema) {
      const entitySet = schema.EntityContainer.EntitySet.find(
        (es) => es.Name === entitySetName
      );
      if (entitySet) {
        return entitySet;
      }
    }

    return null;
  }

  /**
   * Получить EntityType для EntitySet
   */
  async getEntityTypeForSet(entitySetName: string): Promise<IODataEntityType | null> {
    const entitySet = await this.getEntitySet(entitySetName);
    if (!entitySet) {
      return null;
    }

    return this.getEntityType(entitySet.EntityType);
  }

  /**
   * Проверить существование свойства в EntityType
   */
  async validateProperty(
    entityTypeName: string,
    propertyName: string
  ): Promise<boolean> {
    const entityType = await this.getEntityType(entityTypeName);
    if (!entityType) {
      return false;
    }

    return entityType.Property.some((p) => p.Name === propertyName);
  }

  /**
   * Получить тип свойства
   */
  async getPropertyType(
    entityTypeName: string,
    propertyName: string
  ): Promise<string | null> {
    const entityType = await this.getEntityType(entityTypeName);
    if (!entityType) {
      return null;
    }

    const property = entityType.Property.find((p) => p.Name === propertyName);
    return property ? property.Type : null;
  }

  /**
   * Построить URL для метаданных
   */
  private buildMetadataUrl(): string {
    let baseUrl = this.odataClient.getBaseUrl().trim();
    baseUrl = baseUrl.replace(/\s+/g, '');
    baseUrl = baseUrl.replace(/\/+$/, '');

    if (!baseUrl.match(/^https?:\/\//i)) {
      throw new Error(`Invalid baseUrl format: ${baseUrl}. Must start with http:// or https://`);
    }

    // Убеждаемся, что $metadata добавляется корректно
    const metadataPath = baseUrl.endsWith('/$metadata') ? '' : '/$metadata';
    return `${baseUrl}${metadataPath}`;
  }

  /**
   * Инвалидировать кеш метаданных
   */
  async invalidateMetadataCache(): Promise<void> {
    this.metadata = null;
    if (this.cache) {
      await this.cache.delete(this.metadataCacheKey);
    }
  }
}

