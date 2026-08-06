// Authentication helper for frontend
// Handles JWT token storage and API requests with authentication

/**
 * Get stored authentication token from localStorage or cookie
 * @returns {string|null} JWT token or null
 */
function getAuthToken() {
    // Try localStorage first
    const token = localStorage.getItem('auth_token');
    if (token) return token;
    
    // Try to get from cookie (if available)
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'auth_token') {
            return value;
        }
    }
    
    return null;
}

/**
 * Store authentication token
 * @param {string} token - JWT token
 */
function setAuthToken(token) {
    localStorage.setItem('auth_token', token);
}

/**
 * Remove authentication token
 */
function removeAuthToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    // Clear cookie by setting it to expire
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

/**
 * Get current user from localStorage
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Make authenticated API request
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    
    // Add Authorization header if token exists
    if (token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Ensure Content-Type for JSON requests
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    
    const response = await fetch(url, options);
    
    // If unauthorized, redirect to login
    if (response.status === 401) {
        removeAuthToken();
        if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
        }
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }
    
    return response;
}

/**
 * Check if user has permission
 * @param {string} permission - Permission name
 * @returns {boolean} True if user has permission
 */
function hasPermission(permission) {
    const user = getCurrentUser();
    if (!user?.permisos) return false;
    return user.permisos.includes(permission);
}

/**
 * Check if user has role
 * @param {string} role - Role name
 * @returns {boolean} True if user has role
 */
function hasRole(role) {
    const user = getCurrentUser();
    if (!user) return false;
    return user.rol === role;
}

/**
 * Logout user and redirect to login
 */
function logout() {
    removeAuthToken();
    window.location.href = '/auth/login';
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAuthToken,
        setAuthToken,
        removeAuthToken,
        getCurrentUser,
        authenticatedFetch,
        hasPermission,
        hasRole,
        logout
    };
}

