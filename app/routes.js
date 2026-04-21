import { flatRoutes } from "@react-router/fs-routes";
import { route } from "@react-router/dev/routes";

export default [
  ...(await flatRoutes()),
  route("api/hello", "api/hello.jsx"),
  route("api/order_update_address", "api/order_update_address.jsx"),
];
