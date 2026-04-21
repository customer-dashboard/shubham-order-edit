import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";

export default function DashboardPage() {
  const [visible, setVisible] = useState({
    banner: true,
    setupGuide: true,
    calloutCard: true,
    featuredApps: true,
  });
  const [isOrderEditActive, setIsOrderEditActive] = useState(false);
  useEffect(() => {
    const loaddata = async () => {
      const shopss = await window.shopify.app.extensions();
      const result = shopss.find(item => item.handle === "order-edit");
      if (result.activations.length > 0) {
        setIsOrderEditActive(true)
      } else {
        setIsOrderEditActive(false)
      }
    }
    loaddata()
  }, [])

  return (
    <s-page>
      {isOrderEditActive ? (
        <s-banner
          heading="Order edits are active"
          tone="success"
          dismissible
          onDismiss={() => setShowSuccess(false)}
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

          <s-button
            slot="secondary-actions"
            variant="secondary"
            href="javascript:void(0)"
          >
            View setup guide
          </s-button>
        </s-banner>
      )}

      {/* === */}
      {/* Metrics cards */}
      {/* Your app homepage should provide merchants with quick statistics or status updates that help them understand how the app is performing for them. */}
      {/* === */}
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

      {/* === */}
      {/* Callout Card */}
      {/* If dismissed, use local storage or a database entry to avoid showing this section again to the same user. */}
      {/* === */}
      {visible.calloutCard && (
        <s-section>
          <s-grid
            gridTemplateColumns="1fr auto"
            gap="small-400"
            alignItems="start"
          >
            <s-grid
              gridTemplateColumns="@container (inline-size <= 480px) 1fr, auto auto"
              gap="base"
              alignItems="center"
            >
              <s-grid gap="small-200">
                <s-heading>Ready to create your custom puzzle?</s-heading>
                <s-paragraph>
                  Start by uploading an image to your gallery or choose from one
                  of our templates.
                </s-paragraph>
                <s-stack direction="inline" gap="small-200">
                  <s-button> Upload image </s-button>
                  <s-button tone="neutral" variant="tertiary">
                    {" "}
                    Browse templates{" "}
                  </s-button>
                </s-stack>
              </s-grid>
              <s-stack alignItems="center">
                <s-box
                  maxInlineSize="200px"
                  borderRadius="base"
                  overflow="hidden"
                >
                  <s-image
                    src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                    alt="Customize checkout illustration"
                    aspectRatio="1/0.5"
                  />
                </s-box>
              </s-stack>
            </s-grid>
            <s-button
              onClick={() => setVisible({ ...visible, calloutCard: false })}
              icon="x"
              tone="neutral"
              variant="tertiary"
              accessibilityLabel="Dismiss card"
            ></s-button>
          </s-grid>
        </s-section>
      )}
      {visible.featuredApps && (
        <s-section>
          <s-grid
            gridTemplateColumns="1fr auto"
            alignItems="center"
            paddingBlockEnd="small-400"
          >
            <s-heading>Featured apps</s-heading>
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
            {/* Featured app 1 */}
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
                  src="https://cdn.shopify.com/app-store/listing_images/15100ebca4d221b650a7671125cd1444/icon/CO25r7-jh4ADEAE=.png"
                  alt="Shopify Flow icon"
                />
                <s-box>
                  <s-heading>Shopify Flow</s-heading>
                  <s-paragraph>Free</s-paragraph>
                  <s-paragraph>
                    Automate everything and get back to business.
                  </s-paragraph>
                </s-box>
                <s-stack justifyContent="start">
                  <s-button
                    href="https://apps.shopify.com/flow"
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
                  src="https://cdn.shopify.com/app-store/listing_images/87176a11f3714753fdc2e1fc8bbf0415/icon/CIqiqqXsiIADEAE=.png"
                  alt="Shopify Planet icon"
                />
                <s-box>
                  <s-heading>Shopify Planet</s-heading>
                  <s-paragraph>Free</s-paragraph>
                  <s-paragraph>
                    Offer carbon-neutral shipping and showcase your commitment.
                  </s-paragraph>
                </s-box>
                <s-stack justifyContent="start">
                  <s-button
                    href="https://apps.shopify.com/planet"
                    icon="download"
                    accessibilityLabel="Download Shopify Planet"
                  />
                </s-stack>
              </s-grid>
            </s-clickable>
          </s-grid>
        </s-section>
      )}

      {/* Footer help */}
      <s-stack alignItems="center" paddingBlock="large">
        <s-text color="subdued">
          Learn more about <s-link href="https://help.shopify.com" target="_blank">creating engaging puzzles</s-link>.
        </s-text>
      </s-stack>
    </s-page>
  );
}
