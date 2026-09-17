/* Cart display estimates never replace Shopify's server-side discount rules. */
(() => {
  const quantity = (value) =>
    Number.isFinite(Number(value))
      ? Math.max(0, Math.min(100, Math.floor(Number(value))))
      : 0;
  const percentPrice = (amount, rate) =>
    Math.max(
      0,
      Math.round(
        amount * (1 - Math.min(100, Math.max(0, Number(rate) || 0)) / 100),
      ),
    );
  function quantitiesFor(type, bar, count) {
    if (type === "Volume discount") return [quantity(bar?.buyQuantity ?? 1)];
    if (type === "Buy X get Y") {
      const buy = quantity(bar?.buyQuantity ?? 1),
        get = quantity(bar?.getQuantity ?? 1);
      return count === 1 ? [buy + get] : [buy, get];
    }
    return Array.from({ length: count }, () => 1);
  }
  function totals(type, bar, variants, quantities, discount) {
    const regular = variants.reduce(
      (sum, variant, index) => sum + (variant?.price ?? 0) * quantities[index],
      0,
    );
    if (type === "Buy X get Y") {
      const buy = quantity(bar?.buyQuantity ?? 1),
        get = quantity(bar?.getQuantity ?? 1);
      const giftPrice = (variants[1] ?? variants[0])?.price ?? 0;
      const paid = (variants[0]?.price ?? 0) * buy;
      return {
        regular,
        price:
          paid +
          percentPrice(
            giftPrice * get,
            bar?.getPriceMethod === "free"
              ? 100
              : (bar?.getDiscount ?? discount),
          ),
      };
    }
    return {
      regular,
      price: percentPrice(
        regular,
        type === "Volume discount"
          ? bar?.getPriceMethod === "free"
            ? 100
            : (bar?.getDiscount ?? discount)
          : discount,
      ),
    };
  }
  function mergeItems(items) {
    const result = new Map();
    for (const item of items) {
      if (!item.quantity) continue;
      const key = String(item.id) + JSON.stringify(item.properties);
      if (result.has(key)) result.get(key).quantity += item.quantity;
      else result.set(key, { ...item });
    }
    return [...result.values()];
  }
  // Pure helpers are also exercised by the Node regression tests.
  if (typeof module !== "undefined")
    module.exports = { quantitiesFor, totals, mergeItems };
  if (typeof document === "undefined") return;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[ch],
    );
  const base = () => window.Shopify?.routes?.root || "/";
  async function json(url, options) {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(
        payload.description || payload.error || "Unable to update your cart.",
      );
    return payload;
  }
  async function render(root) {
    if (root.dataset.loaded) return;
    root.dataset.loaded = "1";
    const list = root.querySelector("[data-bundle-list]");
    const loading = root.querySelector(".bundleflow-widget__loading");
    const message = root.querySelector("[data-bundle-message]");
    try {
      const url = new URL(root.dataset.apiUrl);
      url.searchParams.set("shop", root.dataset.shop);
      url.searchParams.set("product", root.dataset.currentProductId);
      const data = await json(url);
      if (!data.bundles?.length) {
        root.hidden = true;
        return;
      }
      const cache = new Map();
      const loadProduct = (product) => {
        if (!cache.has(product.handle))
          cache.set(
            product.handle,
            json(
              base() + "products/" + encodeURIComponent(product.handle) + ".js",
            ).catch(() => null),
          );
        return cache.get(product.handle);
      };
      // Theme AJAX prices are presentment-currency values. Cart currency is authoritative.
      const cart = await json(base() + "cart.js");
      const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: cart.currency,
      });
      const money = (amount) => formatter.format(amount / 100);
      const offers = [];
      for (const bundle of data.bundles) {
        const products = await Promise.all(bundle.products.map(loadProduct));
        if (products.some((product) => !product)) continue;
        const bars = ["Buy X get Y", "Volume discount"].includes(bundle.type)
          ? (bundle.configuration?.bars ?? [])
          : [null];
        for (const bar of bars) offers.push({ bundle, bar, products });
      }
      loading.remove();
      if (!offers.length) {
        root.hidden = true;
        return;
      }
      root.querySelector(".bundleflow-widget__header h2").textContent =
        offers[0].bundle.configuration?.settings?.blockTitle || "Bundle & save";
      let selected = offers.findIndex(
        (offer) => offer.bar?.selectedByDefault && !offer.bar?.soldOut,
      );
      if (selected < 0)
        selected = Math.min(
          offers.length - 1,
          Math.max(0, Number(root.dataset.defaultOffer || 1) - 1),
        );
      const cards = [];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "bundleflow-submit";
      button.textContent = root.dataset.buttonLabel || "Add bundle to cart";
      list.after(button);
      if (root.dataset.showButton === "false") button.hidden = true;
      let adding = false;
      for (const [index, offer] of offers.entries()) {
        const { bundle, bar, products } = offer;
        const flexible = ["Mix & match", "Build your own"].includes(
          bundle.type,
        );
        const counts = quantitiesFor(bundle.type, bar, products.length);
        const used = flexible ? products : products.slice(0, counts.length);
        const card = document.createElement("article");
        card.className = "bf-offer";
        const style = bundle.configuration?.style;
        if (style) {
          for (const [key, variable] of Object.entries({
            cardsBg: "--bf-card",
            selectedBg: "--bf-selected",
            borderColor: "--bf-border",
            price: "--bf-price",
            fullPrice: "--bf-full-price",
          })) {
            if (/^#[0-9a-f]{6}$/i.test(style[key] || ""))
              card.style.setProperty(variable, style[key]);
          }
          if (Number.isFinite(style.cornerRadius))
            card.style.setProperty(
              "--bf-radius",
              Math.max(0, Math.min(30, style.cornerRadius)) + "px",
            );
          if (index === 0) {
            list.style.gap =
              Math.max(0, Math.min(30, style.spacing ?? 8)) + "px";
            list.classList.add("bf-layout-" + style.layout);
            if (/^#[0-9a-f]{6}$/i.test(style.blockTitle || ""))
              root.querySelector(".bundleflow-widget__header h2").style.color =
                style.blockTitle;
          }
        }
        const variantRows = used.map((product, i) => {
          const currentId =
            product.handle === root.dataset.currentProductHandle
              ? root
                  .closest(".shopify-section")
                  ?.querySelector('form[action*="/cart/add"] [name="id"]')
                  ?.value
              : null;
          const available = product.variants.filter(
            (variant) => variant.available,
          );
          const current =
            available.find(
              (variant) => String(variant.id) === String(currentId),
            ) ?? available[0];
          return {
            product,
            variants: available,
            selected: current?.id,
            quantity: flexible ? 0 : counts[i],
          };
        });
        const unavailable =
          bar?.soldOut ||
          (flexible
            ? variantRows.every((row) => !row.variants.length)
            : variantRows.some(
                (row) => row.quantity > 0 && !row.variants.length,
              )) ||
          !variantRows.length;
        if (unavailable) card.classList.add("is-sold-out");
        card.innerHTML =
          '<label class="bf-offer__main"><input type="radio" name="bf-offer-' +
          esc(root.id) +
          '" value="' +
          index +
          '" ' +
          (unavailable ? "disabled" : "") +
          '><span class="bf-offer__name"><strong>' +
          esc(bar?.title || bundle.name) +
          "</strong><small>" +
          esc(bar?.subtitle || "") +
          '</small></span><span class="bf-price"></span></label><div class="bf-products"></div>';
        const settings = bundle.configuration?.settings;
        const required = quantity(settings?.exactItems ?? 1);
        const min = quantity(settings?.minimumItems ?? 1),
          max = quantity(settings?.maximumItems ?? 100);
        if (flexible) {
          const hint = document.createElement("p");
          hint.className = "bf-selection-hint";
          hint.textContent =
            bundle.type === "Mix & match"
              ? "Choose " + required + " items."
              : "Choose " + min + "–" + max + " items.";
          card.querySelector(".bf-products").appendChild(hint);
        }
        for (const [rowIndex, row] of variantRows.entries()) {
          const label = document.createElement("label");
          label.className = "bf-product";
          label.innerHTML =
            "<span>" +
            esc(row.product.title) +
            '</span><select aria-label="Variant for ' +
            esc(row.product.title) +
            '">' +
            row.variants
              .map(
                (variant) =>
                  '<option value="' +
                  esc(variant.id) +
                  '" ' +
                  (variant.id === row.selected ? "selected" : "") +
                  ">" +
                  esc(variant.title) +
                  "</option>",
              )
              .join("") +
            "</select>" +
            (flexible
              ? '<input type="number" min="0" max="100" step="1" value="0" aria-label="Quantity for ' +
                esc(row.product.title) +
                '">'
              : "<span>× " + row.quantity + "</span>");
          const select = label.querySelector("select");
          select.disabled = !row.variants.length;
          select.addEventListener("change", () => {
            variantRows[rowIndex].selected = Number(select.value);
            update();
          });
          const input = label.querySelector("input");
          if (input) input.disabled = !row.variants.length;
          input?.addEventListener("input", () => {
            variantRows[rowIndex].quantity = quantity(input.value);
            update();
          });
          card.querySelector(".bf-products").appendChild(label);
        }
        card
          .querySelector('input[type="radio"]')
          .addEventListener("change", () => {
            selected = index;
            update();
          });
        cards.push({
          element: card,
          unavailable,
          rows: variantRows,
          offer,
          valid: false,
          required,
          min,
          max,
          flexible,
        });
        list.appendChild(card);
      }
      const notice = document.createElement("p");
      notice.className = "bf-checkout-note";
      notice.textContent =
        "Estimated offer total. Discounts are calculated at checkout.";
      button.after(notice);
      function update() {
        cards.forEach((card, index) => {
          const checked = index === selected;
          card.element.classList.toggle("is-selected", checked);
          card.element.querySelector('input[type="radio"]').checked = checked;
          card.element.querySelector(".bf-products").hidden = !checked;
          const variants = card.rows.map((row) =>
            row.variants.find((variant) => variant.id === row.selected),
          );
          const quantities = card.rows.map((row) => row.quantity);
          const count = quantities.reduce((sum, value) => sum + value, 0);
          card.valid =
            !card.unavailable &&
            variants.every((variant, i) => variant || quantities[i] === 0) &&
            count > 0 &&
            (!card.flexible ||
              (card.offer.bundle.type === "Mix & match"
                ? count === card.required
                : count >= card.min && count <= card.max));
          if (variants.every((variant, i) => variant || quantities[i] === 0)) {
            const result = totals(
              card.offer.bundle.type,
              card.offer.bar,
              variants,
              quantities,
              card.offer.bundle.discount,
            );
            card.element.querySelector(".bf-price").innerHTML =
              "<strong>" +
              money(result.price) +
              "</strong><s>" +
              money(result.regular) +
              "</s>";
          }
        });
        button.disabled = adding || !cards[selected]?.valid;
      }
      if (cards[selected]?.unavailable)
        selected = cards.findIndex((card) => !card.unavailable);
      update();
      button.addEventListener("click", async () => {
        const card = cards[selected];
        if (adding || !card?.valid) return;
        adding = true;
        update();
        button.textContent = "Adding…";
        message.textContent = "";
        const { bundle, bar } = card.offer;
        const properties = {
          _BundleFlow: bundle.id,
          "_BundleFlow offer": bar?.id || bundle.id,
          ...(bundle.configuration?.settings?.discountName
            ? {
                "_BundleFlow label": bundle.configuration.settings.discountName,
              }
            : {}),
        };
        const items = mergeItems(
          card.rows.map((row) => ({
            id: row.selected,
            quantity: row.quantity,
            properties,
          })),
        );
        try {
          await json(base() + "cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          message.textContent = "Bundle added to your cart.";
          document.documentElement.dispatchEvent(
            new CustomEvent("cart:refresh", { bubbles: true }),
          );
        } catch (error) {
          message.textContent = error.message;
        } finally {
          adding = false;
          button.textContent = root.dataset.buttonLabel || "Add bundle to cart";
          update();
        }
      });
    } catch (error) {
      if (loading.isConnected)
        loading.textContent = "Bundles are temporarily unavailable.";
      message.textContent =
        error instanceof Error ? error.message : "Please try again.";
      root.dataset.loaded = "";
    }
  }
  const init = () =>
    document.querySelectorAll("[data-bundleflow]").forEach(render);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
  document.addEventListener("shopify:section:load", (event) =>
    event.target.querySelectorAll("[data-bundleflow]").forEach(render),
  );
})();
