export const DEFAULT_APP_SETTINGS = {
  status: "enable",
  onboarding: {
    step: 0,
    completed: false
  },

  "shipping_address_editing": {
    status: "disable"
  },
  "discount_code": {
    status: "disable"
  },
  "phone_number_editing": {
    status: "disable"
  },
  "invoice_download": {
    status: "disable"
  },
  "delivery_instructions": {
    status: "disable"
  },
  "order_line_items_editing": {
    status: "disable"
  },
  "adding_more_products": {
    status: "disable"
  },
  time_limit: {
    status: "enable",
    time: 0,
    period: "minutes"
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
    data[key] = 0;
  }
  return data;
};

export const DEFAULT_ANALYTICS = {
  totalorderedit: 0,
  last30daysdata: generateDefaultChartData(),
  total_shipping_address_editing: 0,
  total_discount_code: 0,
  total_phone_number_editing: 0,
  total_invoice_download: 0,
  total_delivery_instructions: 0,
  total_order_line_items_editing: 0,
  total_adding_more_products: 0,
  last10activity: []
};





