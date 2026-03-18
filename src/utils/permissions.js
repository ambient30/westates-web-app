import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Cache for user permissions (to avoid repeated Firestore reads)
let permissionsCache = null;
let currentUserId = null;

/**
 * Load user's permissions from Firestore
 */
export async function loadUserPermissions(userId) {
  try {
    // Return cached permissions if same user
    if (currentUserId === userId && permissionsCache) {
      return permissionsCache;
    }

    // Get user document
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.warn('User document not found');
      return null;
    }

    const userData = userDoc.data();
    
    // Get role document
    const roleDoc = await getDoc(doc(db, 'roles', userData.roleId));
    
    if (!roleDoc.exists()) {
      console.warn('Role document not found');
      return null;
    }

    const roleData = roleDoc.data();
    
    // Cache permissions
    permissionsCache = roleData.permissions;
    currentUserId = userId;
    
    return roleData.permissions;
  } catch (error) {
    console.error('Error loading permissions:', error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 * @param {string} collection - Collection name (jobs, employees, etc.)
 * @param {string} action - Action (create, read, update, delete)
 */
export function hasPermission(permissions, collection, action) {
  if (!permissions) return false;
  return permissions[collection]?.[action] === true;
}

/**
 * Clear permissions cache (call on logout)
 */
export function clearPermissionsCache() {
  permissionsCache = null;
  currentUserId = null;
}

/**
 * Default permission template for new roles
 */
export const defaultPermissions = {
  jobs: { create: false, read: false, update: false, delete: false },
  employees: { create: false, read: false, update: false, delete: false },
  contractors: { create: false, read: false, update: false, delete: false },
  rates: { create: false, read: false, update: false, delete: false },
  users: { create: false, read: false, update: false, delete: false },
  roles: { create: false, read: false, update: false, delete: false },
  auditLog: { read: false }
};

/**
 * Owner role (full permissions) - created for first user
 */
export const ownerPermissions = {
  jobs: { create: true, read: true, update: true, delete: true },
  employees: { create: true, read: true, update: true, delete: true },
  contractors: { create: true, read: true, update: true, delete: true },
  rates: { create: true, read: true, update: true, delete: true },
  users: { create: true, read: true, update: true, delete: true },
  roles: { create: true, read: true, update: true, delete: true },
  auditLog: { read: true }
};