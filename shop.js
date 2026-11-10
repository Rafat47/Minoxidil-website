document.addEventListener('DOMContentLoaded', () => {
    const fmt = (n) => '৳ ' + Number(n).toLocaleString('en-US');
    const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    function addToCart(p, qty, open) {
        document.dispatchEvent(new CustomEvent('picaso:add-to-cart', {
            detail: { id: p.id, name: p.name, price: p.price, image: p.image, qty, open }
        }));
    }

    function buyNow(p, qty) {
        addToCart(p, qty, false);
        window.location.href = 'checkout.html';
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

        document.title = p.name + ' | Picaso';
        document.getElementById('crumbName').textContent = p.name;
        document.getElementById('productName').textContent = p.name;
        document.getElementById('productSize').textContent = p.size;
        document.getElementById('productPrice').textContent = fmt(p.price);

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
        p.features.forEach((f) => {
            const li = document.createElement('li');
            li.textContent = f;
            ul.appendChild(li);
        });
        body.appendChild(ul);
        add('h3', 'How to use');
        add('p', p.usage);
        const note = add('div', p.note);
        note.className = 'note-box';
    }

    /* ================= REVIEWS ================= */
    function initReviews(p) {
        const form = document.getElementById('reviewForm');
        const errorEl = document.getElementById('reviewError');
        const picker = document.getElementById('starPicker');
        let rating = 0;
        let reviewsList = []; // Stores fetched reviews in memory

        function paintPicker() {
            if (!picker) return;
            picker.querySelectorAll('button').forEach((b) => {
                const on = Number(b.dataset.value) <= rating;
                b.classList.toggle('is-on', on);
                b.setAttribute('aria-checked', String(Number(b.dataset.value) === rating));
            });
        }

        if (picker) {
            picker.addEventListener('click', (e) => {
                const b = e.target.closest('button[data-value]');
                if (!b) return;
                rating = Number(b.dataset.value);
                paintPicker();
            });
        }

        function render() {
            const productReviews = reviewsList.filter(r => String(r.productId) === String(p.id));
            const count = productReviews.length;
            const avg = count ? productReviews.reduce((s, r) => s + Number(r.rating), 0) / count : 0;

            const avgRatingEl = document.getElementById('avgRating');
            const avgStarsEl = document.getElementById('avgStars');
            const topStarsEl = document.getElementById('topStars');
            const reviewCountEl = document.getElementById('reviewCount');
            const topRatingTextEl = document.getElementById('topRatingText');
            const wrap = document.getElementById('reviewList');

            if (avgRatingEl) avgRatingEl.textContent = avg.toFixed(1);
            if (avgStarsEl) avgStarsEl.textContent = stars(Math.round(avg));
            if (topStarsEl) topStarsEl.textContent = stars(Math.round(avg));

            const label = count ? `${count} review${count > 1 ? 's' : ''}` : 'No reviews yet';
            if (reviewCountEl) reviewCountEl.textContent = label;
            if (topRatingTextEl) topRatingTextEl.textContent = count ? `${avg.toFixed(1)} · ${label}` : label;

            if (wrap) {
                wrap.innerHTML = '';
                if (!count) {
                    const empty = document.createElement('p');
                    empty.className = 'review-empty';
                    empty.textContent = 'No reviews yet. Be the first to share your experience!';
                    wrap.appendChild(empty);
                    return;
                }

                productReviews.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((r) => {
                    const item = document.createElement('article');
                    item.className = 'review-item';

                    const head = document.createElement('div');
                    head.className = 'review-item__head';

                    const name = document.createElement('span');
                    name.className = 'review-item__name';
                    name.textContent = r.name;

                    const date = document.createElement('span');
                    date.className = 'review-item__date';
                    const dateObj = new Date(r.date);
                    date.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                    head.append(name, date);

                    const st = document.createElement('div');
                    st.className = 'stars';
                    st.textContent = stars(Number(r.rating));
                    st.setAttribute('aria-label', `${r.rating} out of 5 stars`);

                    const text = document.createElement('p');
                    text.textContent = r.text;

                    item.append(head, st, text);
                    wrap.appendChild(item);
                });
            }
        }

        async function loadReviews() {
            try {
                const result = await fetchFromGoogleSheet('Reviews', 'REVIEWS_FETCH');
                reviewsList = result.rows.map(row => ({
                    productId: row.productId || row.ProductId || row.productid,
                    name: row.name || row.Name,
                    rating: Number(row.rating || row.Rating || 0),
                    text: row.text || row.Text,
                    date: row.date || row.Date
                }));
                render();
            } catch (error) {
                console.error('Failed to load reviews:', error);
                render(); // Fallback to empty state
            }
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('reviewName');
                const textInput = document.getElementById('reviewText');
                const name = nameInput ? nameInput.value.trim() : '';
                const text = textInput ? textInput.value.trim() : '';

                if (!rating) {
                    if (errorEl) errorEl.textContent = 'Please select a star rating.';
                    return;
                }
                if (name.length < 2) {
                    if (errorEl) errorEl.textContent = 'Please enter your name.';
                    return;
                }
                // ✅ UPDATED VALIDATION: Only checks if text is not empty (allows "good")
                if (text.length === 0) {
                    if (errorEl) errorEl.textContent = 'Please write a review about your experience.';
                    return;
                }

                if (errorEl) errorEl.textContent = '';

                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';
                }

                const newReview = {
                    productId: p.id,
                    name: name,
                    rating: rating,
                    text: text,
                    date: new Date().toISOString()
                };

                try {
                    await sendToGoogleSheet('Reviews', newReview, 'REVIEWS_STORE');
                    reviewsList.push(newReview); // Optimistically update local list
                    render();
                    form.reset();
                    rating = 0;
                    paintPicker();
                } catch (error) {
                    if (errorEl) errorEl.textContent = 'Failed to submit review. Please try again.';
                    console.error('Review submission error:', error);
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit review';
                    }
                }
            });
        }

        loadReviews();
    }

    // Footer year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});