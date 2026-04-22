import { flatRoutes } from "@react-router/fs-routes";
import { route } from "@react-router/dev/routes";

export default [
  ...(await flatRoutes()),
  route("api/hello", "api/hello.jsx"),
  route("api/order_update_address", "api/order_update_address.jsx"),
   route("api/order/update_phone", "api/order_update_phone.jsx"),
  route("api/order-status", "api/order_status.jsx"),
  route("api/order/fetch_note", "api/order_fetch_note.jsx"),
  route("api/order/invoice", "api/order_invoice.jsx"),
  route("api/order/delivery_instruction", "api/order_delivery_instruction.jsx"),
  route("api/products_search", "api/products_search.jsx"),
  route("api/order/update", "api/order_update.jsx"),
];
