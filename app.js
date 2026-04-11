(() => {
  "use strict";

  const cfg = window.SHOP_CONFIG || {};
  const currency = cfg.currencyLabel || "HK$";
  const freeAtAmount = Number(cfg.freeShippingAtAmount || 220);
  const shipFee = Number(cfg.shippingFee || 30);
  const packGramLabel = String(cfg.packGramLabel || "12g").trim();

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
    /** @type {null | { base64: string; mime: string; name: string; previewUrl: string }} */
    paymentProof: null,
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

  /**
   * 結帳開著、背景半透明時：+ 要夠亮，但不可與左邊 − 用同一套樣式（否則兩格看起來都像減號格）。
   * #about / #contact 維持原本白底 +。
   */
  function invertQtyPlusForCheckoutOverlay() {
    if (!document.body.classList.contains("checkout-open")) return false;
    const h = String(location.hash || "").toLowerCase().trim();
    if (h === "#about" || h === "#contact") return false;
    return true;
  }

  function renderShopRows() {
    const root = $("shop-grid");
    if (!root) return;

    // Layout: 1 col mobile, 2 cols from sm+ (never 3 — reads calmer on desktop).

    const rows = products
      .map((p) => {
        const q = Number(state.cart[p.id] || 0);
        const incPlusContrast = invertQtyPlusForCheckoutOverlay();
        const incBtnClass = incPlusContrast
          ? "h-9 w-9 box-border border-2 border-[#c8c8c8] bg-[#1a1a1a] text-[#fafafa] text-[17px] font-medium leading-none hover:bg-[#252525] transition"
          : "h-9 w-9 border border-[#222] bg-[#ededed] text-[#0a0a0a] hover:bg-white transition";
        const img = String(p.imageUrl || "").trim();
        const media = img
          ? `
            <div class="aspect-[16/10] bg-[#1a1a1a] overflow-hidden">
              <img src="${escapeAttr(
                img
              )}" alt="" loading="lazy" class="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition" onerror="this.remove()" />
            </div>
          `
          : "";
        return `
          <article class="group border border-[#222] bg-[#111]">
            ${media}
            <div class="p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="truncate text-[13px] tracking-[0.14em] uppercase text-[#ededed]">${escapeHtml(
                    p.name || ""
                  )}</div>
                  <div class="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-[#9a9a9a]">${escapeHtml(
                    p.description || ""
                  )}</div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-[12px] tracking-[0.12em] text-[#ededed]">${money(
                    p.price
                  )}</div>
                      <div class="mt-1 text-[11px] text-[#777]">${escapeHtml(
                        packGramLabel
                      )} · ${Number(p.packs || cfg.unitPerQty || 10)} packs</div>
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
                  <button class="${incBtnClass}" data-act="inc" data-id="${escapeAttr(
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
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
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

  function resetPaymentProof() {
    if (state.paymentProof && state.paymentProof.previewUrl) {
      try {
        URL.revokeObjectURL(state.paymentProof.previewUrl);
      } catch (_) {}
    }
    state.paymentProof = null;
    const input = $("payment-proof-input");
    if (input) input.value = "";
    const err = $("payment-proof-error");
    if (err) {
      err.textContent = "";
      err.classList.add("hidden");
    }
    const fnEl = $("payment-proof-filename");
    if (fnEl) {
      fnEl.textContent = "";
      fnEl.classList.add("hidden");
    }
    const wrap = $("payment-proof-preview-wrap");
    if (wrap) wrap.classList.add("hidden");
    const prev = $("payment-proof-preview");
    if (prev) {
      prev.removeAttribute("src");
    }
    const clr = $("btn-payment-proof-clear");
    if (clr) clr.classList.add("hidden");
  }

  function compressImageToJpegBlob(file, maxW, quality) {
    const mw = maxW == null ? 1680 : maxW;
    const q = quality == null ? 0.85 : quality;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (!w || !h) {
          reject(new Error("image"));
          return;
        }
        if (w > mw) {
          h = Math.round((h * mw) / w);
          w = mw;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("blob"));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result || "");
              const i = dataUrl.indexOf(",");
              const base64 = i >= 0 ? dataUrl.slice(i + 1) : "";
              const baseName = String(file.name || "payment-proof").replace(/\.[^.]+$/, "") || "payment-proof";
              resolve({
                base64,
                mime: "image/jpeg",
                name: baseName + ".jpg",
                blob,
              });
            };
            reader.onerror = () => reject(new Error("read"));
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          q
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("load"));
      };
      img.src = url;
    });
  }

  function initPaymentProofUI() {
    const input = $("payment-proof-input");
    const btnPick = $("btn-payment-proof-pick");
    const btnClear = $("btn-payment-proof-clear");
    const err = $("payment-proof-error");
    const fnEl = $("payment-proof-filename");
    const wrap = $("payment-proof-preview-wrap");
    const prev = $("payment-proof-preview");

    function showProofErr(msg) {
      if (!err) return;
      err.textContent = msg || "";
      err.classList.toggle("hidden", !msg);
    }

    btnPick?.addEventListener("click", () => input?.click());

    btnClear?.addEventListener("click", () => {
      showProofErr("");
      resetPaymentProof();
    });

    input?.addEventListener("change", async () => {
      showProofErr("");
      const file = input.files && input.files[0];
      if (!file) return;
      const maxIn = 12 * 1024 * 1024;
      if (file.size > maxIn) {
        showProofErr("Image must be under 12 MB.");
        input.value = "";
        return;
      }
      try {
        const { base64, mime, name, blob } = await compressImageToJpegBlob(file);
        resetPaymentProof();
        input.value = "";
        const previewUrl = URL.createObjectURL(blob);
        state.paymentProof = { base64, mime, name, previewUrl };
        if (prev) prev.src = previewUrl;
        wrap?.classList.remove("hidden");
        btnClear?.classList.remove("hidden");
        if (fnEl) {
          fnEl.textContent = name;
          fnEl.classList.remove("hidden");
        }
      } catch {
        showProofErr("Could not read this image. Use a JPG, PNG, or WebP screen capture / photo.");
        input.value = "";
      }
    });
  }

  function openCheckout() {
    if (cartLines().length === 0) return;
    resetPaymentProof();
    state.orderId = genOrderId();
    if ($("order-id-display")) $("order-id-display").textContent = state.orderId;
    if ($("remark-note"))
      $("remark-note").textContent =
        (cfg.fpsNote || "Please put the Order ID in the transfer remark.") +
        "\n(Remark: " +
        state.orderId +
        ")";
    if ($("payme-link")) $("payme-link").href = cfg.payMeUrl || "#";
    if ($("fps-id")) $("fps-id").textContent = cfg.fpsId || "";
    if ($("order-id")) $("order-id").value = state.orderId;
    const summary = buildOrderSummary();
    if ($("order-summary")) $("order-summary").value = summary;
    if ($("order-summary-display"))
      $("order-summary-display").innerHTML = orderSummaryDisplayHtml(summary);
    const m = $("checkout");
    if (m) m.hidden = false;
    document.body.classList.add("checkout-open");
    renderShopRows();
    const nameField = $("field-name");
    if (nameField) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            nameField.focus({ preventScroll: true });
          } catch (_) {
            nameField.focus();
          }
        });
      });
    }
  }

  function closeCheckout() {
    const m = $("checkout");
    if (m) m.hidden = true;
    document.body.classList.remove("checkout-open");
    renderShopRows();
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
      t += `${L.product.name} × ${L.qty}  @ ${money(L.product.price)}  = ${money(
        L.product.price * L.qty
      )}\n`;
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

  function orderSummaryDisplayHtml(plain) {
    return String(plain || "")
      .split("\n")
      .map((line) => {
        if (/^Total:\s/.test(line)) {
          return '<strong class="font-bold text-ink-95">' + escapeHtml(line) + "</strong>";
        }
        return escapeHtml(line);
      })
      .join("\n");
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

    window.addEventListener("hashchange", () => {
      if (document.body.classList.contains("checkout-open")) renderShopRows();
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

    initPaymentProofUI();

    const form = $("form-order");
    if (form) {
      form.addEventListener("submit", async (ev) => {
        const summary = buildOrderSummary();
        if ($("order-summary")) $("order-summary").value = summary;
        if ($("order-summary-display")) {
          $("order-summary-display").innerHTML = orderSummaryDisplayHtml(summary);
        }

        const endpoint = String(cfg.orderEndpoint || "").trim();
        if (!endpoint) return;

        ev.preventDefault();
        if (state.submitting) return;

        if (!state.paymentProof || !state.paymentProof.base64) {
          const pe = $("payment-proof-error");
          if (pe) {
            pe.textContent =
              "Please upload your transfer screen capture / photo before submitting.";
            pe.classList.remove("hidden");
            try {
              pe.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (_) {}
          }
          return;
        }

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
          whatsapp: phone,
          address: (form.querySelector('[name="address"]') || {}).value || "",
          email,
          note: email,
          summary,
          paymentProofBase64: state.paymentProof.base64,
          paymentProofMime: state.paymentProof.mime,
          paymentProofFileName: state.paymentProof.name,
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

  function fillDisclaimerEl(el, raw) {
    if (!el) return;
    el.replaceChildren();
    const parts = String(raw || "")
      .split(/\n\s*\n/)
      .map((s) => s.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    for (const para of parts) {
      const p = document.createElement("p");
      p.textContent = para;
      el.appendChild(p);
    }
  }

  function renderDisclaimer() {
    const raw = cfg.disclaimerNote;
    fillDisclaimerEl($("footer-disclaimer"), raw);
    fillDisclaimerEl($("checkout-disclaimer"), raw);
  }

  function renderContactPhone() {
    const el = $("contact-phone-display");
    if (el) el.textContent = String(cfg.contactPhone || "").trim();
  }

  async function boot() {
    await loadCatalogPreferJson();
    renderDisclaimer();
    renderContactPhone();
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