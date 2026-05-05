import { authenticate } from "../shopify.server";

export async function action({ request }) {
  await authenticate.admin(request);
  const { code } = await request.json();

  if (code.startsWith("CEP_SAVE")) {
    // Basic validation logic from user's provided snippet
    return { data: "Success" };
  }

  return { data: "Invalid Code" };
}
