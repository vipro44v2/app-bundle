(() => {
  const money = (n, c) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(
      n,
    );
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>'"]/g,
      (x) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[x],
    );
  async function storefrontVariant(product, root) {
    if (!product?.handle)
      throw Error("A bundle product is missing its storefront handle.");
    const response = await fetch(
      `/products/${encodeURIComponent(product.handle)}.js`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok)
      throw Error(
        `${product.title || "A bundle product"} is not published to this storefront.`,
      );
    const storefrontProduct = await response.json();
    const variants = Array.isArray(storefrontProduct.variants)
      ? storefrontProduct.variants
      : [];
    const currentVariantId =
      product.handle === root.dataset.currentProductHandle
        ? root
            .closest(".shopify-section")
            ?.querySelector('form[action*="/cart/add"] [name="id"]')?.value
        : null;
    const current = variants.find(
      (variant) =>
        String(variant.id) === String(currentVariantId) && variant.available,
    );
    const configured = variants.find(
      (variant) =>
        String(variant.id) === String(product.variantId) && variant.available,
    );
    const variant =
      current || configured || variants.find((item) => item.available);
    if (!variant)
      throw Error(
        `${product.title || storefrontProduct.title || "A bundle product"} has no available variant.`,
      );
    return String(variant.id);
  }
  async function render(root) {
    if (root.dataset.loaded) return;
    root.dataset.loaded = "1";
    const list = root.querySelector("[data-bundle-list]");
    const loading = root.querySelector(".bundleflow-widget__loading");
    const message = root.querySelector("[data-bundle-message]");
    try {
      const response = await fetch(root.dataset.apiUrl);
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Unable to load bundles");
      loading.remove();
      const now = Date.now();
      const activeBundles = data.bundles.filter((bundle) => {
        const settings = bundle.configuration?.settings;
        const currentProductId = root.dataset.currentProductId;
        const currentProductHandle = root.dataset.currentProductHandle;
        const belongsToCurrentProduct =
          !currentProductId ||
          bundle.products.some(
            (product) =>
              product.handle === currentProductHandle ||
              String(product.id).endsWith(`/${currentProductId}`),
          );
        if (!belongsToCurrentProduct) return false;
        if (!settings) return true;
        const start = settings.startDate
          ? Date.parse(
              `${settings.startDate}T${settings.startTime || "00:00"}:00+07:00`,
            )
          : 0;
        const end =
          settings.hasEndDate && settings.endDate
            ? Date.parse(
                `${settings.endDate}T${settings.endTime || "23:59"}:00+07:00`,
              )
            : Infinity;
        return now >= start && now <= end;
      });
      if (!activeBundles.length) {
        root.hidden = true;
        return;
      }
      const configuredHeading =
        activeBundles[0].configuration?.settings?.blockTitle;
      if (configuredHeading)
        root.querySelector(".bundleflow-widget__header h2").textContent =
          configuredHeading;
      const offers = activeBundles.flatMap((bundle) => {
        const configured = bundle.configuration?.bars;
        return configured?.length
          ? configured.map((bar) => ({ bundle, bar }))
          : [{ bundle, bar: null }];
      });
      let selected = offers.findIndex(({ bar }) => bar?.selectedByDefault);
      if (selected < 0)
        selected = Math.min(
          Math.max(Number(root.dataset.defaultOffer || 1) - 1, 0),
          offers.length - 1,
        );
      const cards = [];
      offers.forEach(({ bundle, bar }, index) => {
        const unit = bundle.products[0]?.price || 0;
        const buy = bar?.buyQuantity || 1;
        const get = bar?.getQuantity || Math.max(bundle.products.length - 1, 0);
        const rate = bar
          ? bar.getPriceMethod === "free"
            ? 100
            : bar.getDiscount
          : bundle.discount;
        const offerType =
          bar?.offerType ||
          (bundle.type === "Volume discount"
            ? "quantity_break"
            : bundle.type === "Buy X get Y"
              ? "buy_x_get_y"
              : "product_bundle");
        const isQuantityBreak = offerType === "quantity_break";
        const isBuyXGetY = offerType === "buy_x_get_y";
        const bundleRegular = bundle.products.reduce(
          (sum, p) => sum + p.price,
          0,
        );
        const regular = isQuantityBreak
          ? unit * buy
          : isBuyXGetY
            ? unit * (buy + get)
            : bundleRegular;
        const sale = isQuantityBreak
          ? regular * (1 - (bar?.getDiscount || 0) / 100)
          : isBuyXGetY
            ? unit * buy + unit * get * (1 - rate / 100)
            : regular * (1 - (bar?.getDiscount ?? bundle.discount) / 100);
        const saved = regular ? Math.round((1 - sale / regular) * 100) : 0;
        const label = (bar?.label || `SAVE ${bundle.discount}%`).replace(
          "{{saved_percentage}}",
          `${saved}%`,
        );
        const card = document.createElement("article");
        const cardOfferType =
          bar?.offerType ||
          (bundle.type === "Volume discount"
            ? "quantity_break"
            : bundle.type === "Buy X get Y"
              ? "buy_x_get_y"
              : "product_bundle");
        const requiredProducts =
          cardOfferType === "buy_x_get_y" && bundle.products.length > 1
            ? bundle.products.slice(0, 2)
            : cardOfferType === "quantity_break"
              ? bundle.products.slice(0, 1)
              : bundle.products;
        const unavailable =
          bar?.soldOut ||
          !requiredProducts.length ||
          requiredProducts.some((product) => !product.handle);
        card.className = `bf-offer${unavailable ? " is-sold-out" : ""}`;
        card.innerHTML = `<div class="bf-offer__main"><span class="bf-radio"></span><div class="bf-offer__name"><strong>${esc(bar?.title || bundle.name)}</strong>${bar?.subtitle ? `<small>${esc(bar.subtitle)}</small>` : ""}</div><span class="bf-save">${esc(label)}</span><div class="bf-price"><strong>${money(sale, data.currency)}</strong><s>${money(regular, data.currency)}</s></div></div>${bar?.giftEnabled ? '<div class="bf-gift">+ FREE special gift!</div>' : ""}`;
        if (!unavailable) card.addEventListener("click", () => select(index));
        cards.push({ element: card, unavailable });
        list.appendChild(card);
      });
      if (cards[selected]?.unavailable)
        selected = cards.findIndex((card) => !card.unavailable);
      function select(index) {
        selected = index;
        cards.forEach((card, i) =>
          card.element.classList.toggle("is-selected", i === index),
        );
      }
      select(selected);
      const button = document.createElement("button");
      button.className = "bundleflow-submit";
      button.textContent = root.dataset.buttonLabel;
      list.after(button);
      if (root.dataset.showButton === "false") button.hidden = true;
      if (selected < 0) {
        button.disabled = true;
        button.textContent = "BUNDLE UNAVAILABLE";
        message.textContent = "One or more bundle products are unavailable.";
      }
      button.addEventListener("click", async () => {
        const { bundle, bar } = offers[selected];
        const discountName = bundle.configuration?.settings?.discountName;
        const offerType =
          bar?.offerType ||
          (bundle.type === "Volume discount"
            ? "quantity_break"
            : bundle.type === "Buy X get Y"
              ? "buy_x_get_y"
              : "product_bundle");
        const quantities =
          offerType === "buy_x_get_y" && bundle.products.length > 1
            ? [bar?.buyQuantity || 1, bar?.getQuantity || 1]
            : offerType === "quantity_break"
              ? [bar?.buyQuantity || 1]
              : bundle.products.map(() => 1);
        const products = bundle.products.slice(0, quantities.length);
        button.disabled = true;
        button.textContent = "ADDING…";
        message.textContent = "";
        try {
          const variantIds = await Promise.all(
            products.map((product) => storefrontVariant(product, root)),
          );
          const items = products.map((product, i) => ({
            id: variantIds[i],
            quantity: quantities[i],
            properties: {
              _BundleFlow: bundle.name,
              "_BundleFlow offer": bar?.title || bundle.name,
              ...(discountName ? { "_BundleFlow discount": discountName } : {}),
            },
          }));
          const cart = await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          if (!cart.ok) {
            const error = await cart.json().catch(() => null);
            throw Error(
              error?.description ||
                error?.message ||
                "Could not add this bundle to cart.",
            );
          }
          button.textContent = "ADDED TO CART ✓";
          message.textContent = `${bar?.title || bundle.name} was added to your cart.`;
          document.documentElement.dispatchEvent(
            new CustomEvent("cart:refresh", { bubbles: true }),
          );
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
          button.textContent = root.dataset.buttonLabel;
        }
      });
    } catch (error) {
      loading.textContent = "Bundles are temporarily unavailable.";
      message.textContent = error.message;
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
