document.addEventListener("DOMContentLoaded", () => {
    /* ========== MOBILE MENU ========== */
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    const closeMenu = () => {
        navLinks.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => { if (window.innerWidth > 768) closeMenu(); });

    /* ========== ACTIVE LINK HIGHLIGHT ON SCROLL ========== */
    // const sections = ["home", "about", "contact"].map(id => document.getElementById(id));
    // const links = navLinks.querySelectorAll("a");
    // const setActive = () => {
    //     const y = window.scrollY + 120;
    //     let current = "home";
    //     sections.forEach(sec => { if (sec && sec.offsetTop <= y) current = sec.id; });
    //     links.forEach(a => {
    //         const href = a.getAttribute("href");
    //         a.classList.toggle("active",
    //             (current === "home" && href === "index.html") || href === "#" + current);
    //     });
    // };
    // window.addEventListener("scroll", setActive, { passive: true });
    // setActive();
    const homeSection = document.getElementById("home");

    if (homeSection) {
        const sections = ["home", "about", "contact"].map(id => document.getElementById(id));
        const links = navLinks.querySelectorAll("a");
        const setActive = () => {
            const y = window.scrollY + 120;
            let current = "home";
            sections.forEach(sec => { if (sec && sec.offsetTop <= y) current = sec.id; });
            links.forEach(a => {
                const href = a.getAttribute("href");
                a.classList.toggle("active",
                    (current === "home" && href === "index.html") || href === "#" + current);
            });
        };
        window.addEventListener("scroll", setActive, { passive: true });
        setActive();
    }

    /* ========== CART ========== */
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("overlay");
    const cartItemsEl = document.getElementById("cartItems");
    const cartTotalEl = document.getElementById("cartTotal");
    const cartBadge = document.getElementById("cartBadge");
    const CART_KEY = "picaso_cart";

    let cart = [];
    try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }

    // const money = n => "৳ " + n.toLocaleString("en-US");
    const money = n => "৳ " + (Number(n) || 0).toLocaleString("en-US");
    const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { } };

    const openCart = () => {
        drawer.classList.add("open");
        overlay.classList.add("show");
        drawer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    };
    const closeCart = () => {
        drawer.classList.remove("open");
        overlay.classList.remove("show");
        drawer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    };

    function renderCart() {
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        } else {
            cartItemsEl.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <p class="ci-name">${item.name}</p>
            <p class="ci-price">${money(item.price)}</p>
            <div class="qty">
              <button data-action="dec" aria-label="Decrease quantity">&minus;</button>
              <span>${item.qty}</span>
              <button data-action="inc" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button class="ci-remove" data-action="remove">Remove</button>
        </div>
      `).join("");
        }
        const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const count = cart.reduce((sum, i) => sum + i.qty, 0);
        cartTotalEl.textContent = money(total);
        cartBadge.textContent = count;
        cartBadge.style.display = count ? "grid" : "none";
        save();
    }

    // Listen for quantity changes made on the checkout page to keep the drawer in sync
    document.addEventListener('picaso:cart-updated', () => {
        try {
            cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (e) {
            cart = [];
        }
        renderCart();
    });

    function addToCart(product) {
        const existing = cart.find(i => i.id === product.id);
        if (existing) existing.qty += 1;
        else cart.push({ ...product, qty: 1 });
        renderCart();
        openCart();
    }

    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", () => {
            addToCart({
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: Number(btn.dataset.price),
                image: btn.dataset.image
            });
        });
    });

    cartItemsEl.addEventListener("click", e => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const id = btn.closest(".cart-item").dataset.id;
        const item = cart.find(i => i.id === id);
        if (!item) return;
        const action = btn.dataset.action;
        if (action === "inc") item.qty += 1;
        if (action === "dec") item.qty = Math.max(1, item.qty - 1);
        if (action === "remove") cart = cart.filter(i => i.id !== id);
        renderCart();
    });

    document.getElementById("cartOpen").addEventListener("click", openCart);
    document.getElementById("cartClose").addEventListener("click", closeCart);
    overlay.addEventListener("click", closeCart);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });

    document.getElementById("checkoutBtn").addEventListener("click", () => {
        if (cart.length === 0) return alert("Your cart is empty.");
        window.location.href = 'checkout.html';
    });

    renderCart();

    /* ========== LISTEN FOR SHOP PAGE ADD-TO-CART EVENT ========== */
    document.addEventListener('picaso:add-to-cart', (e) => {
        const { id, name, price, image, qty, open } = e.detail;

        // Check if product already exists in cart
        const existing = cart.find(i => i.id === id);

        if (existing) {
            // If it exists, add the selected quantity to the existing quantity
            existing.qty += qty;
        } else {
            // If it's new, push it with the selected quantity
            cart.push({ id, name, price, image, qty });
        }

        // Update the UI and save to localStorage
        renderCart();

        // Open the cart drawer if requested by the shop page
        if (open) {
            openCart();
        }
    });

    /* ========== CONTACT FORM ========== */
    const form = document.getElementById("contactForm");
    const success = document.getElementById("formSuccess");

    const rules = {
        name: v => v.trim().length >= 2 || "Please enter your name.",
        phone: v => /^(?:\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, "")) || "Enter a valid Bangladeshi phone number.",
        message: v => v.trim().length >= 5 || "Please write a short message."
    };

    form.addEventListener("submit", e => {
        e.preventDefault();
        success.hidden = true;
        let valid = true;

        Object.keys(rules).forEach(field => {
            const input = form.elements[field];
            const result = rules[field](input.value);
            const errEl = form.querySelector(`.error[data-for="${field}"]`);
            const wrap = input.closest(".field");
            if (result !== true) {
                valid = false;
                errEl.textContent = result;
                wrap.classList.add("invalid");
            } else {
                errEl.textContent = "";
                wrap.classList.remove("invalid");
            }
        });

        if (!valid) return;

        // TODO: send form data to your backend / email service here
        form.reset();
        success.hidden = false;
    });

    /* ========== FOOTER YEAR ========== */
    document.getElementById("year").textContent = new Date().getFullYear();
});