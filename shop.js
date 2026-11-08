document.addEventListener('DOMContentLoaded', () => {
    const fmt = (n) => '৳ ' + Number(n).toLocaleString('en-US');
    const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    // Hands the item to the cart logic in script.js (see the snippet to append there)
    function addToCart(p, qty, open) {
        document.dispatchEvent(new CustomEvent('picaso:add-to-cart', {
            detail: { id: p.id, name: p.name, price: p.price, image: p.image, qty, open }
        }));
    }
    function buyNow(p, qty) {
        addToCart(p, qty, false);
        window.location.href = 'checkout.html'; // checkout page comes next
    }

    if (document.getElementById('productGrid')) initShop();
    if (document.getElementById('productView')) initProduct();

    /* ================= SHOP PAGE ================= */
    function initShop() {
        const grid = document.getElementById('productGrid');

        grid.innerHTML = PRODUCTS.map((p) => `
      <article class="product-card">
        <a class="product-card__link" href="product.html?id=${p.id}">
          <div class="product-card__media">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
          </div>
          <div class="product-card__body">
            <h3 class="product-card__name">${p.name}</h3>
            <p class="product-card__price">${fmt(p.price)}</p>
          </div>
        </a>

        

        <div class="product-card__actions">
            <div class="qty-box" aria-label="Quantity">
                <button type="button" class="qty-btn" data-action="minus" aria-label="Decrease quantity">−</button>
                <input type="number" class="qty-input" value="1" min="1" max="99" inputmode="numeric" aria-label="Quantity">
                <button type="button" class="qty-btn" data-action="plus" aria-label="Increase quantity">+</button>
            </div>

            <button type="button" class="icon-cart-btn" data-action="add" data-product-id="${p.id}" aria-label="Add ${p.name} to cart">
                <img src="/public/icons/cart.svg" alt="">
            </button>

            <button type="button" class="sp-btn sp-btn--primary" data-action="buy" data-product-id="${p.id}">Buy Now</button>
        </div>
      </article>
    `).join('');


        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const card = btn.closest('.product-card');
            const input = card.querySelector('.qty-input');
            const getQty = () => Math.min(99, Math.max(1, parseInt(input.value, 10) || 1));

            if (btn.dataset.action === 'minus') { input.value = Math.max(1, getQty() - 1); return; }
            if (btn.dataset.action === 'plus') { input.value = Math.min(99, getQty() + 1); return; }

            const p = getProduct(btn.dataset.productId);
            if (!p) return;
            if (btn.dataset.action === 'add') addToCart(p, getQty(), true);
            if (btn.dataset.action === 'buy') buyNow(p, getQty());
        });
    }

    /* ================= PRODUCT PAGE ================= */
    function initProduct() {
        const params = new URLSearchParams(window.location.search);
        const wantedId = params.get('id');
        const p = wantedId ? getProduct(wantedId) : PRODUCTS[0];

        if (!p) {
            document.getElementById('productView').hidden = true;
            document.getElementById('notFound').hidden = false;
            return;
        }

        // Basic info
        document.title = p.name + ' | Picaso';
        document.getElementById('crumbName').textContent = p.name;
        document.getElementById('productName').textContent = p.name;
        document.getElementById('productSize').textContent = p.size;
        document.getElementById('productPrice').textContent = fmt(p.price);

        // Gallery
        const mainImg = document.getElementById('mainImage');
        const thumbs = document.getElementById('thumbs');
        mainImg.src = p.images[0];
        mainImg.alt = p.name;
        thumbs.innerHTML = p.images.map((src, i) => `
      <button type="button" class="${i === 0 ? 'is-active' : ''}" data-src="${src}" aria-label="View image ${i + 1}">
        <img src="${src}" alt="" loading="lazy">
      </button>
    `).join('');
        thumbs.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-src]');
            if (!b) return;
            mainImg.src = b.dataset.src;
            thumbs.querySelectorAll('button').forEach((x) => x.classList.toggle('is-active', x === b));
        });

        // Quantity
        const qtyInput = document.getElementById('qtyInput');
        const clamp = (v) => {
            v = parseInt(v, 10);
            if (isNaN(v) || v < 1) return 1;
            return Math.min(v, 99);
        };
        document.getElementById('qtyMinus').addEventListener('click', () => {
            qtyInput.value = clamp((parseInt(qtyInput.value, 10) || 1) - 1);
        });
        document.getElementById('qtyPlus').addEventListener('click', () => {
            qtyInput.value = clamp((parseInt(qtyInput.value, 10) || 0) + 1);
        });
        qtyInput.addEventListener('input', () => {
            qtyInput.value = qtyInput.value.replace(/\D/g, '').slice(0, 2);
        });
        qtyInput.addEventListener('change', () => { qtyInput.value = clamp(qtyInput.value); });

        // Buttons
        document.getElementById('addToCartBtn').addEventListener('click', () => {
            addToCart(p, clamp(qtyInput.value), true);
        });
        document.getElementById('buyNowBtn').addEventListener('click', () => {
            buyNow(p, clamp(qtyInput.value));
        });

        renderDescription(p);
        initReviews(p);
    }

    function renderDescription(p) {
        const body = document.getElementById('descriptionBody');
        body.innerHTML = '';
        const add = (tag, text) => {
            const el = document.createElement(tag);
            el.textContent = text;
            body.appendChild(el);
            return el;
        };
        p.description.forEach((t) => add('p', t));

        add('h3', 'Key features');
        const ul = document.createElement('ul');
        p.features.forEach((f) => { const li = document.createElement('li'); li.textContent = f; ul.appendChild(li); });
        body.appendChild(ul);

        add('h3', 'How to use');
        add('p', p.usage);

        const note = add('div', p.note);
        note.className = 'note-box';
    }

    /* ================= REVIEWS ================= */
    // Stored in this browser only (localStorage). See the note below the code.
    function initReviews(p) {
        const KEY = 'picaso_reviews';
        const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
        const save = (data) => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { } };

        const picker = document.getElementById('starPicker');
        const form = document.getElementById('reviewForm');
        const errorEl = document.getElementById('reviewError');
        let rating = 0;

        function paintPicker() {
            picker.querySelectorAll('button').forEach((b) => {
                const on = Number(b.dataset.value) <= rating;
                b.classList.toggle('is-on', on);
                b.setAttribute('aria-checked', String(Number(b.dataset.value) === rating));
            });
        }
        picker.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-value]');
            if (!b) return;
            rating = Number(b.dataset.value);
            paintPicker();
        });

        function render() {
            const list = load()[p.id] || [];
            const count = list.length;
            const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;

            document.getElementById('avgRating').textContent = avg.toFixed(1);
            document.getElementById('avgStars').textContent = stars(Math.round(avg));
            document.getElementById('topStars').textContent = stars(Math.round(avg));
            const label = count ? `${count} review${count > 1 ? 's' : ''}` : 'No reviews yet';
            document.getElementById('reviewCount').textContent = label;
            document.getElementById('topRatingText').textContent = count ? `${avg.toFixed(1)} · ${label}` : label;

            const wrap = document.getElementById('reviewList');
            wrap.innerHTML = '';
            if (!count) {
                const empty = document.createElement('p');
                empty.className = 'review-empty';
                empty.textContent = 'No reviews yet. Be the first to share your experience!';
                wrap.appendChild(empty);
                return;
            }
            list.slice().reverse().forEach((r) => {
                const item = document.createElement('article');
                item.className = 'review-item';

                const head = document.createElement('div');
                head.className = 'review-item__head';
                const name = document.createElement('span');
                name.className = 'review-item__name';
                name.textContent = r.name;
                const date = document.createElement('span');
                date.className = 'review-item__date';
                date.textContent = new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                head.append(name, date);

                const st = document.createElement('div');
                st.className = 'stars';
                st.textContent = stars(r.rating);
                st.setAttribute('aria-label', `${r.rating} out of 5 stars`);

                const text = document.createElement('p');
                text.textContent = r.text;

                item.append(head, st, text);
                wrap.appendChild(item);
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reviewName').value.trim();
            const text = document.getElementById('reviewText').value.trim();

            if (!rating) return (errorEl.textContent = 'Please select a star rating.');
            if (name.length < 2) return (errorEl.textContent = 'Please enter your name.');
            if (text.length < 10) return (errorEl.textContent = 'Please write at least 10 characters about your experience.');

            errorEl.textContent = '';
            const data = load();
            (data[p.id] = data[p.id] || []).push({ name, rating, text, date: Date.now() });
            save(data);

            form.reset();
            rating = 0;
            paintPicker();
            render();
        });

        render();
    }

    // Footer year (guarded so it never throws)
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});