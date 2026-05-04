import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";

export default function OnboardingPage({ isReset }) {
  const { config, setConfig } = useOutletContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [isCheckingExtension, setIsCheckingExtension] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { id: 0, title: "Welcome" },
    { id: 1, title: "Quick Settings" },
    { id: 2, title: "Activate Extension" },
    { id: 3, title: "Complete" },
  ];

  // If testing reset, start from 0, otherwise use saved step
  const [activeStep, setActiveStep] = useState(isReset ? 0 : (config.onboarding?.step ?? 0));
  const currentStep = Math.min(activeStep, steps.length - 1);

  const checkExtensionStatus = async () => {
    setIsCheckingExtension(true);
    try {
      // In a real app, this would check via API. For now, we mock the check or use shopify global
      const extensions = await shopify.app.extensions();
      const result = extensions.find((item) => item.handle === "order-edit");
      setIsExtensionActive(!!(result && result.activations.length > 0));
    } catch (e) {
      console.error("Failed to check extensions:", e);
      // Mock for dev if needed: setIsExtensionActive(true);
    } finally {
      setIsCheckingExtension(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2) {
      checkExtensionStatus();
    }
  }, [currentStep]);

  const saveOnboardingState = async (updatedConfig) => {
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

  const handleToggleSetting = (key) => {
    const updated = {
      ...config,
      appSettings: {
        ...config.appSettings,
        [key]: config.appSettings?.[key] === "enable" || config.appSettings?.[key] === true ? "disable" : "enable"
      }
    };
    // For boolean settings if they exist
    if (typeof config.appSettings?.[key] === "boolean") {
        updated.appSettings[key] = !config.appSettings[key];
    }
    setConfig(updated);
  };

  const nav = (dir) => {
    const next = currentStep + dir;
    if (next < 0 || next >= steps.length) return;
    const updated = {
      ...config,
      onboarding: {
        ...config.onboarding,
        step: next,
      },
    };
    setConfig(updated);
    saveOnboardingState(updated);
    setActiveStep(next);
  };

  const finish = () => {
    const updated = {
      ...config,
      onboarding: { ...config.onboarding, completed: true },
    };
    setConfig(updated);
    saveOnboardingState(updated);
    navigate("/");
  };

  const stepProgress = ((currentStep + 1) / steps.length) * 100;

  // Helper to get list of enabled features for summary
  const getEnabledFeatures = () => {
    const features = [
      { key: "edit_address", label: "Address Editing" },
      { key: "edit_phone", label: "Phone Number Updates" },
      { key: "edit_order_lines", label: "Product Quantity Changes" },
      { key: "add_products", label: "Adding New Products" },
      { key: "apply_discount", label: "Discount Code Application" },
      { key: "download_invoice", label: "Invoice Downloads" },
    ];
    return features.filter(f => config.appSettings?.[f.key] === "enable" || config.appSettings?.[f.key] === true);
  };

  return (
    <s-page inlineSize="small">
      <s-box paddingBlockStart="large">
        <s-stack gap="base">

          {/* Progress Bar */}
          <s-stack gap="extraTight">
            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
              <s-text color="subdued" variant="bodySm">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </s-text>
              <s-stack direction="inline" gap="extraTight">
                {steps.map((s) => (
                  <s-box
                    key={s.id}
                    blockSize="6px"
                    inlineSize="6px"
                    borderRadius="full"
                    background={s.id <= currentStep ? "info-active" : "surface-secondary-active"}
                  />
                ))}
              </s-stack>
            </s-stack>
            <s-box background="surface-secondary-active" blockSize="4px" borderRadius="full">
              <s-box
                background="info-active"
                inlineSize={`${stepProgress}%`}
                blockSize="100%"
                borderRadius="full"
              />
            </s-box>
          </s-stack>

          <s-stack gap="none">
            <s-section>
              {/* STEP 0: Welcome & Benefits */}
              {currentStep === 0 && (
                <s-stack gap="loose">
                  <s-stack gap="base">
                    <s-heading variant="headingLg">Welcome to Order Edit Pro!</s-heading>
                    <s-paragraph color="subdued">
                      Empower your customers to manage their own orders, reducing support tickets and increasing satisfaction.
                    </s-paragraph>
                  </s-stack>

                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-box padding="base" border="base" borderRadius="base" background="success-secondary">
                        <s-stack gap="tight">
                            <s-icon type="customer" tone="success" />
                            <s-text tone="bold">Happier Customers</s-text>
                            <s-text color="subdued" variant="bodySm">Let them fix mistakes instantly without waiting for support.</s-text>
                        </s-stack>
                    </s-box>
                    <s-box padding="base" border="base" borderRadius="base" background="info-secondary">
                        <s-stack gap="tight">
                            <s-icon type="note" tone="info" />
                            <s-text tone="bold">Fewer Tickets</s-text>
                            <s-text color="subdued" variant="bodySm">Reduce manual work for address changes and item swaps.</s-text>
                        </s-stack>
                    </s-box>
                  </s-grid>
                </s-stack>
              )}

              {/* STEP 1: Quick Settings */}
              {currentStep === 1 && (
                <s-stack gap="base">
                  <s-stack gap="extraTight">
                    <s-heading variant="headingLg">Select Features to Enable</s-heading>
                    <s-paragraph color="subdued">
                      Choose which parts of the order customers should be allowed to edit. You can change these anytime later.
                    </s-paragraph>
                  </s-stack>

                  <s-box border="base" borderRadius="base">
                    <s-stack gap="none">
                        {[
                            { key: "edit_address", label: "Allow Address Editing", icon: "truck" },
                            { key: "edit_phone", label: "Allow Phone Editing", icon: "mobile" },
                            { key: "edit_order_lines", label: "Allow Item Quantity Changes", icon: "order" },
                            { key: "add_products", label: "Allow Adding Products", icon: "plus" },
                            { key: "apply_discount", label: "Allow Discount Codes", icon: "discount" },
                            { key: "download_invoice", label: "Allow Invoice Download", icon: "note" },
                        ].map((f, i, arr) => (
                            <s-box key={f.key}>
                                <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base" padding="base">
                                    <s-icon type={f.icon} size="small" />
                                    <s-text tone="bold">{f.label}</s-text>
                                    <s-switch
                                        checked={config.appSettings?.[f.key] === "enable" || config.appSettings?.[f.key] === true}
                                        onChange={() => handleToggleSetting(f.key)}
                                    />
                                </s-grid>
                                {i < arr.length - 1 && <s-divider />}
                            </s-box>
                        ))}
                    </s-stack>
                  </s-box>
                </s-stack>
              )}

              {/* STEP 2: Activate Extension */}
              {currentStep === 2 && (
                <s-stack gap="base">
                  <s-stack gap="extraTight">
                    <s-heading variant="headingLg">Activate the Edit Block</s-heading>
                    <s-paragraph color="subdued">
                      Now, you need to add the Order Edit block to your Order Status page in the Shopify Editor.
                    </s-paragraph>
                  </s-stack>

                  <s-box padding="base" border="base" borderRadius="base" background="surface-secondary-active">
                    <s-stack gap="tight">
                        <s-text tone="bold">1. Click "Open Editor" below.</s-text>
                        <s-text tone="bold">2. Click "Add block" on the left panel.</s-text>
                        <s-text tone="bold">3. Select "Order Edit" and save.</s-text>
                    </s-stack>
                  </s-box>

                  <s-button
                    variant="primary"
                    href="shopify:admin/settings/checkout/editor?page=order-status&context=apps"
                  >
                    Open Checkout Editor
                  </s-button>

                  <s-box
                    padding="base"
                    border="base"
                    borderRadius="base"
                    background={isExtensionActive ? "success-secondary" : "warning-secondary"}
                  >
                    <s-stack direction="inline" alignItems="center" justifyContent="space-between">
                      <s-stack gap="none">
                        <s-text tone="bold">Status Check</s-text>
                        {isCheckingExtension ? (
                          <s-spinner size="small" />
                        ) : (
                          <s-text tone={isExtensionActive ? "success" : "critical"}>
                            {isExtensionActive ? "Extension Active ✓" : "Extension Not Found"}
                          </s-text>
                        )}
                      </s-stack>
                      <s-button icon="refresh" onClick={checkExtensionStatus} loading={isCheckingExtension} />
                    </s-stack>
                  </s-box>
                </s-stack>
              )}

              {/* STEP 3: Complete */}
              {currentStep === 3 && (
                <s-stack gap="loose">
                  <s-stack gap="base" alignItems="center">
                    <div style={{ fontSize: "48px" }}>🚀</div>
                    <s-heading variant="displayMd">Ready to Go!</s-heading>
                    <s-text>Your order editing experience is configured and ready.</s-text>
                  </s-stack>

                  <s-box padding="base" border="base" borderRadius="base">
                    <s-stack gap="tight">
                        <s-text tone="bold">Enabled Features:</s-text>
                        <s-stack direction="inline" gap="tight" wrap="wrap">
                            {getEnabledFeatures().map(f => (
                                <s-badge key={f.key} tone="success">{f.label}</s-badge>
                            ))}
                            {getEnabledFeatures().length === 0 && <s-text color="subdued">No features enabled yet.</s-text>}
                        </s-stack>
                    </s-stack>
                  </s-box>

                  <s-box padding="base" border="base" borderRadius="base" background="info-secondary">
                    <s-stack gap="tight" alignItems="center">
                        <s-text tone="bold">We'd love your feedback!</s-text>
                        <s-text variant="bodySm">If you find the app helpful, please leave us a 5-star rating.</s-text>
                        <div style={{ fontSize: "24px", letterSpacing: "4px" }}>⭐⭐⭐⭐⭐</div>
                    </s-stack>
                  </s-box>

                  <s-button variant="primary" onClick={finish} fullWidth>
                    Go to Dashboard →
                  </s-button>
                </s-stack>
              )}
            </s-section>

            {/* NAVIGATION */}
            <s-box paddingBlock="base" paddingInline="base" borderTop="base">
              <s-stack direction="inline" justifyContent="space-between">
                {currentStep > 0 ? (
                  <s-button onClick={() => nav(-1)}>Back</s-button>
                ) : (
                  <s-box />
                )}

                {currentStep < steps.length - 1 && (
                  <s-button
                    variant="primary"
                    onClick={() => nav(1)}
                    loading={isSaving}
                    disabled={currentStep === 2 && !isExtensionActive}
                  >
                    {currentStep === 0 ? "Let's Start →" : "Save & Continue →"}
                  </s-button>
                )}
              </s-stack>
            </s-box>

          </s-stack>
        </s-stack>
      </s-box>
    </s-page>
  );
}