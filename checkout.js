document.addEventListener('DOMContentLoaded', () => {
    const CART_KEY = 'picaso_cart';
    const DELIVERY_CHARGE = 60;

    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
        cart = [];
    }

    const fmt = (n) => '৳ ' + Number(n).toLocaleString('en-US');

    // ====== UPDATED VALIDATION RULES ======
    const rules = {
        name: v => {
            const val = String(v).trim();
            // Must be a string, at least 2 characters, containing only letters, spaces, dots, or hyphens
            return (val.length >= 2 && /^[a-zA-Z\s.-]+$/.test(val))
                ? true
                : 'Please enter a valid name (letters only, min 2 characters).';
        },
        phone: v => {
            // Strip all non-digit characters (spaces, dashes, plus signs)
            const digits = String(v).replace(/\D/g, '');
            // Must be more than 8 digits and less than 15 digits (i.e., 9 to 14 digits)
            return (digits.length > 8 && digits.length < 15)
                ? true
                : 'Phone number must contain between 9 and 14 digits.';
        },
        address: v => {
            const val = String(v).trim();
            // Must be a string and at least 10 characters long
            return val.length >= 10
                ? true
                : 'Please enter a complete delivery address (min 10 characters).';
        }
    };

    function renderOrderSummary() {
        const summaryEl = document.getElementById('orderSummary');
        const subtotalEl = document.getElementById('subtotal');
        const deliveryEl = document.getElementById('deliveryCharge');
        const totalEl = document.getElementById('totalAmount');

        if (cart.length === 0) {
            summaryEl.innerHTML = `
            <div class="empty-cart-message">
                <p>Your cart is empty.</p>
                <a href="shop.html">Continue Shopping</a>
            </div>`;
            subtotalEl.textContent = fmt(0);
            deliveryEl.textContent = fmt(0);
            totalEl.textContent = fmt(0);
            document.getElementById('confirmOrderBtn').disabled = true;
            return;
        }

        document.getElementById('confirmOrderBtn').disabled = false;
        summaryEl.innerHTML = cart.map(item => `
        <div class="order-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}">
            <div class="order-item-info">
                <p class="order-item-name">${item.name}</p>
                <div class="order-item-qty-control">
                    <button type="button" data-action="dec" data-id="${item.id}" ${item.qty <= 1 ? 'disabled' : ''} aria-label="Decrease quantity">&minus;</button>
                    <span>${item.qty}</span>
                    <button type="button" data-action="inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
                </div>
            </div>
            <div class="order-item-price">${fmt(item.price * item.qty)}</div>
        </div>
        `).join('');

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const total = subtotal + DELIVERY_CHARGE;
        subtotalEl.textContent = fmt(subtotal);
        deliveryEl.textContent = fmt(DELIVERY_CHARGE);
        totalEl.textContent = fmt(total);
    }

    function validateForm() {
        const form = document.getElementById('checkoutForm');
        let valid = true;
        Object.keys(rules).forEach(field => {
            const input = form.elements[field];
            const result = rules[field](input.value);
            const errEl = form.querySelector(`.error[data-for="${field}"]`);
            const wrap = input.closest('.form-group');
            if (result !== true) {
                valid = false;
                errEl.textContent = result;
                wrap.classList.add('invalid');
            } else {
                errEl.textContent = '';
                wrap.classList.remove('invalid');
            }
        });
        return valid;
    }

    // ====== UPDATED CONFIRM ORDER FUNCTION ======
    async function confirmOrder() {
        if (!validateForm()) return;

        const btn = document.getElementById('confirmOrderBtn');
        const originalBtnText = btn.textContent;

        // Prevent double submission
        btn.disabled = true;
        btn.textContent = 'Processing Order...';

        const form = document.getElementById('checkoutForm');
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const totalCost = subtotal + DELIVERY_CHARGE;
        const orderId = 'ORD-' + Date.now();

        // Create a readable summary of products for easy viewing in Google Sheets
        const productSummary = cart.map(item => `${item.name} (x${item.qty})`).join(', ');

        const orderData = {
            orderId: orderId,
            date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
            name: form.elements.name.value.trim(),
            phone: form.elements.phone.value.trim(),
            address: form.elements.address.value.trim(),
            note: form.elements.note.value.trim(),
            productSummary: productSummary, // Easy to read in Sheets
            items: cart,                    // Apps Script will safely JSON.stringify this
            subtotal: subtotal,
            deliveryCharge: DELIVERY_CHARGE,
            cod: totalCost                  // Total Cash on Delivery amount
        };

        try {
            // 1. Send data to Google Sheets using the centralized api.js function
            await sendToGoogleSheet('Checkout', orderData);

            // 2. Save order to localStorage for local history
            try {
                const orders = JSON.parse(localStorage.getItem('picaso_orders') || '[]');
                orders.push(orderData);
                localStorage.setItem('picaso_orders', JSON.stringify(orders));
            } catch (e) {
                console.error('Failed to save order locally:', e);
            }

            // 3. Clear cart and notify other components (like the cart drawer)
            localStorage.removeItem(CART_KEY);
            document.dispatchEvent(new CustomEvent('picaso:cart-updated'));

            // 4. Redirect to thank you page
            window.location.href = `thankyou.html?orderId=${orderId}`;

        } catch (error) {
            console.error('Order submission failed:', error);
            alert('Failed to place order. Please check your internet connection and try again.');

            // Reset button on failure
            btn.disabled = false;
            btn.textContent = originalBtnText;
        }
    }

    // Event listeners
    document.getElementById('confirmOrderBtn').addEventListener('click', confirmOrder);

    // Initial render
    renderOrderSummary();

    // Footer year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Quantity change handlers inside order summary
    document.getElementById('orderSummary').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const item = cart.find(i => i.id === id);
        if (!item) return;

        if (action === 'inc') {
            item.qty = Math.min(99, item.qty + 1);
        } else if (action === 'dec') {
            item.qty = Math.max(1, item.qty - 1);
        }

        // Persist the change so the cart drawer stays in sync
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { }

        // Notify the cart drawer (if open) to refresh
        document.dispatchEvent(new CustomEvent('picaso:cart-updated'));
        renderOrderSummary();
    });
});