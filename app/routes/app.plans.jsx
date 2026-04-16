import {
  Page,
  Layout,
  Card,
  Text,
  InlineStack,
  BlockStack,
  Button,
  Badge,
} from "@shopify/polaris";

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
    <Page>
      <BlockStack gap="600">

        {/* Top Right Cancel */}
        <InlineStack align="end">
          <Button variant="plain" tone="critical">
            Cancel current subscription
          </Button>
        </InlineStack>

        {/* Heading */}
        <BlockStack align="center" justify="center" gap="200">
          <Text variant="headingLg" as="h2">
            Choose your plan
          </Text>
          <Text tone="subdued">
            Start with a free trial. Choose a plan that fits your business.
          </Text>
        </BlockStack>

        {/* Plans Grid */}
<Layout>
        <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  }}
>
  {plans.map((plan, index) => (
    <Layout.Section oneThird key={index}>
      <Card>
        <BlockStack gap="400">

          <Text variant="headingMd" as="h3">
            {plan.title}
          </Text>

          <InlineStack align="start" gap="100">
            <Text variant="headingXl" as="p">
              {plan.price}
            </Text>
            <Text tone="subdued">/month</Text>
          </InlineStack>

          <Text tone="subdued">{plan.desc}</Text>

          <hr />

          <BlockStack gap="200">
            {plan.features.map((feature, i) => (
              <InlineStack key={i} gap="200" align="start">
                <Text>✔</Text>
                <Text as="p">{feature}</Text>
              </InlineStack>
            ))}
          </BlockStack>

          <BlockStack gap="200">
            {plan.current ? (
              <>
                <Button fullWidth disabled>
                  Current Plan
                </Button>
                <Text alignment="center" tone="subdued">
                  14-day free trial
                </Text>
              </>
            ) : (
              <>
                <Button fullWidth variant="primary">
                  Try for free
                </Button>
                <Text alignment="center" tone="subdued">
                  14-day free trial
                </Text>
              </>
            )}
          </BlockStack>

        </BlockStack>
      </Card>
    </Layout.Section>
  ))}
  </div>
</Layout>

      </BlockStack>
    </Page>
  );
}