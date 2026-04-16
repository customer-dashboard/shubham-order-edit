import { useState } from "react";
import {
  Page,
  Layout,
  Banner,
  Card,
  Box,
  Text,
  Badge,
  Button,
  ProgressBar,
  Grid,
  Divider,
  InlineStack,
  BlockStack,
  Icon,
} from "@shopify/polaris";
import {   
  RefreshIcon,
  LocationIcon,
  PlusIcon,
  EditIcon,
  ArrowsInHorizontalIcon,
  SettingsIcon,
  DiscountIcon,
  DeliveryIcon,
  DeleteIcon,
  PhoneIcon,
  NoteIcon, 
} from "@shopify/polaris-icons";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useOutletContext, useRouteError } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Dashboard() {
  const {
    allThemes,
    defSetting,
    setDefSetting,
    enableTheme,
    liveTheme,
    onBoarding,
    setOnBoarding,
    appStatusOnTheme,
    isShopifyPlus,
    billingNew,
    storeLanguages
  } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
 
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };
 
  const featureUsageData = [
    { feature: "Edit Shipping Address", icon: LocationIcon, count: 0, percentage: 0 },
    { feature: "Add a Product to Your Order", icon: PlusIcon, count: 0, percentage: 0 },
    { feature: "Change Product Quantities", icon: EditIcon, count: 0, percentage: 0 },
    { feature: "Replace a Product", icon: ArrowsInHorizontalIcon, count: 0, percentage: 0 },
    { feature: "Change Product Options", icon: SettingsIcon, count: 0, percentage: 0 },
    { feature: "Apply a Discount Code", icon: DiscountIcon, count: 0, percentage: 0 },
    { feature: "Select a Shipping Method", icon: DeliveryIcon, count: 0, percentage: 0 },
    { feature: "Request Order Cancellation", icon: DeleteIcon, count: 0, percentage: 0 },
    { feature: "Change Contact Information", icon: PhoneIcon, count: 0, percentage: 0 },
    { feature: "Download Invoice", icon: NoteIcon, count: 0, percentage: 0 },
  ];
 
  const topPerformingFeatures = [
    "Edit Shipping Address",
    "Add a Product to Your Order",
    "Change Product Quantities",
    "Replace a Product",
    "Change Product Options",
  ];
 
  const featuresNeedingAttention = [
    { name: "Edit Shipping Address", uses: 0 },
    { name: "Add a Product to Your Order", uses: 0 },
    { name: "Change Product Quantities", uses: 0 },
    { name: "Replace a Product", uses: 0 },
    { name: "Change Product Options", uses: 0 },
  ];
 
  const usageInsights = {
    highAdoption: [],
    growthOpportunity: [],
    monitorClosely: [],
  };
 
  return (
    <>
        {/* ── Warning Banner ── */}
        <Page>
              <Layout>
        <Layout.Section>
          <Banner
            title="Some app extensions are not enabled"
            tone="warning"
            action={{ content: "Activate app blocks" }}
            secondaryAction={{ content: "Refresh" }}
          >
            <p>
              The following required app extensions are not enabled:{" "}
              <strong>Order status page</strong>. Please enable them from Shopify
              theme editor to ensure all features work correctly. Need help?
              Schedule a call with our team or consult the setup guide.
            </p>
          </Banner>
        </Layout.Section>
        </Layout>
        </Page>

    <Page
      title="Dashboard"
      subtitle="Track order usage and customer engagement"
      // backAction={{ onAction: () => {} }}
      secondaryActions={[{ content: "Last 7 days" }]}
      primaryAction={{
        content: "Refresh",
        icon: RefreshIcon,
        onAction: handleRefresh,
        loading: isLoading,
      }}
    >
      <Layout>
 
 
        {/* ── Secondary Payment Callout ── */}
        <Layout.Section>
          <Banner tone="info" title="Secondary payment">
            <p>
              Edited orders may create a secondary payment needing manual
              capture, all edits sync in real time
            </p>
          </Banner>
        </Layout.Section>
 
        {/* ── Feature Usage Overview ── */}
        <Layout.Section>
          <Card padding="0">
            <Box paddingInline="400" paddingBlock="300">
              <Text as="h3" variant="headingMd">
                Feature Usage Overview
              </Text>
            </Box>
            <Divider />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
            >
              {[
                { label: "Total Orders", value: "0" },
                { label: "Total Edited Orders", value: "0" },
                { label: "Active Features", value: "0 / 10" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    borderRight: idx < 2 ? "1px solid #e1e3e5" : "none",
                  }}
                >
                  <Text as="p" variant="bodySm" tone="subdued">
                    {stat.label}
                  </Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">
                    {stat.value}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>
 
        {/* ── Recent Order Activities ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Recent order activities
              </Text>
              <Box paddingBlock="800">
                <BlockStack gap="300" align="center" inlineAlign="center">
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="72" height="72" rx="36" fill="#F1F3F5" />
                    <rect x="22" y="16" width="28" height="36" rx="3" fill="#D1D5DB" />
                    <rect x="27" y="23" width="18" height="2.5" rx="1.25" fill="#9CA3AF" />
                    <rect x="27" y="29" width="14" height="2.5" rx="1.25" fill="#9CA3AF" />
                    <rect x="27" y="35" width="16" height="2.5" rx="1.25" fill="#9CA3AF" />
                    <rect x="31" y="11" width="10" height="9" rx="1.5" fill="#E8A020" />
                  </svg>
                  <Text as="h3" variant="headingMd">
                    No order history yet
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Once you start editing orders, your history will appear here.
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
 
        {/* ── Feature Usage Statistics ── */}
        <Layout.Section>
          <Card padding="0">
            <Box paddingInline="400" paddingBlock="300">
              <Text as="h3" variant="headingMd">
                Feature Usage Statistics
              </Text>
            </Box>
            <Divider />
 
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 150px",
                padding: "8px 16px",
                background: "#F9FAFB",
                borderBottom: "1px solid #e1e3e5",
              }}
            >
              <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">
                Feature
              </Text>
              <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued" alignment="center">
                Usage Count
              </Text>
              <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued" alignment="end">
                Adoption Rate
              </Text>
            </div>
 
            {/* Table Rows */}
            {featureUsageData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 150px",
                  padding: "10px 16px",
                  borderBottom:
                    index < featureUsageData.length - 1
                      ? "1px solid #f1f3f5"
                      : "none",
                  alignItems: "center",
                }}
              >
                {/* Feature name + icon */}
              <InlineStack gap="200" align="start" blockAlign="center">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Icon source={item.icon} tone="subdued" />
                </div>
                <Text as="p" variant="bodyMd">
                  {item.feature}
                </Text>
              </InlineStack>
 
                {/* Usage count */}
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  {item.count}
                </Text>
 
                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar
                      progress={item.percentage}
                      size="small"
                      tone="success"
                    />
                  </div>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {item.percentage}%
                  </Text>
                </div>
              </div>
            ))}
          </Card>
        </Layout.Section>
 
        {/* ── Top Performing + Needing Attention ── */}
        <Layout.Section>
          <Grid columns={{ xs: 1, sm: 2 }}>
            {/* Top Performing Features */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <Card padding="0">
                <Box paddingInline="400" paddingBlock="300">
                  <Text as="h3" variant="headingMd">
                    Top Performing Features
                  </Text>
                </Box>
                <Divider />
                <Box padding="400">
                  <BlockStack gap="0">
                    {topPerformingFeatures.map((feature, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderBottom:
                            index < topPerformingFeatures.length - 1
                              ? "1px solid #f1f3f5"
                              : "none",
                        }}
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background:
                                index === 0
                                  ? "#FFD700"
                                  : index === 1
                                  ? "#C0C0C0"
                                  : index === 2
                                  ? "#CD7F32"
                                  : "#e1e3e5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "700",
                              color:
                                index === 0
                                  ? "#7a5c00"
                                  : index === 1
                                  ? "#555"
                                  : index === 2
                                  ? "#5a3500"
                                  : "#6b7280",
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </div>
                          <Text as="p" variant="bodyMd">
                            {feature}
                          </Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          0 uses
                        </Text>
                      </div>
                    ))}
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
 
            {/* Features Needing Attention */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <Card padding="0">
                <Box paddingInline="400" paddingBlock="300">
                  <Text as="h3" variant="headingMd">
                    Features Needing Attention
                  </Text>
                </Box>
                <Divider />
                <Box padding="400">
                  <BlockStack gap="0">
                    {featuresNeedingAttention.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderBottom:
                            index < featuresNeedingAttention.length - 1
                              ? "1px solid #f1f3f5"
                              : "none",
                        }}
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: "#e1e3e5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#6b7280",
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </div>
                          <Text as="p" variant="bodyMd">
                            {item.name}
                          </Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          0 uses
                        </Text>
                      </div>
                    ))}
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>
 
        {/* ── Usage Insights ── */}
        <Layout.Section>
          <Card padding="0">
            <Box paddingInline="400" paddingBlock="300">
              <Text as="h3" variant="headingMd">
                Usage Insights
              </Text>
            </Box>
            <Divider />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
            >
              {[
                {
                  label: "High Adoption",
                  color: "#008060",
                  items: usageInsights.highAdoption,
                },
                {
                  label: "Growth Opportunity",
                  color: "#458fcc",
                  items: usageInsights.growthOpportunity,
                },
                {
                  label: "Monitor Closely",
                  color: "#b47c00",
                  items: usageInsights.monitorClosely,
                },
              ].map((col, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    borderRight: idx < 2 ? "1px solid #e1e3e5" : "none",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: col.color,
                      marginBottom: "10px",
                    }}
                  >
                    {col.label}
                  </p>
                  {col.items.length === 0 ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      No data yet
                    </Text>
                  ) : (
                    col.items.map((item, i) => (
                      <Text key={i} as="p" variant="bodySm" tone="subdued">
                        {item}
                      </Text>
                    ))
                  )}
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>
 
        <Layout.Section>
        </Layout.Section>
      </Layout>
    </Page>
    </>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};