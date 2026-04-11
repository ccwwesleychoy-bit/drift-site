window.SHOP_CONFIG = {
  shopName: "Drift",
  tagline: "",
  unitPerQty: 10,
  // Shown under each product price, e.g. "12g · 10 packs" (weight first)
  packGramLabel: "12g",
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
  // Optional: Google Apps Script Web App URL. POST JSON includes paymentProofBase64 / Mime / FileName
  // (入數截圖). See order-email-handler.example.gs to attach the image in Gmail.
  orderEndpoint:
    "https://script.google.com/macros/s/AKfycbykyA3mrue7fcyzEkA2WI_BY632yCcdEDZr9SKkqAsxB8fK2B71F8PuVA9ky_47tjFPYw/exec",
};