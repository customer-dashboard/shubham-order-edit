import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { DEFAULT_APP_SETTINGS } from "../../constants/defaultSettings";

import OrderPreview from "./components/OrderPreview";

export default function SettingsPage() {
  const [shopName, setShopName] = useState("");
  const [shopId, setShopId] = useState("");
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { setConfig } = useOutletContext();


  const SAVE_BAR_ID = "settings-save-bar";

  // --- Initial load (Direct API - Admin GraphQL) ---
  useEffect(() => {
    async function initData() {
      shopify.loading(true)
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
        shopify.loading(false)
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

  // --- Handle Time Limit Change ---
  const handleTimeLimitChange = (field, value) => {
    setAppSettings({
      ...appSettings,
      time_limit: {
        ...(appSettings.time_limit || {}),
        [field]: value,
      },
    });
  };

  // --- Handle Tags Change ---
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
        setConfig(appSettings); // Sync with global app context
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
    return null
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
      <s-page heading="Settings">
        <s-grid
          gridTemplateColumns="1fr 2fr"
          gap="small"
          justifyContent="center">
          <s-stack gap="base">
            <s-section padding="none">
              <s-stack
                gap="none"
                overflow="hidden"
              >
                <s-grid
                  gridTemplateColumns="1fr auto"
                  alignItems="center"
                  padding="base"
                >
                  <s-box>
                    <s-heading>Enable </s-heading>
                  </s-box>
                  <s-switch
                    name="status"
                    checked={appSettings?.status === "enable"}
                    onChange={handleStatusChange}
                  />
                </s-grid>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("shipping_address_editing")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Shipping Address Editing</s-heading>
                    </s-box>
                    <s-switch
                      name="shipping_address_editing"
                      checked={appSettings?.shipping_address_editing?.status === "enable"}
                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("discount_code")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Enable Discount Code</s-heading>
                    </s-box>
                    <s-switch
                      name="shipping_address_editing"
                      checked={appSettings?.discount_code?.status === "enable"}
                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("invoice_download")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Invoice Download</s-heading>
                    </s-box>
                    <s-switch
                      name="invoice_download"
                      checked={appSettings?.invoice_download?.status === "enable"}

                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("delivery_instructions")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Delivery Instructions</s-heading>
                    </s-box>
                    <s-switch
                      name="delivery_instructions"
                      checked={appSettings?.delivery_instructions?.status === "enable"}


                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("order_line_items_editing")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Order Line Items Editing</s-heading>
                    </s-box>
                    <s-switch
                      name="order_line_items_editing"
                      checked={appSettings?.order_line_items_editing?.status === "enable"}
                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("adding_more_products")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Adding More Products</s-heading>
                    </s-box>
                    <s-switch
                      name="adding_more_products"
                      checked={appSettings?.adding_more_products?.status === "enable"}

                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
                <s-clickable
                  padding="small-100"
                  onClick={() => handleToggleSetting("phone_number_editing")}
                  accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    alignItems="center"
                    gap="base"
                  >
                    <s-box>
                      <s-heading>Phone Number Editing</s-heading>
                    </s-box>
                    <s-switch
                      name="phone_number_editing"
                      checked={appSettings?.phone_number_editing?.status === "enable"}
                    />
                  </s-grid>
                </s-clickable>
                <s-divider />
              </s-stack>
            </s-section>
            <s-section padding="none">
              <s-stack
                gap="none"
                overflow="hidden"
              >
                <s-grid
                  gridTemplateColumns="1fr auto"
                  alignItems="center"
                  padding="base"
                >
                  <s-box>
                    <s-heading>Enable time limit</s-heading>
                  </s-box>
                  <s-switch
                    checked={appSettings.time_limit?.status === "enable"}
                    onChange={() =>
                      handleTimeLimitChange(
                        "status",
                        appSettings.time_limit?.status === "enable"
                          ? "disable"
                          : "enable"
                      )
                    }
                  />
                </s-grid>
                <s-divider />
                <s-stack gap="base">
                  {appSettings.time_limit?.status === "enable" && (
                    <s-grid gridTemplateColumns="1fr" gap="base" padding="base">
                      <s-number-field
                        label="Time Value"
                        value={appSettings.time_limit?.time || 0}
                        min={0}
                        onChange={(e) =>
                          handleTimeLimitChange("time", Number(e.target.value))
                        }
                      />
                      <s-select
                        label="Time Period"
                        value={appSettings.time_limit?.period || "minutes"}
                        onChange={(e) => handleTimeLimitChange("period", e.target.value)}
                      >
                        <s-option value="minutes">Minutes</s-option>
                        <s-option value="hours">Hours</s-option>
                        <s-option value="days">Days</s-option>
                      </s-select>
                    </s-grid>
                  )}
                </s-stack>
              </s-stack>
            </s-section>
          </s-stack>
          <OrderPreview appSettings={appSettings} />
        </s-grid>
        <s-stack alignItems="center" padding="large">
          <s-text>Learn more about <s-link href="">creating puzzles</s-link>.</s-text>
        </s-stack>
      </s-page>
    </>
  );
}