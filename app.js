(() => {
  "use strict";

  const cfg = window.SHOP_CONFIG || {};
  const currency = cfg.currencyLabel || "HK$";
  const freeAtAmount = Number(cfg.freeShippingAtAmount || 220);
  const shipFee = Number(cfg.shippingFee || 30);

  let catalog = Array.isArray(window.SHOP_CATALOG) ? window.SHOP_CATALOG : [];
  let products = [];
  let productsById = {};

  function setCatalog(items) {
    catalog = Array.isArray(items) ? items : [];
    products = catalog.filter((p) => p && p.enabled !== false);
    productsById = Object.fromEntries(products.map((p) => [p.id, p]));
  }

  // Prefer `catalog.json` when available, so the site always reflects updates
  // from the GUI editor (which writes JSON). Falls back to `catalog.js`.
  async function loadCatalogPreferJson() {
    try {
      const v = String(window.__SHOP_V__ || Date.now());
      const res = await fetch(`catalog.json?v=${encodeURIComponent(v)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCatalog(data);
        return;
      }
    } catch (_) {
      // ignore
    }
    setCatalog(catalog);
  }

  const state = {
    cart: {}, // { [id]: qty }
    orderId: "",
    submitting: false,
  };

  const $ = (id) => document.getElementById(id);

  function money(n) {
    return currency + Number(n || 0).toFixed(0);
  }

  function cartLines() {
    return Object.keys(state.cart)
      .map((id) => ({ product: productsById[id], qty: Number(state.cart[id] || 0) }))
      .filter((L) => L.product && L.qty > 0);
  }

  function unitCount() {
    return cartLines().reduce((s, L) => {
      const packs = Number(L.product.packs || cfg.unitPerQty || 10);
      return s + L.qty * packs;
    }, 0);
  }

  function subtotal() {
    return cartLines().reduce((s, L) => s + L.product.price * L.qty, 0);
  }

  function shipping(subtotalAmount) {
    return subtotalAmount >= freeAtAmount ? 0 : shipFee;
  }

  function total() {
    const sub = subtotal();
    return sub + shipping(sub);
  }

  function setQty(id, qty) {
    const q = Math.max(0, Math.min(99, parseInt(qty, 10) || 0));
    if (q === 0) delete state.cart[id];
    else state.cart[id] = q;
    renderCart();
    renderCartMobile();
    renderShopRows();
  }

  function bump(id, delta) {
    setQty(id, (state.cart[id] || 0) + delta);
  }

  function genOrderId() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "DRIFT-" + y + m + day + "-" + r;
  }

  function renderShopRows() {
    const root = $("shop-grid");
    if (!root) return;

    // Layout logic:
    // - Mobile: 1 col
    // - Small+: 2 cols
    // - Large: prefer 3 cols, but avoid an orphan last item (e.g. 4 items => 2x2).
    const n = products.length;
    const preferTwoOnLg = n === 4 || n % 3 === 1; // 4,7,10,... look better as 2 columns
    const gridCls = preferTwoOnLg ? "lg:grid-cols-2" : "lg:grid-cols-3";

    const rows = products
      .map((p) => {
        const q = Number(state.cart[p.id] || 0);
        return `
          <article class="group border border-[#222] bg-[#111]">
            <div class="aspect-[16/10] bg-[#1a1a1a]"></div>
            <div class="p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="truncate text-[13px] tracking-[0.14em] uppercase text-[#ededed]">${escapeHtml(
                    p.name || ""
                  )}</div>
                  <div class="mt-2 text-[12px] leading-relaxed text-[#9a9a9a]">${escapeHtml(
                    p.description || ""
                  )}</div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-[12px] tracking-[0.12em] text-[#ededed]">${money(
                    p.price
                  )}</div>
                      <div class="mt-1 text-[11px] text-[#777]">${Number(
                        p.packs || cfg.unitPerQty || 10
                      )} packs</div>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-between">
                <div class="text-[11px] tracking-[0.16em] text-[#777]">${money(
                  (p.price || 0) * q
                )}</div>
                <div class="flex items-center gap-2">
                  <button class="h-9 w-9 border border-[#222] bg-[#0a0a0a] text-[#ededed] hover:bg-[#111] transition" data-act="dec" data-id="${escapeAttr(
                    p.id
                  )}" aria-label="Decrease">−</button>
                  <div class="w-10 text-center text-[12px] text-[#ededed] tabular-nums">${q}</div>
                  <button class="h-9 w-9 border border-[#222] bg-[#ededed] text-[#0a0a0a] hover:bg-white transition" data-act="inc" data-id="${escapeAttr(
                    p.id
                  )}" aria-label="Increase">+</button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    root.innerHTML = `
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 ${gridCls}">
        ${rows}
      </div>
    `;

    root.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const act = btn.getAttribute("data-act");
        if (!id) return;
        if (act === "inc") bump(id, 1);
        if (act === "dec") bump(id, -1);
      });
    });
  }

  function renderCart() {
    const lines = cartLines();
    const units = unitCount();
    const sub = subtotal();
    const ship = shipping(sub);
    const grand = sub + ship;

    if ($("cart-units")) $("cart-units").textContent = String(units);
    if ($("cart-subtotal")) $("cart-subtotal").textContent = money(sub);
    if ($("cart-shipping"))
      $("cart-shipping").textContent = ship === 0 ? "Free" : money(ship);
    if ($("cart-total")) $("cart-total").textContent = money(grand);
    if ($("cart-ship-rule"))
      $("cart-ship-rule").textContent =
        sub >= freeAtAmount
          ? "Free shipping applied"
          : `Free shipping at ${money(freeAtAmount)}`;

    const list = $("cart-lines");
    if (!list) return;
    if (lines.length === 0) {
      list.innerHTML =
        '<div class="py-10 text-center text-[12px] text-[#777]">Empty</div>';
      if ($("btn-checkout")) $("btn-checkout").disabled = true;
      return;
    }
    if ($("btn-checkout")) $("btn-checkout").disabled = false;

    list.innerHTML = lines
      .map((L) => {
        return `
          <div class="flex items-start justify-between gap-3 py-3 border-b border-[#1a1a1a] last:border-b-0">
            <div class="min-w-0">
              <div class="truncate text-[12px] tracking-[0.14em] uppercase text-[#ededed]">${escapeHtml(
                L.product.name || ""
              )}</div>
              <div class="mt-1 text-[11px] text-[#777]">${money(
                L.product.price
              )} · x${L.qty}</div>
            </div>
            <div class="shrink-0 text-[12px] text-[#ededed] tabular-nums">${money(
              L.product.price * L.qty
            )}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderCartMobile() {
    const bar = $("cart-mobile");
    if (!bar) return;
    const lines = cartLines();
    bar.hidden = lines.length === 0;
    if ($("cart-mobile-total")) $("cart-mobile-total").textContent = money(total());
    if ($("cart-mobile-units")) $("cart-mobile-units").textContent = String(unitCount());
  }

  function openCheckout() {
    if (cartLines().length === 0) return;
    state.orderId = genOrderId();
    if ($("order-id-display")) $("order-id-display").textContent = state.orderId;
    if ($("remark-note"))
      $("remark-note").textContent =
        (cfg.fpsNote || "Please put the Order ID in the transfer remark.") +
        " (Remark: " +
        state.orderId +
        ")";
    if ($("payme-link")) $("payme-link").href = cfg.payMeUrl || "#";
    if ($("fps-id")) $("fps-id").textContent = cfg.fpsId || "";
    if ($("order-id")) $("order-id").value = state.orderId;
    const summary = buildOrderSummary();
    if ($("order-summary")) $("order-summary").value = summary;
    if ($("order-summary-display")) $("order-summary-display").textContent = summary;
    const m = $("checkout");
    if (m) m.hidden = false;
    if ($("field-name")) $("field-name").focus();
  }

  function closeCheckout() {
    const m = $("checkout");
    if (m) m.hidden = true;
  }

  async function copyText(text) {
    const t = String(text || "").trim();
    if (!t) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "true");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function buildOrderSummary() {
    const lines = cartLines();
    const units = unitCount();
    const sub = subtotal();
    const ship = shipping(sub);
    const grand = sub + ship;
    let t = "";
    t += "Order ID: " + state.orderId + "\n\n";
    for (const L of lines) {
      const packs = Number(L.product.packs || cfg.unitPerQty || 10);
      t += `${L.product.name} × ${L.qty}  @ ${money(L.product.price)}  = ${money(
        L.product.price * L.qty
      )}\n`;
      t += `  ${packs} packs / item\n`;
    }
    t += `\nPacks: ${units}\nSubtotal: ${money(sub)}\nShipping: ${
      ship === 0 ? "Free" : money(ship)
    }\nTotal: ${money(grand)}\n`;
    t += "\nPayment: PayMe or FPS\n";
    t += (cfg.fpsNote || "Please put the Order ID in the transfer remark.") + "\n";
    return t.trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function initNav() {
    // One-page layout: native anchor links only.
  }

  function initCheckout() {
    const openers = [$("btn-checkout"), $("btn-checkout-mobile")].filter(Boolean);
    openers.forEach((b) => b.addEventListener("click", openCheckout));
    if ($("btn-close-checkout"))
      $("btn-close-checkout").addEventListener("click", closeCheckout);
    if ($("checkout-backdrop"))
      $("checkout-backdrop").addEventListener("click", (e) => {
        if (e.target && e.target.id === "checkout-backdrop") closeCheckout();
      });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCheckout();
    });

    const copyOrderBtn = $("btn-copy-order-id");
    if (copyOrderBtn) {
      copyOrderBtn.addEventListener("click", async () => {
        const ok = await copyText(state.orderId);
        copyOrderBtn.textContent = ok ? "Copied" : "Copy";
        if (ok) setTimeout(() => (copyOrderBtn.textContent = "Copy"), 900);
      });
    }

    const copyFpsBtn = $("btn-copy-fps");
    if (copyFpsBtn) {
      copyFpsBtn.addEventListener("click", async () => {
        const ok = await copyText(cfg.fpsId || "");
        copyFpsBtn.textContent = ok ? "Copied" : "Copy";
        if (ok) setTimeout(() => (copyFpsBtn.textContent = "Copy"), 900);
      });
    }

    const form = $("form-order");
    if (form) {
      form.addEventListener("submit", async (ev) => {
        const summary = buildOrderSummary();
        if ($("order-summary")) $("order-summary").value = summary;
        if ($("order-summary-display")) $("order-summary-display").textContent = summary;

        const endpoint = String(cfg.orderEndpoint || "").trim();
        if (!endpoint) return; // allow normal HTML form submission if configured later

        ev.preventDefault();
        if (state.submitting) return;
        state.submitting = true;

        const btn = $("btn-submit-order");
        const oldBtnText = btn ? btn.textContent : "";
        if (btn) btn.textContent = "Sending...";

        const phone = (form.querySelector('[name="phone"]') || {}).value || "";
        const email = (form.querySelector('[name="email"]') || {}).value || "";
        const payload = {
          orderId: state.orderId,
          createdAt: new Date().toISOString(),
          name: (form.querySelector('[name="name"]') || {}).value || "",
          phone,
          // Keep backward compatibility with the existing Apps Script email template.
          // We only show one field in the UI, so reuse the same value here.
          whatsapp: phone,
          address: (form.querySelector('[name="address"]') || {}).value || "",
          email,
          // Apps Script template may still print `note`, so mirror email there too.
          note: email,
          summary,
        };

        try {
          // Apps Script Web App doesn't reliably support CORS.
          // Use no-cors so the POST can still reach the script (response is opaque).
          await fetch(endpoint, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
          });
          if (btn) btn.textContent = "Sent";
          setTimeout(() => closeCheckout(), 600);
          setTimeout(() => {
            state.cart = {};
            renderShopRows();
            renderCart();
            renderCartMobile();
          }, 650);
        } catch (e) {
          console.error("Order submit failed:", e);
          if (btn) btn.textContent = "Failed — Try again";
          setTimeout(() => {
            if (btn) btn.textContent = oldBtnText || "Submit";
          }, 1200);
        } finally {
          state.submitting = false;
        }
      });
    }
  }

  async function boot() {
    await loadCatalogPreferJson();
    renderShopRows();
    renderCart();
    renderCartMobile();
    initCheckout();
    const clearBtn = $("btn-clear");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      state.cart = {};
      renderShopRows();
      renderCart();
      renderCartMobile();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot());
  } else {
    void boot();
  }
})();