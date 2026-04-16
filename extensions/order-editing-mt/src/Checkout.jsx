import '@shopify/ui-extensions/preact';
import { render } from 'preact';

export default () => {
  render(<Extension />, document.body);
};

function Extension() {
  
  // ✅ Detect block render
  fetch("/app/post-data", {
    method: "POST",
    body: JSON.stringify({
      target: "app-status-on-theme",
      block: "order-status",
      enabled: true,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return (
    <s-banner heading="Order Editing -MT">
      <s-text>Order Status Block Active ✅</s-text>
    </s-banner>
  );
}