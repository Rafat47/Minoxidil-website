document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (orderId) {
        document.getElementById('orderIdDisplay').textContent = orderId;
    } else {
        document.getElementById('orderIdDisplay').textContent = 'N/A';
    }

    // Footer year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});