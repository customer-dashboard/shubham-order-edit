import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { sessionToken, cors } = await authenticate.public.checkout(request);

  if (!sessionToken) {
    return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    }));
  }

  return cors(new Response(JSON.stringify({
    message: "Hello World from Backend!",
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }));
};

export const action = async ({ request }) => {
  const { cors } = await authenticate.public.checkout(request);
  return cors(new Response(JSON.stringify({ message: "Action handled" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }));
};
