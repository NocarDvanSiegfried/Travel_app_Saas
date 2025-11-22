/**
 * Генератор TypeScript типов на основе метаданных OData
 */

import { IODataEntityType, IODataComplexType, IODataProperty } from './ODataMetadataParser';

export class ODataTypeGenerator {
  /**
   * Сгенерировать TypeScript интерфейс для EntityType
   */
  generateEntityTypeInterface(entityType: IODataEntityType): string {
    const interfaceName = this.toPascalCase(entityType.Name);
    const _properties = entityType.Property.map((prop) =>
      this.generateProperty(prop)
    );

    const keyProperties = entityType.Key?.PropertyRef.map((pr) => pr.Name) || [];
    const requiredProperties = entityType.Property.filter(
      (p) => !p.Nullable && keyProperties.includes(p.Name)
    );

    const optionalProperties = entityType.Property.filter(
      (p) => p.Nullable || !keyProperties.includes(p.Name)
    );

    const requiredProps = requiredProperties.map((prop) =>
      this.generateProperty(prop, false)
    );
    const optionalProps = optionalProperties.map((prop) =>
      this.generateProperty(prop, true)
    );

    return `export interface I${interfaceName} {
  ${[...requiredProps, ...optionalProps].join('\n  ')}
}`;
  }

  /**
   * Сгенерировать TypeScript интерфейс для ComplexType
   */
  generateComplexTypeInterface(complexType: IODataComplexType): string {
    const interfaceName = this.toPascalCase(complexType.Name);
    const properties = complexType.Property.map((prop) =>
      this.generateProperty(prop, prop.Nullable !== false)
    );

    return `export interface I${interfaceName} {
  ${properties.join('\n  ')}
}`;
  }

  /**
   * Сгенерировать свойство
   */
  private generateProperty(
    property: IODataProperty,
    optional: boolean = true
  ): string {
    const name = property.Name;
    const tsType = this.mapODataTypeToTypeScript(property.Type);
    const optionalMarker = optional ? '?' : '';

    return `${name}${optionalMarker}: ${tsType};`;
  }

  /**
   * Преобразовать OData тип в TypeScript тип
   */
  private mapODataTypeToTypeScript(odataType: string): string {
    const typeMap: Record<string, string> = {
      'Edm.String': 'string',
      'Edm.Int32': 'number',
      'Edm.Int64': 'number',
      'Edm.Decimal': 'number',
      'Edm.Double': 'number',
      'Edm.Single': 'number',
      'Edm.Boolean': 'boolean',
      'Edm.DateTime': 'string',
      'Edm.DateTimeOffset': 'string',
      'Edm.Date': 'string',
      'Edm.TimeOfDay': 'string',
      'Edm.Duration': 'string',
      'Edm.Guid': 'string',
      'Edm.Binary': 'string',
      'Edm.Byte': 'number',
      'Edm.SByte': 'number',
      'Edm.Int16': 'number',
    };

    if (typeMap[odataType]) {
      return typeMap[odataType];
    }

    if (odataType.startsWith('Collection(')) {
      const innerType = odataType.replace('Collection(', '').replace(')', '');
      const tsInnerType = this.mapODataTypeToTypeScript(innerType);
      return `${tsInnerType}[]`;
    }

    if (odataType.includes('.')) {
      const parts = odataType.split('.');
      const typeName = parts[parts.length - 1];
      return `I${this.toPascalCase(typeName)}`;
    }

    return 'unknown';
  }

  /**
   * Преобразовать имя в PascalCase
   */
  private toPascalCase(name: string): string {
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Сгенерировать все типы из метаданных
   */
  generateAllTypes(metadata: {
    EntityType: IODataEntityType[];
    ComplexType?: IODataComplexType[];
  }): string {
    const entityTypes = metadata.EntityType.map((et) =>
      this.generateEntityTypeInterface(et)
    );
    const complexTypes = (metadata.ComplexType || []).map((ct) =>
      this.generateComplexTypeInterface(ct)
    );

    return [...complexTypes, ...entityTypes].join('\n\n');
  }
}


