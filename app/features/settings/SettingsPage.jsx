import { useEffect, useState } from "react";
import { DEFAULT_APP_SETTINGS } from "../../constants/defaultSettings";

export default function SettingsPage() {
  const [shopName, setShopName] = useState("");
  const [shopId, setShopId] = useState("");
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const SAVE_BAR_ID = "settings-save-bar";

  // --- Initial load (Direct API - Admin GraphQL) ---
  useEffect(() => {
    async function initData() {
      try {
        const response = await fetch("shopify:admin/api/graphql.json", {
          method: "POST",
          body: JSON.stringify({
            query: `
              query getInitialData {
                shop {
                  id
                  name
                  metafield(namespace: "custlo_app", key: "app_settings") {
                    value
                  }
                }
              }
            `,
          }),
        });

        const { data } = await response.json();

        if (data?.shop) {
          setShopName(data.shop.name);
          setShopId(data.shop.id);

          if (data.shop.metafield?.value) {
            try {
              const savedSettings = JSON.parse(data.shop.metafield.value);
              const finalSettings = {
                ...DEFAULT_APP_SETTINGS,
                ...savedSettings,
              };
              setAppSettings(finalSettings);
              setOriginalSettings(finalSettings);
            } catch (e) {
              console.error("Error parsing metafield JSON:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching direct API data:", error);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // --- CENTRAL dirty tracking + Save bar show/hide ---
  useEffect(() => {
    const isDirty =
      JSON.stringify(appSettings) !== JSON.stringify(originalSettings);

    setHasUnsavedChanges(isDirty);

    if (typeof shopify === "undefined") return;

    if (isDirty) {
      // App state badal gaya → Save bar dikhana chahiye
      shopify.saveBar.show(SAVE_BAR_ID);
    } else {
      // State wapas original pe aa gayi → Save bar hide
      shopify.saveBar.hide(SAVE_BAR_ID);
    }
  }, [appSettings, originalSettings]);

  // --- Toggle top-level status ---
  const handleStatusChange = () => {
    const newStatus = appSettings.status === "enable" ? "disable" : "enable";
    setAppSettings({ ...appSettings, status: newStatus });
  };

  // --- Toggle nested settings ---
  const handleToggleSetting = (key) => {
    const currentStatus = appSettings[key]?.status || "disable";
    const newStatus = currentStatus === "enable" ? "disable" : "enable";

    setAppSettings({
      ...appSettings,
      [key]: {
        ...appSettings[key],
        status: newStatus,
      },
    });
  };

  // --- Discard: restore original state ---
  const handleDiscard = () => {
    setAppSettings(originalSettings);
    // effect appSettings/originalSettings pe run hoke Save bar hide karega
  };

  // --- Save: persist to metafield, keep bar visible until done ---
  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const response = await fetch("shopify:admin/api/graphql.json", {
        method: "POST",
        body: JSON.stringify({
          query: `
            mutation saveSettings($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  key
                  value
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            metafields: [
              {
                namespace: "custlo_app",
                key: "app_settings",
                type: "json",
                ownerId: shopId,
                value: JSON.stringify(appSettings),
              },
            ],
          },
        }),
      });

      const { data } = await response.json();

      if (data?.metafieldsSet?.userErrors?.length > 0) {
        console.error(
          "User errors saving settings:",
          data.metafieldsSet.userErrors,
        );
        shopify.toast.show("Error saving settings", { isError: true });
        // error pe dirty state / bar visible hi rahega
      } else {
        // Save success: yahi pe originalSettings update karo
        setOriginalSettings(appSettings);
        shopify.toast.show("Settings saved successfully");
        // Ab effect chalega, appSettings === originalSettings hoga,
        // isse hasUnsavedChanges false + saveBar.hide() apne aap ho jayega.
      }
    } catch (error) {
      console.error("Error saving settings via Direct API:", error);
      shopify.toast.show("Error saving settings", { isError: true });
    } finally {
      setSaving(false);
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <s-page heading="Settings" inlineSize="small">
        <s-section heading="Loading settings">
          <s-stack gap="base">
            <s-text>Loading app settings…</s-text>
            <s-spinner accessibilityLabel="Loading settings" />
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  return (
    <>
      {/* Programmatic Save bar with custom Save/Discard buttons */}
      <ui-save-bar id={SAVE_BAR_ID}>
        <button
          variant="primary"
          onClick={(event) => {
            event.preventDefault();
            handleSave();
          }}
          loading={saving || !hasUnsavedChanges ? "" : null}
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <button
          onClick={(event) => {
            event.preventDefault();
            if (!saving) {
              handleDiscard();
            }
          }}
          disabled={saving || !hasUnsavedChanges}
        >
          Discard
        </button>
      </ui-save-bar>

      {/* Settings page content */}
      <s-page heading="Settings" inlineSize="small">
        {/* Configuration section */}
        <s-section heading="Configuration">
          <s-stack gap="small-200">
            <s-switch
              name="status"
              checked={appSettings?.status === "enable"}
              label={saving ? "Saving…" : "Enable feature"}
              details="Ensure all criteria are met before enabling"
              onChange={handleStatusChange}
            />
          </s-stack>
        </s-section>
        <s-section heading="Tools">
          <s-stack
            gap="none"
            border="base"
            borderRadius="base"
            overflow="hidden"
          >
            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Shipping Address Editing</s-heading>
                  <s-paragraph color="subdued">
                    Allow customers to edit their shipping address after placing an order.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="shipping_address_editing"
                  checked={appSettings?.shipping_address_editing?.status === "enable"}
                  onChange={() => handleToggleSetting("shipping_address_editing")}
                />
              </s-grid>
            </s-box>
            <s-box paddingInline="small-100">
              <s-divider />
            </s-box>

            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Enable Discount Code Application</s-heading>
                  <s-paragraph color="subdued">
                    Allow customers to apply or change discount codes on existing orders.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="discount_code"
                  checked={appSettings?.discount_code?.status === "enable"}
                  onChange={() => handleToggleSetting("discount_code")}
                />
              </s-grid>
            </s-box>
            <s-box paddingInline="small-100">
              <s-divider />
            </s-box>

            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Phone Number Editing</s-heading>
                  <s-paragraph color="subdued">
                    Allow customers to update their contact phone number.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="phone_number_editing"
                  checked={appSettings?.phone_number_editing?.status === "enable"}
                  onChange={() => handleToggleSetting("phone_number_editing")}
                />
              </s-grid>
            </s-box>
            <s-box paddingInline="small-100">
              <s-divider />
            </s-box>

            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Invoice Download</s-heading>
                  <s-paragraph color="subdued">
                    Provide customers with a direct link to download their order invoice.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="invoice_download"
                  checked={appSettings?.invoice_download?.status === "enable"}
                  onChange={() => handleToggleSetting("invoice_download")}
                />
              </s-grid>
            </s-box>
            <s-box paddingInline="small-100">
              <s-divider />
            </s-box>

            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Delivery Instructions</s-heading>
                  <s-paragraph color="subdued">
                    Allow customers to add or edit delivery notes for the courier.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="delivery_instructions"
                  checked={appSettings?.delivery_instructions?.status === "enable"}
                  onChange={() => handleToggleSetting("delivery_instructions")}
                />
              </s-grid>
            </s-box>
            <s-box paddingInline="small-100">
              <s-divider />
            </s-box>

            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Order Line Items Editing</s-heading>
                  <s-paragraph color="subdued">
                    Allow customers to change quantities or remove items from their order.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="order_line_items_editing"
                  checked={appSettings?.order_line_items_editing?.status === "enable"}
                  onChange={() => handleToggleSetting("order_line_items_editing")}
                />
              </s-grid>
            </s-box>
            <s-box paddingInline="small-100">
              <s-divider />
            </s-box>

            <s-box padding="small-100">
              <s-grid
                gridTemplateColumns="1fr auto"
                alignItems="center"
                gap="base"
              >
                <s-box>
                  <s-heading>Adding More Products</s-heading>
                  <s-paragraph color="subdued">
                    Allow customers to add new items to their existing order.
                  </s-paragraph>
                </s-box>
                <s-switch
                  name="adding_more_products"
                  checked={appSettings?.adding_more_products?.status === "enable"}
                  onChange={() => handleToggleSetting("adding_more_products")}
                />
              </s-grid>
            </s-box>
          </s-stack>
        </s-section>
      </s-page>
    </>
  );
}