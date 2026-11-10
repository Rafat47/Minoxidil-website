/**
 * api.js
 * Centralized service for sending and fetching data from Google Apps Script.
 */

const API_CONFIG = {
    CHECKOUT: {
        URL: 'https://script.google.com/macros/s/AKfycbxYlnPZiqBZQZ_4YYKRlsGMeQukJW08QDA56epaXkc8hh5ZpxxZ2MngQQQHzZ6wdMFh/exec',
        SECRET_KEY: 'GHF1q4O65IMPvTdCOei9JZ0LtkivTAlVEZEqKAVGWBA='
    },
    REVIEWS_STORE: {
        URL: 'https://script.google.com/macros/s/AKfycbydugUygP3-Ya3QnxmPZbEIy5pkLy0zlTi3ayNZUWkO-JTxqIG1lWvQBgC7QPPYHKwoHw/exec',
        SECRET_KEY: 'aierGjIZl4BbHWy2Zy1oy0RM+csnioe5fRdiPgZJViA='
    },
    REVIEWS_FETCH: {
        URL: 'https://script.google.com/macros/s/AKfycbxRD5qujnsrsvkJ-a_w9SSdqN0EnBDS5T-yEfBswsPa-7Asz1_KJzgRKxgZyBkFn-yc/exec',
        SECRET_KEY: 'T1dLMYFboyZFGvEOhN+HQb9qujUbN2KGWgNPoMBce2I='
    }
};

/**
 * Sends data to a specific tab in the Google Sheet.
 */
async function sendToGoogleSheet(tabName, data, configKey = 'CHECKOUT') {
    if (!tabName || typeof tabName !== 'string') {
        return Promise.reject(new Error('Invalid tab name provided.'));
    }
    if (!data || typeof data !== 'object') {
        return Promise.reject(new Error('Invalid data provided. Must be an object or array of objects.'));
    }

    const config = API_CONFIG[configKey];
    if (!config) {
        return Promise.reject(new Error(`Invalid config key: ${configKey}`));
    }

    // ✅ Uses "key" and "tab" to match your Store Apps Script
    const payload = {
        key: config.SECRET_KEY,
        tab: tabName.trim(),
        data: data
    };

    try {
        const response = await fetch(config.URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.ok) {
            return result;
        } else {
            throw new Error(result.message || 'Unknown error from Google Apps Script');
        }
    } catch (error) {
        console.error('Failed to send data to Google Sheet:', error);
        throw error;
    }
}

/**
 * Fetches data from a specific tab in the Google Sheet.
 */
async function fetchFromGoogleSheet(tabName, configKey = 'REVIEWS_FETCH') {
    if (!tabName || typeof tabName !== 'string') {
        return Promise.reject(new Error('Invalid tab name provided.'));
    }

    const config = API_CONFIG[configKey];
    if (!config) {
        return Promise.reject(new Error(`Invalid config key: ${configKey}`));
    }

    // ✅ Uses "secret" and "sheet" to match your Fetch Apps Script
    const payload = {
        secret: config.SECRET_KEY,
        sheet: tabName.trim()
    };

    try {
        const response = await fetch(config.URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Unknown error fetching from Google Apps Script');
        }
    } catch (error) {
        console.error('Failed to fetch data from Google Sheet:', error);
        throw error;
    }
}