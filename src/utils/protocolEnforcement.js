/**
 * PROTOCOL ENFORCEMENT UTILITIES
 * 
 * Provides validation and detection logic for ISO8583 and ISO20022 protocol enforcement.
 * Prevents free-text field entry for protocol adapters in normal mode.
 * 
 * @module protocolEnforcement
 */

import { PROTOCOL_REGISTRY } from '../config/protocolRegistry';

/**
 * Protocol formats that require strict enforcement
 */
export const PROTOCOL_FORMATS = ['ISO8583', 'ISO20022', 'ISO_8583', 'ISO_20022'];

/**
 * Check if format is a protocol format requiring enforcement
 * 
 * @param {string} format - Adapter format (e.g., "ISO8583", "JSON", "XML")
 * @returns {boolean} True if format is ISO8583 or ISO20022
 */
export function isProtocolFormat(format) {
  if (!format) return false;
  const normalized = String(format).toUpperCase().replace(/[-_\s]/g, '');
  return normalized === 'ISO8583' || normalized === 'ISO20022';
}

/**
 * Get normalized protocol type
 * 
 * @param {string} format - Adapter format
 * @returns {string|null} "ISO8583", "ISO20022", or null
 */
export function getProtocolType(format) {
  if (!format) return null;
  const normalized = String(format).toUpperCase().replace(/[-_\s]/g, '');
  if (normalized === 'ISO8583') return 'ISO8583';
  if (normalized === 'ISO20022') return 'ISO20022';
  return null;
}

/**
 * Check if adapter is in extension mode
 * 
 * @param {Object} adapter - Adapter configuration object
 * @returns {boolean} True if extension mode is enabled
 */
export function isExtensionMode(adapter) {
  return Boolean(
    adapter?.metadata?.extensionMode === 'ADVANCED' ||
    adapter?.metadata?.advancedMode === true ||
    adapter?.extensionMode === true ||
    adapter?.advancedMode === true ||
    adapter?.protocolExtension === true
  );
}

/**
 * Validate if field name exists in protocol registry
 * 
 * @param {string} fieldName - Field name to validate
 * @param {string} protocolType - Protocol type ("ISO8583" or "ISO20022")
 * @param {Array} availableFields - Array of available protocol fields
 * @returns {Object} Validation result { valid, error, suggestion }
 */
export function validateProtocolField(fieldName, protocolType, availableFields) {
  if (!isProtocolFormat(protocolType)) {
    return { valid: true };
  }
  
  if (!fieldName || !fieldName.trim()) {
    return { valid: true }; // Empty is okay, will be caught by required validation
  }
  
  const fieldExists = availableFields.some(f => 
    f.name === fieldName || 
    f.de === fieldName || 
    f.path === fieldName ||
    f.number === fieldName
  );
  
  if (!fieldExists) {
    return {
      valid: false,
      error: `Field '${fieldName}' is not defined in ${protocolType} protocol registry`,
      suggestion: 'Select a valid field from the dropdown or enable Extension Mode to add custom fields'
    };
  }
  
  return { valid: true };
}

/**
 * Get protocol fields from registry
 * 
 * @param {string} protocolType - "ISO8583" or "ISO20022"
 * @param {string} direction - "request" or "response"
 * @param {string} mti - MTI for ISO8583 (optional)
 * @param {string} messageId - Message ID for ISO20022 (optional)
 * @returns {Array} Array of protocol field definitions
 */
export function getProtocolFieldsFromRegistry(protocolType, direction = 'request', mti = null, messageId = null) {
  if (protocolType === 'ISO8583') {
    const allFields = PROTOCOL_REGISTRY.ISO8583.dataElements.primaryFields;
    
    // Filter by MTI if provided
    if (mti && PROTOCOL_REGISTRY.ISO8583.dataElements.requiredByMTI[mti]) {
      const requiredDEs = PROTOCOL_REGISTRY.ISO8583.dataElements.requiredByMTI[mti];
      return allFields.map(f => ({
        name: `DE${f.de}`,
        displayName: f.name,
        de: f.de,
        type: f.type,
        required: requiredDEs.includes(f.de),
        responseOnly: f.responseOnly || false,
        maxLength: f.maxLength,
        pciProtection: f.pciProtection
      }));
    }
    
    // Return all fields if no MTI specified
    return allFields.map(f => ({
      name: `DE${f.de}`,
      displayName: f.name,
      de: f.de,
      type: f.type,
      required: f.required || false,
      responseOnly: f.responseOnly || false,
      maxLength: f.maxLength,
      pciProtection: f.pciProtection
    }));
  }
  
  if (protocolType === 'ISO20022') {
    // Get all common fields
    const allFields = [
      ...PROTOCOL_REGISTRY.ISO20022.commonFields.header,
      ...PROTOCOL_REGISTRY.ISO20022.commonFields.groupHeader,
      ...PROTOCOL_REGISTRY.ISO20022.commonFields.paymentInformation,
      ...PROTOCOL_REGISTRY.ISO20022.commonFields.creditTransferTransaction,
      ...PROTOCOL_REGISTRY.ISO20022.commonFields.statusInformation,
    ];
    
    // Filter by direction
    return allFields
      .filter(f => !f.responseOnly || direction === 'response')
      .map(f => ({
        name: f.path,
        displayName: f.name,
        path: f.path,
        type: f.type,
        required: f.required || false,
        responseOnly: f.responseOnly || false,
        roundTripSafe: f.roundTripSafe || false,
        pciProtection: f.pciProtection
      }));
  }
  
  return [];
}

/**
 * Validate a mapping row for protocol compliance
 * 
 * @param {Object} mapping - Mapping row object
 * @param {string} sourceFormat - Source adapter format
 * @param {string} targetFormat - Target adapter format
 * @param {Array} availableSourceFields - Available source protocol fields
 * @param {Array} availableTargetFields - Available target protocol fields
 * @returns {Object} Validation result { valid, errors }
 */
export function validateMappingForProtocol(
  mapping, 
  sourceFormat, 
  targetFormat, 
  availableSourceFields, 
  availableTargetFields
) {
  const errors = [];
  
  // Source field validation
  if (mapping.sourceField && isProtocolFormat(sourceFormat)) {
    const sourceValidation = validateProtocolField(
      mapping.sourceField,
      getProtocolType(sourceFormat),
      availableSourceFields
    );
    if (!sourceValidation.valid) {
      errors.push({
        field: 'sourceField',
        value: mapping.sourceField,
        error: sourceValidation.error,
        suggestion: sourceValidation.suggestion
      });
    }
  }
  
  // Target field validation
  if (mapping.targetField && isProtocolFormat(targetFormat)) {
    const targetValidation = validateProtocolField(
      mapping.targetField,
      getProtocolType(targetFormat),
      availableTargetFields
    );
    if (!targetValidation.valid) {
      errors.push({
        field: 'targetField',
        value: mapping.targetField,
        error: targetValidation.error,
        suggestion: targetValidation.suggestion
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate all mapping rows for protocol compliance
 * 
 * @param {Array} rows - Array of mapping rows
 * @param {string} sourceFormat - Source adapter format
 * @param {string} targetFormat - Target adapter format
 * @param {Array} sourceFields - Available source protocol fields
 * @param {Array} targetFields - Available target protocol fields
 * @returns {Object} Validation summary { valid, invalidCount, invalidMappings, allResults }
 */
export function validateAllMappings(rows, sourceFormat, targetFormat, sourceFields, targetFields) {
  const results = rows.map(row => ({
    row,
    validation: validateMappingForProtocol(row, sourceFormat, targetFormat, sourceFields, targetFields)
  }));
  
  const invalid = results.filter(r => !r.validation.valid);
  
  return {
    valid: invalid.length === 0,
    invalidCount: invalid.length,
    invalidMappings: invalid,
    allResults: results
  };
}

/**
 * Validate JSON schema against protocol registry
 * 
 * @param {string} schemaText - JSON schema text
 * @param {string} format - Protocol format
 * @param {string} direction - "request" or "response"
 * @returns {Object} Validation result { valid, errors, warnings }
 */
export function validateProtocolSchema(schemaText, format, direction = 'request') {
  if (!isProtocolFormat(format)) {
    return { valid: true, errors: [], warnings: [] };
  }
  
  try {
    const schema = JSON.parse(schemaText);
    const errors = [];
    const warnings = [];
    
    const protocolType = getProtocolType(format);
    const protocolFields = getProtocolFieldsFromRegistry(protocolType, direction);
    const protocolFieldNames = new Set(protocolFields.map(f => f.name));
    
    // Check for invalid fields
    const schemaFields = Object.keys(schema);
    schemaFields.forEach(fieldName => {
      if (!protocolFieldNames.has(fieldName)) {
        errors.push({
          field: fieldName,
          error: `Field '${fieldName}' is not defined in ${protocolType} ${direction} schema`,
          suggestion: `Use one of: ${Array.from(protocolFieldNames).slice(0, 5).join(', ')}...`
        });
      }
    });
    
    // Check for missing required fields
    protocolFields
      .filter(f => f.required)
      .forEach(field => {
        if (!schemaFields.includes(field.name)) {
          warnings.push({
            field: field.name,
            warning: `Required field '${field.name}' (${field.displayName}) is missing`,
            severity: 'high'
          });
        }
      });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (err) {
    return {
      valid: false,
      errors: [{ field: null, error: 'Invalid JSON syntax', suggestion: 'Fix JSON formatting errors' }],
      warnings: []
    };
  }
}

/**
 * Get extension fields (fields not in protocol registry)
 * 
 * @param {Array} mappings - Array of mapping rows
 * @param {string} format - Protocol format
 * @param {string} direction - "request" or "response"
 * @returns {Array} Array of extension field names
 */
export function getExtensionFields(mappings, format, direction = 'request') {
  if (!isProtocolFormat(format)) return [];
  
  const protocolType = getProtocolType(format);
  const protocolFields = getProtocolFieldsFromRegistry(protocolType, direction);
  const protocolFieldNames = new Set(protocolFields.map(f => f.name));
  
  const extensionFields = new Set();
  
  mappings.forEach(mapping => {
    ['sourceField', 'targetField'].forEach(fieldType => {
      const fieldName = mapping[fieldType];
      if (fieldName && !protocolFieldNames.has(fieldName)) {
        extensionFields.add(fieldName);
      }
    });
  });
  
  return Array.from(extensionFields);
}

/**
 * Format error message for display
 * 
 * @param {Object} validationResult - Validation result object
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(validationResult) {
  if (validationResult.valid) return '';
  
  const errorMessages = validationResult.errors.map(err => {
    return `• ${err.field ? `Field '${err.field}': ` : ''}${err.error}\n  ${err.suggestion || ''}`;
  });
  
  return errorMessages.join('\n\n');
}

/**
 * Check if enforcement is enabled (global feature flag)
 * 
 * @returns {boolean} True if protocol enforcement is enabled
 */
export function isEnforcementEnabled() {
  // Feature flag for gradual rollout
  return true; // Set to false to disable enforcement globally
}

export default {
  isProtocolFormat,
  getProtocolType,
  isExtensionMode,
  validateProtocolField,
  getProtocolFieldsFromRegistry,
  validateMappingForProtocol,
  validateAllMappings,
  validateProtocolSchema,
  getExtensionFields,
  formatValidationErrors,
  isEnforcementEnabled,
  PROTOCOL_FORMATS
};
