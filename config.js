window.SHOP_CONFIG = {
  shopName: "Drift",
  tagline: "",
  unitPerQty: 10,
  // Free shipping when subtotal reaches this amount (HK$)
  freeShippingAtAmount: 240,
  shippingFee: 30,
  currencyLabel: "HK$",
  // English only; shown in footer + checkout (edit wording here).
  disclaimerNote:
    "All sales are final once shipped.\n\n" +
    "As drip bags contain fresh roasted coffee, returns and refunds are not accepted except in cases of manufacturing defects or damage during delivery.\n\n" +
    "We appreciate your understanding.",
  payMeUrl: "https://payme.hsbc/996976ef1a4840e397b5d218c81a662a",
  // General enquiries (Contact section only — separate from FPS below).
  contactPhone: "65459695",
  fpsId: "128799590",
  fpsNote: "Please put the Order ID in the transfer remark.",
  // Optional: Google Apps Script Web App URL (used on Cloudflare Pages).
  // If set, checkout submit will POST order data to this endpoint to trigger a Gmail email.
  orderEndpoint:
    "https://script.google.com/macros/s/AKfycbzHxO7IWjO0qt_MQlyF79ewuQBWHV2FvxBo8nef7ZZDo2YVYdArIKCXE83uav_9JwouxA/exec",
};