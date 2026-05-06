export const loader = async ({ request }) => {
  return new Response("This is dummy text from the server for testing download functionality.", {
    headers: {
      "Content-Disposition": 'attachment; filename="test-file.txt"',
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
