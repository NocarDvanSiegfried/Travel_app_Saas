/**
 * Экспорт модуля метаданных OData
 */

export { ODataMetadataParser } from './ODataMetadataParser';
export type {
  IODataMetadata,
  IODataEntityType,
  IODataComplexType,
  IODataEntitySet,
  IODataProperty,
  IODataNavigationProperty,
  IODataSchema,
} from './ODataMetadataParser';
export { ODataMetadataService } from './ODataMetadataService';
export { ODataTypeGenerator } from './ODataTypeGenerator';
export { ODataFieldValidator } from './ODataFieldValidator';


