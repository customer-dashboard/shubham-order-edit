const plans = [
  {
    title: "0-500 orders/m",
    price: "$0",
    desc: "25 edits/upsells free every month",
    features: [
      "Access to all features",
      "Self Service Order Editing",
      "Post Purchase Upsell (Increase AOV)",
      "Address Validation (powered by Google)",
      "Customizable editing window",
      "Add/replace items",
      "Apply Discounts + Automated Refunds",
      "24*7 Chat Support",
    ],
    current: true,
  },
  {
    title: "500-5000 orders/m",
    price: "$49",
    desc: "unlimited order edits + upsells",
    features: [
      "Access to all features",
      "Unlimited Self Service Order Editing",
      "Post Purchase Upsell (Increase AOV)",
      "Address Validation (powered by Google)",
      "Customizable editing window",
      "Add/replace items",
      "Apply Discounts + Automated Refunds",
      "24*7 Chat Support",
      "Priority Support - Chat + Slack",
      "WMS/3PL Integrations",
      "White glove onboarding",
    ],
    current: false,
  },
  {
    title: "5000-15000 orders/m",
    price: "$129",
    desc: "unlimited order edits + upsells",
    features: [
      "Access to all features",
      "Unlimited Self Service Order Editing",
      "Post Purchase Upsell (Increase AOV)",
      "Address Validation (powered by Google)",
      "Customizable editing window",
      "Add/replace items",
      "Apply Discounts + Automated Refunds",
      "24*7 Chat Support",
      "Priority Support - Chat + Slack",
      "WMS/3PL Integrations",
      "White glove onboarding",
      "Phone-call Support",
      "Dedicated Success Manager",
    ],
    current: false,
  },
];

export default function PlansPage() {
  return (
    <s-page heading="Plans">
      <s-section>
        <s-stack direction="inline" gap="base" style={{ justifyContent: "flex-end" }}>
          <s-button variant="tertiary" tone="critical">
            Cancel current subscription
          </s-button>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack direction="block" gap="base" style={{ alignItems: "center" }}>
          <s-heading>Choose your plan</s-heading>
          <s-text color="subdued">
            Start with a free trial. Choose a plan that fits your business.
          </s-text>
        </s-stack>
      </s-section>

      <s-section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
          }}
        >
          {plans.map((plan, index) => (
            <s-box key={index} border="base" border-radius="base" padding="base">
              <s-stack direction="block" gap="base">
                <s-heading>{plan.title}</s-heading>

                <s-stack direction="inline" gap="small" align-items="center">
                  <s-heading>{plan.price}</s-heading>
                  <s-text color="subdued">/month</s-text>
                </s-stack>

                <s-text color="subdued">{plan.desc}</s-text>
                <s-divider />

                <s-stack direction="block" gap="small">
                  {plan.features.map((feature, i) => (
                    <s-stack key={i} direction="inline" gap="small" align-items="center">
                      <s-text>✔</s-text>
                      <s-text>{feature}</s-text>
                    </s-stack>
                  ))}
                </s-stack>

                <s-stack direction="block" gap="small">
                  {plan.current ? (
                    <>
                      <s-button disabled>Current Plan</s-button>
                      <s-text color="subdued" style={{ textAlign: "center" }}>
                        14-day free trial
                      </s-text>
                    </>
                  ) : (
                    <>
                      <s-button variant="primary">Try for free</s-button>
                      <s-text color="subdued" style={{ textAlign: "center" }}>
                        14-day free trial
                      </s-text>
                    </>
                  )}
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </div>
      </s-section>
    </s-page>
  );
}
