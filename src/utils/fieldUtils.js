/**
 * Dynamic Field Detection Utility
 * Automatically detects all fields in objects including custom parameters
 */

/**
 * Get all fields from an object, including nested custom parameters
 * @param {Object} obj - The object to extract fields from
 * @returns {Array} Array of field names including custom.* for nested fields
 */
export function getAllFields(obj) {
  if (!obj) return [];
  
  const fields = [];
  
  Object.keys(obj).forEach(key => {
    // Skip system fields
    if (['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(key)) {
      return;
    }
    
    // Handle custom parameters specially
    if (key === 'custom' && typeof obj[key] === 'object' && obj[key] !== null) {
      // Add each custom parameter as "custom.paramName"
      Object.keys(obj[key]).forEach(customKey => {
        fields.push(`custom.${customKey}`);
      });
    } else {
      fields.push(key);
    }
  });
  
  return fields;
}

/**
 * Get value from object, handling nested paths like "custom.paramName"
 * @param {Object} obj - The object
 * @param {String} path - The field path (e.g., "caller" or "custom.pilotCarDriver")
 * @returns {*} The value at that path
 */
export function getFieldValue(obj, path) {
  if (!obj) return undefined;
  
  // Handle nested paths (custom.xxx)
  if (path.includes('.')) {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }
  
  return obj[path];
}

/**
 * Set value in object, handling nested paths like "custom.paramName"
 * @param {Object} obj - The object to modify
 * @param {String} path - The field path
 * @param {*} value - The value to set
 */
export function setFieldValue(obj, path, value) {
  if (path.includes('.')) {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = obj;
    
    // Navigate to parent
    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    
    current[lastPart] = value;
  } else {
    obj[path] = value;
  }
}

/**
 * Generate user-friendly label from field name
 * @param {String} fieldName - Field name (e.g., "assignedFlaggers" or "custom.pilotCarDriver")
 * @returns {String} Formatted label (e.g., "Assigned Flaggers" or "Pilot Car Driver")
 */
export function generateFieldLabel(fieldName) {
  // Handle custom parameters
  if (fieldName.startsWith('custom.')) {
    const customField = fieldName.replace('custom.', '');
    return formatFieldName(customField) + ' ⭐';
  }
  
  // Use predefined labels for known fields
  const knownLabels = {
    // Jobs
    jobID: 'Job ID',
    jobSeries: 'Job Series',
    poWoJobNum: 'PO/WO/Job #',
    initialJobDate: 'Date',
    initialJobTime: 'Time',
    meetSet: 'Meet/Set',
    jobLength: 'Job Length',
    amountOfFlaggers: 'Amount of Flaggers',
    assignedFlaggers: 'Assigned Flaggers',
    dispatchedFlaggers: 'Dispatched Flaggers',
    equipmentCarrier: 'Equipment Carrier',
    equipmentCarrierSigns: 'Equipment Carrier Signs',
    equipmentCarrierExtraSigns: 'Equipment Carrier Extra Signs',
    equipmentCarrierCones: 'Equipment Carrier Cones',
    signSets: 'Sign Sets',
    indvSigns: 'Individual Signs',
    type2: 'Type 2',
    type3: 'Type 3',
    balloonLights: 'Balloon Lights',
    portableLights: 'Portable Lights',
    travelTime: 'Travel Time (hrs)',
    travelMiles: 'Travel Miles',
    hideFromSummary: 'Hide from Summary',
    otherNotes: 'Notes',
    
    // Employees
    fullName: 'Full Name',
    payRate: 'Pay Rate',
    isActive: 'Active',
    
    // Common
    caller: 'Caller',
    billing: 'Billing',
    receiver: 'Receiver',
    location: 'Location',
    phone: 'Phone',
    phone2: 'Phone 2',
    email: 'Email',
  };
  
  if (knownLabels[fieldName]) {
    return knownLabels[fieldName];
  }
  
  // Auto-format unknown fields
  return formatFieldName(fieldName);
}

/**
 * Format camelCase field name to Title Case
 * @param {String} fieldName - camelCase field name
 * @returns {String} Title Case label
 */
function formatFieldName(fieldName) {
  // Convert camelCase to Title Case
  return fieldName
    // Insert space before capital letters
    .replace(/([A-Z])/g, ' $1')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Trim any extra spaces
    .trim();
}

/**
 * Generate field labels map for all fields in an object
 * @param {Object} obj - The object
 * @returns {Object} Map of field names to labels
 */
export function generateFieldLabels(obj) {
  const fields = getAllFields(obj);
  const labels = {};
  
  fields.forEach(field => {
    labels[field] = generateFieldLabel(field);
  });
  
  return labels;
}

/**
 * Format value for display
 * @param {*} value - The value to format
 * @returns {String} Formatted string
 */
export function formatValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Handle dates
    if (value.toDate) return value.toDate().toLocaleDateString();
    // Handle arrays
    if (Array.isArray(value)) return value.join(', ');
    // Handle other objects
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Compare two objects dynamically, detecting all fields
 * @param {Object} original - Original object
 * @param {Object} updated - Updated object
 * @returns {Array} Array of changes: [{field, label, oldValue, newValue}]
 */
export function compareObjectsDynamic(original, updated) {
  const changes = [];
  
  // Get all fields from both objects
  const originalFields = getAllFields(original);
  const updatedFields = getAllFields(updated);
  const allFields = [...new Set([...originalFields, ...updatedFields])];
  
  allFields.forEach(field => {
    const oldVal = getFieldValue(original, field);
    const newVal = getFieldValue(updated, field);
    
    // Skip if values are the same
    if (oldVal === newVal) return;
    
    // Skip if both are empty/null/undefined
    if (!oldVal && !newVal) return;
    
    changes.push({
      field,
      label: generateFieldLabel(field),
      oldValue: formatValue(oldVal),
      newValue: formatValue(newVal)
    });
  });
  
  return changes;
}
