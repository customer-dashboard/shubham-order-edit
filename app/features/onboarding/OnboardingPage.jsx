import { useState } from "react";
import { useOutletContext } from "react-router";

export default function OnboardingPage() {
  const { config, setConfig } = useOutletContext();
  const [isSaving, setIsSaving] = useState(false);

  const currentStep = config.onboarding?.step ?? 0;
  const toggleState = config.settings ?? {};

  const steps = [
    { id: 0, title: "Welcome", sub: "Let merchants edit orders easily." },
    { id: 1, title: "Features", sub: "Choose what merchants can edit." },
    { id: 2, title: "How it works", sub: "Understand the flow." },
    { id: 3, title: "Done", sub: "You're all set!" },
  ];

  const saveConfig = async (updatedConfig) => {
    setIsSaving(true);
    try {
      await fetch("/app/post-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "SAVE_ONBOARDING_STATE",
          config: updatedConfig,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const nav = (dir) => {
    const next = currentStep + dir;
    if (next < 0 || next >= steps.length) return;

    const updated = {
      ...config,
      onboarding: {
        ...config.onboarding,
        step: next,
        completed: next === steps.length - 1,
      },
    };

    setConfig(updated);
    saveConfig(updated);
  };

  const finish = () => {
    const updated = {
      ...config,
      onboarding: { ...config.onboarding, completed: true },
    };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleToggle = (key, value) => {
    const updated = {
      ...config,
      settings: { ...config.settings, [key]: value },
    };
    setConfig(updated);
    saveConfig(updated);
  };

  return (
    <s-page heading="Setup Guide">
      <s-card>
        <s-stack gap="loose">

          {/* STEP HEADER */}
          <s-stack gap="extraTight">
            <s-text variant="headingLg">
              {steps[currentStep].title}
            </s-text>
            <s-text color="subdued">
              {steps[currentStep].sub}
            </s-text>
          </s-stack>

          {/* STEP CONTENT */}
          {currentStep === 0 && (
            <s-stack gap="tight">
              <s-text>• Edit line items</s-text>
              <s-text>• Update shipping address</s-text>
              <s-text>• Apply discounts</s-text>
              <s-text>• Delivery instructions</s-text>
            </s-stack>
          )}

          {currentStep === 1 && (
            <s-stack gap="tight">
              {[
                { label: "Edit shipping address", key: "edit_shipping_address" },
                { label: "Edit phone number", key: "edit_phone_number" },
                { label: "Edit line items", key: "show_line_items" },
                { label: "Update quantity", key: "update_quantity" },
                { label: "Replace products", key: "replace_line_item" },
                { label: "Delivery instructions", key: "change_delivery_instruction" },
                { label: "Apply discount", key: "apply_discount" },
                { label: "Download invoice", key: "download_invoice" },
              ].map((item) => (
                <s-checkbox
                  key={item.key}
                  label={item.label}
                  checked={toggleState[item.key]}
                  onChange={(e) => handleToggle(item.key, e.target.checked)}
                />
              ))}
            </s-stack>
          )}

          {currentStep === 2 && (
            <s-stack gap="tight">
              <s-text>1. Customer opens order</s-text>
              <s-text>2. Makes changes</s-text>
              <s-text>3. Shopify updates instantly</s-text>
              <s-text>4. Notifications sent</s-text>
            </s-stack>
          )}

          {currentStep === 3 && (
            <s-banner status="success">
              Order editing is now live on your store 🎉
            </s-banner>
          )}

          {/* BUTTONS */}
          <s-stack alignment="end">
            {currentStep > 0 && (
              <s-button onClick={() => nav(-1)} disabled={isSaving}>
                Back
              </s-button>
            )}

            <s-button
              variant="primary"
              loading={isSaving}
              onClick={
                currentStep === steps.length - 1
                  ? finish
                  : () => nav(1)
              }
            >
              {currentStep === steps.length - 1
                ? "Go to dashboard"
                : "Continue"}
            </s-button>
          </s-stack>

        </s-stack>
      </s-card>
    </s-page>
  );
}