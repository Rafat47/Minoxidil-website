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

    // Validation rules
    const rules = {
        name: v => v.trim().length >= 2 || 'Please enter your full name.',
        phone: v => /^(?:\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, '')) || 'Enter a valid Bangladeshi phone number.',
        address: v => v.trim().length >= 10 || 'Please enter a complete delivery address.'
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
            </div>
        `;
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

    function confirmOrder() {
        if (!validateForm()) return;

        const form = document.getElementById('checkoutForm');
        const orderData = {
            name: form.elements.name.value.trim(),
            phone: form.elements.phone.value.trim(),
            address: form.elements.address.value.trim(),
            note: form.elements.note.value.trim(),
            items: cart,
            subtotal: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
            deliveryCharge: DELIVERY_CHARGE,
            total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0) + DELIVERY_CHARGE,
            date: new Date().toISOString(),
            orderId: 'ORD-' + Date.now()
        };

        // Save order to localStorage (you can send to backend instead)
        try {
            const orders = JSON.parse(localStorage.getItem('picaso_orders') || '[]');
            orders.push(orderData);
            localStorage.setItem('picaso_orders', JSON.stringify(orders));
        } catch (e) {
            console.error('Failed to save order:', e);
        }

        // Clear cart
        localStorage.removeItem(CART_KEY);

        // Redirect to thank you page with order ID
        window.location.href = `thankyou.html?orderId=${orderData.orderId}`;
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
    // Event listeners
    document.getElementById('confirmOrderBtn').addEventListener('click', confirmOrder);
});