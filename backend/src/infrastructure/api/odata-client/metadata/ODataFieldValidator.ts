/**
 * Валидатор полей на основе метаданных OData
 */

import { ODataMetadataService } from './ODataMetadataService';
import { IODataQueryParams } from '../types';

export class ODataFieldValidator {
  constructor(private readonly metadataService: ODataMetadataService) {}

  /**
   * Валидировать параметры запроса на основе метаданных
   */
  async validateQueryParams(
    entitySetName: string,
    params: IODataQueryParams
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const entityType = await this.metadataService.getEntityTypeForSet(
      entitySetName
    );

    if (!entityType) {
      return {
        valid: false,
        errors: [`EntitySet ${entitySetName} not found in metadata`],
      };
    }

    if (params.$select) {
      const selectErrors = await this.validateSelect(
        entityType.Name,
        params.$select
      );
      errors.push(...selectErrors);
    }

    if (params.$filter) {
      const filterErrors = await this.validateFilter(
        entityType.Name,
        params.$filter
      );
      errors.push(...filterErrors);
    }

    if (params.$orderby) {
      const orderByErrors = await this.validateOrderBy(
        entityType.Name,
        params.$orderby
      );
      errors.push(...orderByErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Валидировать $select параметр
   */
  private async validateSelect(
    entityTypeName: string,
    select: string
  ): Promise<string[]> {
    const errors: string[] = [];
    const fields = select.split(',').map((f) => f.trim());

    for (const field of fields) {
      const isValid = await this.metadataService.validateProperty(
        entityTypeName,
        field
      );
      if (!isValid) {
        errors.push(`Property '${field}' not found in ${entityTypeName}`);
      }
    }

    return errors;
  }

  /**
   * Валидировать $filter параметр
   */
  private async validateFilter(
    entityTypeName: string,
    filter: string
  ): Promise<string[]> {
    const errors: string[] = [];

    const propertyPattern = /(\w+)\s+(eq|ne|gt|ge|lt|le|and|or|not)/gi;
    const matches = filter.matchAll(propertyPattern);

    for (const match of matches) {
      const propertyName = match[1];
      if (propertyName && !['and', 'or', 'not'].includes(propertyName.toLowerCase())) {
        const isValid = await this.metadataService.validateProperty(
          entityTypeName,
          propertyName
        );
        if (!isValid) {
          errors.push(`Property '${propertyName}' in filter not found in ${entityTypeName}`);
        }
      }
    }

    return errors;
  }

  /**
   * Валидировать $orderby параметр
   */
  private async validateOrderBy(
    entityTypeName: string,
    orderBy: string
  ): Promise<string[]> {
    const errors: string[] = [];
    const fields = orderBy.split(',').map((f) => {
      const parts = f.trim().split(/\s+/);
      return parts[0];
    });

    for (const field of fields) {
      const isValid = await this.metadataService.validateProperty(
        entityTypeName,
        field
      );
      if (!isValid) {
        errors.push(`Property '${field}' in orderby not found in ${entityTypeName}`);
      }
    }

    return errors;
  }

  /**
   * Валидировать поля объекта на основе метаданных
   */
  async validateEntity(
    entitySetName: string,
    entity: Record<string, unknown>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const entityType = await this.metadataService.getEntityTypeForSet(
      entitySetName
    );

    if (!entityType) {
      return {
        valid: false,
        errors: [`EntitySet ${entitySetName} not found in metadata`],
      };
    }

    for (const [key, value] of Object.entries(entity)) {
      const property = entityType.Property.find((p) => p.Name === key);
      if (!property) {
        continue;
      }

      const typeError = this.validatePropertyType(property, value);
      if (typeError) {
        errors.push(`Property '${key}': ${typeError}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Валидировать тип свойства
   */
  private validatePropertyType(
    property: { Type: string; Nullable?: boolean },
    value: unknown
  ): string | null {
    if (value === null || value === undefined) {
      if (property.Nullable !== false) {
        return null;
      }
      return 'cannot be null';
    }

    const type = property.Type;

    if (type === 'Edm.String') {
      if (typeof value !== 'string') {
        return 'must be string';
      }
    } else if (type === 'Edm.Int32' || type === 'Edm.Int64' || type === 'Edm.Decimal') {
      if (typeof value !== 'number') {
        return 'must be number';
      }
    } else if (type === 'Edm.Boolean') {
      if (typeof value !== 'boolean') {
        return 'must be boolean';
      }
    } else if (type === 'Edm.DateTime' || type === 'Edm.DateTimeOffset') {
      if (typeof value !== 'string') {
        return 'must be string (ISO 8601)';
      }
    }

    return null;
  }
}


