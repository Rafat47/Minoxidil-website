/**
 * api.js
 * Centralized service for sending data to Google Apps Script.
 * Reusable across different forms (checkout, contact us, etc.)
 */

const APPS_SCRIPT_CONFIG = {
    // The deployment URL of your Google Apps Script
    URL: 'https://script.google.com/macros/s/AKfycbxYlnPZiqBZQZ_4YYKRlsGMeQukJW08QDA56epaXkc8hh5ZpxxZ2MngQQQHzZ6wdMFh/exec',

    // Must exactly match the SECRET_KEY in your Google Apps Script
    SECRET_KEY: 'GHF1q4O65IMPvTdCOei9JZ0LtkivTAlVEZEqKAVGWBA='
};

/**
 * Sends data to a specific tab in the Google Sheet.
 * 
 * @param {string} tabName - The name of the sheet tab (e.g., 'Checkout', 'Contact_Form').
 * @param {Object|Object[]} data - A single object or an array of objects to be saved as rows.
 * @returns {Promise<Object>} - Resolves with the Apps Script response, rejects on error.
 */
async function sendToGoogleSheet(tabName, data) {
    if (!tabName || typeof tabName !== 'string') {
        return Promise.reject(new Error('Invalid tab name provided.'));
    }

    if (!data || typeof data !== 'object') {
        return Promise.reject(new Error('Invalid data provided. Must be an object or array of objects.'));
    }

    const payload = {
        key: APPS_SCRIPT_CONFIG.SECRET_KEY,
        tab: tabName.trim(),
        data: data
    };

    try {
        // Using 'text/plain' prevents CORS preflight (OPTIONS) requests, 
        // which Google Apps Script does not handle well.
        const response = await fetch(APPS_SCRIPT_CONFIG.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.ok) {
            return result; // Success: { ok: true, message: "...", rows: N, tab: "..." }
        } else {
            throw new Error(result.message || 'Unknown error from Google Apps Script');
        }
    } catch (error) {
        console.error('Failed to send data to Google Sheet:', error);
        throw error; // Re-throw so the calling function can handle the UI error state
    }
}