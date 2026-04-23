import { useEffect, useState } from "react";
import { useLoaderData, useOutletContext } from "react-router";

export default function DashboardPage() {
  const { config } = useOutletContext();
  const { activities, metrics } = useLoaderData();
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
    return (
      <s-page>
        <s-section>
          <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
             {[1,2,3].map(i => (
               <s-box key={i} paddingBlock="small-400" paddingInline="small-100" borderRadius="base" border="all">
                 <s-grid gap="small-300">
                   <s-skeleton-display-text size="small" />
                   <s-skeleton-display-text size="large" />
                 </s-grid>
               </s-box>
             ))}
          </s-grid>
        </s-section>
        <s-section>
          <s-box paddingBlock="large-400">
             <s-skeleton-body-text lines={10} />
          </s-box>
        </s-section>
      </s-page>
    );
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

      {/* Metrics Cards */}
      <s-section>
        <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
          <s-clickable
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
            border="all"
          >
            <s-grid gap="small-300">
              <s-heading variant="headingMd">Total Edits</s-heading>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text variant="headingLg">{metrics?.totalEdits || 0}</s-text>
              </s-stack>
            </s-grid>
          </s-clickable>

          <s-clickable
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
            border="all"
          >
            <s-grid gap="small-300">
              <s-heading variant="headingMd">Edits Today</s-heading>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text variant="headingLg">{metrics?.todayEdits || 0}</s-text>
                {metrics?.change >= 0 ? (
                  <s-badge tone="success" icon="arrow-up">
                    {metrics?.change}%
                  </s-badge>
                ) : (
                  <s-badge tone="critical" icon="arrow-down">
                    {Math.abs(metrics?.change)}%
                  </s-badge>
                )}
              </s-stack>
            </s-grid>
          </s-clickable>

          <s-clickable
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
            border="all"
          >
            <s-grid gap="small-300">
              <s-heading variant="headingMd">Yesterday</s-heading>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text variant="headingLg">{metrics?.yesterdayEdits || 0}</s-text>
                <s-text color="subdued" variant="bodySm">Previous day</s-text>
              </s-stack>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>
      {activities && activities.length > 0 ?
        <s-section padding="none">
          <s-box padding="base">
            <s-heading>Recent Activity</s-heading>
          </s-box>
          <s-table >
            <s-table-header-row>
              <s-table-header listSlot="primary">Order</s-table-header>
              <s-table-header>Activity</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {activities.slice(0, 10).map((activity) => (
                <s-table-row key={activity.id}>
                  <s-table-cell>
                    <s-link href={`shopify:admin/orders/${activity.orderId.split("/").pop()}`}>
                      {activity.orderName || activity.orderId.split("/").pop()}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="extraTight" alignItems="center">
                      <s-badge tone="info">{activity.message}</s-badge>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))
              }
            </s-table-body>
          </s-table>
        </s-section>
        :
        <s-section accessibilityLabel="Empty state section">
          <s-box padding="base">
            <s-heading>Recent Activity</s-heading>
          </s-box>
          <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
            <s-box maxInlineSize="200px" maxBlockSize="200px">
              {/* aspectRatio should match the actual image dimensions (width/height) */}
              <s-image
                aspectRatio="1/0.5"
                src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                alt="A stylized graphic of four characters, each holding a puzzle piece"
              />
            </s-box>
            <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
              <s-stack alignItems="center">
                <s-heading>Start creating puzzles</s-heading>
                <s-paragraph>
                  Create and manage your collection of puzzles for players to
                  enjoy.
                </s-paragraph>
              </s-stack>
              <s-button-group>
                <s-button
                  slot="secondary-actions"
                  accessibilityLabel="Learn more about creating puzzles"
                >
                  {" "}
                  Learn more{" "}
                </s-button>
                <s-button slot="primary-action" accessibilityLabel="Add a new puzzle">
                  {" "}
                  Create puzzle{" "}
                </s-button>
              </s-button-group>
            </s-grid>
          </s-grid>
        </s-section>
      }
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
