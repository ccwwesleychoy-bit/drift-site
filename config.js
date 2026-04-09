window.SHOP_CONFIG = {
  shopName: "Drift",
  tagline: "",
  unitPerQty: 10,
  // Free shipping when subtotal reaches this amount (HK$)
  freeShippingAtAmount: 240,
  shippingFee: 30,
  currencyLabel: "HK$",
  footerNote: "購物滿 HK$240 免運；未滿 HK$240 運費 HK$30。",
  payMeUrl: "https://payme.hsbc/996976ef1a4840e397b5d218c81a662a",
  fpsId: "65459695",
  fpsNote: "Please put the Order ID in the transfer remark.",
  // Optional: Google Apps Script Web App URL (used on Cloudflare Pages).
  // If set, checkout submit will POST order data to this endpoint to trigger a Gmail email.
  orderEndpoint:
    "https://script.google.com/macros/s/AKfycbzHxO7IWjO0qt_MQlyF79ewuQBWHV2FvxBo8nef7ZZDo2YVYdArIKCXE83uav_9JwouxA/exec",
};