export const DEFAULT_APP_SETTINGS = {
  status: "enable",
  onboarding: {
    step: 0,
    completed: false
  },

  "shipping_address_editing": {
    status: "enable"
  },
  "phone_number_editing": {
    status: "enable"
  },
  "invoice_download": {
    status: "enable"
  },
  "delivery_instructions": {
    status: "enable"
  },
  "order_line_items_editing": {
    status: "enable"
  },
  "adding_more_products": {
    status: "enable"
  },
  "discount_code": {
    status: "enable"
  },
  time_limit: {
    status: "disable",
    time: 0,
    period: "days"
  },
  order_tags: {
    status: "disable",
    tags: "",
    match_type: "any"
  },
  customer_tags: {
    status: "disable",
    tags: "",
    match_type: "any"
  },
  product_tags: {
    status: "disable",
    tags: "",
    action: "disable_complete"
  },
  order_cancellation: {
    status: "enable",
    cod_only: false,
    reasons: [
      "Changed my mind",
      "Selected wrong address",
      "Placed by mistake",
      "Found better product/price",
      "Not happy with the delivery timeline",
      "Other reason"
    ]
  }
};

export const generateDefaultChartData = () => {
  const data = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const key = `${day}/${month}/${year}`;
    data[key] = {
      totaledits: 0,
      total_shipping_address_editing: 0,

      total_phone_number_editing: 0,
      total_invoice_download: 0,
      total_delivery_instructions: 0,
      total_order_line_items_editing: 0,
      total_adding_more_products: 0
    };
  }
  return data;
};

export const DEFAULT_ANALYTICS = {
  totalorderedit: 0,
  last30daysdata: generateDefaultChartData(),
  last10activity: []
};






