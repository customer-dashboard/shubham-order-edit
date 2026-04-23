import { useEffect, useState } from "react";
import { useLoaderData, useOutletContext } from "react-router";

export default function DashboardPage() {
  const { config } = useOutletContext();
  const [visible, setVisible] = useState({
    banner: true,
    setupGuide: true,
    calloutCard: true,
    featuredApps: true,
  });
  const [isOrderEditActive, setIsOrderEditActive] = useState(false);
  const [isExtensionsLoading, setIsExtensionsLoading] = useState(true);

  useEffect(() => {
    const loaddata = async () => {
      shopify.loading(true)
      try {
        const shopss = await shopify.app.extensions();
        console.log(shopss)
        const result = shopss.find(item => item.handle === "order-edit");
        if (result && result.activations.length > 0) {
          setIsOrderEditActive(true)
        } else {
          setIsOrderEditActive(false)
        }
      } catch (error) {
        console.error("Error fetching extensions:", error);
      } finally {
        shopify.loading(false)
        setIsExtensionsLoading(false);
      }
    }
    loaddata()
  }, [])

  if (isExtensionsLoading) {
    return null
  }
  console.log(shopify)
  return (
    <s-page>
      {isOrderEditActive ? (
        <s-banner
          heading="Order edits are active"
          tone="success"
          dismissible
        >
          Your app is connected and order edits are enabled on the order status page.
          <s-paragraph color="subdued">
            Customers can now fix mistakes after checkout without contacting support.
          </s-paragraph>
        </s-banner>
      ) : (
        <s-banner heading="Enable order edits on your store" tone="warning">
          <s-paragraph>
            Turn on order editing so customers can update items after checkout instead of
            cancelling and re‑ordering.
          </s-paragraph>
          <s-paragraph color="subdued">
            Setup usually takes less than a minute and only needs to be done once.
          </s-paragraph>

          <s-button
            slot="secondary-actions"
            variant="secondary"
            href="shopify:admin/settings/checkout/editor?page=order-status&context=apps&app=ee0d8eb337181cafaf7912854e760d1d"
          >
            Open checkout settings
          </s-button>
        </s-banner>
      )}

      {/* Metrics cards */}
      <s-section padding="base">
        <s-grid
          gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr"
          gap="small"
        >
          <s-clickable
            href="#"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-heading>Total Designs</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-text>156</s-text>
                <s-badge tone="success" icon="arrow-up">
                  12%
                </s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>
          <s-divider direction="block" />
          <s-clickable
            href="#"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-heading>Units Sold</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-text>2,847</s-text>
                <s-badge tone="warning">0%</s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>
          <s-divider direction="block" />
          <s-clickable
            href="#"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-heading>Return Rate</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-text>3.2%</s-text>
                <s-badge tone="critical" icon="arrow-down">
                  0.8%
                </s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>
      <s-section>
        <s-grid
          gridTemplateColumns="1fr auto"
          alignItems="center"
          paddingBlockEnd="small-400"
        >
          <s-heading>Recommended apps</s-heading>
          <s-button
            onClick={() => setVisible({ ...visible, featuredApps: false })}
            icon="x"
            tone="neutral"
            variant="tertiary"
            accessibilityLabel="Dismiss featured apps section"
          ></s-button>
        </s-grid>
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
          gap="base"
        >
          <s-clickable
            href="https://apps.shopify.com/flow"
            border="base"
            borderRadius="base"
            padding="base"
            inlineSize="100%"
            accessibilityLabel="Download Shopify Flow"
          >
            <s-grid
              gridTemplateColumns="auto 1fr auto"
              alignItems="stretch"
              gap="base"
            >
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/s/files/1/0667/0067/3266/files/Custlo_logo_design020.png?v=1749099271"
                alt="Shopify Flow icon"
              />
              <s-box>
                <s-heading>Custlo : Customer Account Pro</s-heading>
                <s-paragraph>Free trial available.</s-paragraph>
                <s-paragraph>
                  Custlo is built for customizing the look and feel of the customer account page by adding custom fields, custom menus, delivery addresses, order history etc...
                </s-paragraph>
              </s-box>
              <s-stack justifyContent="start">
                <s-button
                  href="https://apps.shopify.com/customer-dashboard-pro"
                  icon="download"
                  accessibilityLabel="Download Shopify Flow"
                />
              </s-stack>
            </s-grid>
          </s-clickable>
          {/* Featured app 2 */}
          <s-clickable
            href="https://apps.shopify.com/planet"
            border="base"
            borderRadius="base"
            padding="base"
            inlineSize="100%"
            accessibilityLabel="Download Shopify Planet"
          >
            <s-grid
              gridTemplateColumns="auto 1fr auto"
              alignItems="stretch"
              gap="base"
            >
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/app-store/listing_images/f0744aa7ec85f7d412692b264a7613a6/icon/CPuq3peN44EDEAE=.png"
                alt="Shopify Planet icon"
              />
              <s-box>
                <s-heading>Checkout Extensions Pro</s-heading>
                <s-paragraph>Free trial available.</s-paragraph>
                <s-paragraph>
                  Customize checkout pages: upsells, content widgets, surveys and more with checkout extensions
                </s-paragraph>
              </s-box>
              <s-stack justifyContent="start">
                <s-button
                  href="https://apps.shopify.com/checkout-extensions-pro"
                  icon="download"
                  accessibilityLabel="Download Shopify Planet"
                />
              </s-stack>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>

      {/* Footer help */}
      <s-stack alignItems="center" paddingBlock="large">
        <s-text color="subdued">
          Learn more about <s-link href="https://help.shopify.com" target="_blank">Order Editing</s-link>.
        </s-text>
      </s-stack>
    </s-page>
  );
}
