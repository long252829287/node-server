/**
 * Common validation utilities and schemas
 */

// Common validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

// Common validation rules
const rules = {
  required: (value) => value !== undefined && value !== null && value !== '',
  minLength: (min) => (value) => value && value.length >= min,
  maxLength: (max) => (value) => value && value.length <= max,
  pattern: (regex) => (value) => !value || regex.test(value),
  email: (value) => !value || patterns.email.test(value),
  url: (value) => !value || patterns.url.test(value),
  uuid: (value) => !value || patterns.uuid.test(value),
  numeric: (value) => !value || !isNaN(value) && !isNaN(parseFloat(value)),
  integer: (value) => !value || Number.isInteger(Number(value)),
  positive: (value) => !value || Number(value) > 0,
  nonNegative: (value) => !value || Number(value) >= 0,
  inRange: (min, max) => (value) => !value || (Number(value) >= min && Number(value) <= max),
  enum: (allowedValues) => (value) => !value || allowedValues.includes(value)
};

// Validation result class
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
  }

  addError(field, message) {
    this.isValid = false;
    this.errors.push({ field, message });
  }

  addErrors(errors) {
    this.isValid = false;
    this.errors.push(...errors);
  }

  getResult() {
    return {
      isValid: this.isValid,
      errors: this.errors
    };
  }
}

// Validate object against schema
const validate = (data, schema) => {
  const result = new ValidationResult();
  
  for (const [field, validations] of Object.entries(schema)) {
    const value = data[field];
    
    for (const validation of validations) {
      if (typeof validation === 'function') {
        if (!validation(value)) {
          result.addError(field, `Validation failed for ${field}`);
          break;
        }
      } else if (typeof validation === 'object') {
        const { rule, message } = validation;
        if (!rule(value)) {
          result.addError(field, message || `Validation failed for ${field}`);
          break;
        }
      }
    }
  }
  
  return result.getResult();
};

module.exports = {
  patterns,
  rules,
  validate,
  ValidationResult
}; 