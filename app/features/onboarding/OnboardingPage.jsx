import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";

export default function OnboardingPage({ isReset }) {
  const { config, setConfig } = useOutletContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [isCheckingExtension, setIsCheckingExtension] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
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
    setHasInteracted(true);
    const currentStatus = config?.[key]?.status || "disable";
    const nextStatus = currentStatus === "enable" ? "disable" : "enable";

    const updated = {
      ...config,
      [key]: {
        ...config[key],
        status: nextStatus
      }
    };
    setConfig(updated);
  };

  const nav = (dir) => {
    const next = currentStep + dir;
    if (next < 0 || next >= steps.length) return;

    let updatedConfig = { ...config };

    // SMART LOGIC: If moving from Settings step (1) to next, and NO interaction was made, enable everything
    if (currentStep === 1 && dir === 1 && !hasInteracted) {
      const coreFeatures = [
        "shipping_address_editing",
        "phone_number_editing",
        "order_line_items_editing",
        "adding_more_products",
        "discount_code",
        "invoice_download",
        "delivery_instructions"
      ];
      coreFeatures.forEach(key => {
        updatedConfig[key] = { ...updatedConfig[key], status: "enable" };
      });
      // Ensure time limit is disabled unless merchant explicitly enabled it (not in onboarding)
      updatedConfig.time_limit = { ...updatedConfig.time_limit, status: "disable" };
    }

    const updated = {
      ...updatedConfig,
      onboarding: {
        ...updatedConfig.onboarding,
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
      { key: "shipping_address_editing", label: "Address Editing" },
      { key: "phone_number_editing", label: "Phone Number Updates" },
      { key: "order_line_items_editing", label: "Product Quantity Changes" },
      { key: "adding_more_products", label: "Adding New Products" },
      { key: "discount_code", label: "Discount Code Application" },
      { key: "invoice_download", label: "Invoice Downloads" },
    ];
    return features.filter(f => config?.[f.key]?.status === "enable");
  };

  return (
    <s-page inlineSize="base">
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
            <s-section inlineSize="small">
              {/* STEP 0: Welcome & Benefits */}
              {currentStep === 0 && (
                <s-grid gridTemplateColumns="2fr 1fr">
                  <s-stack gap="base">
                    <s-stack gap="small">
                      <h1 tone='bold' style={{ fontSize: "1rem", fontWeight: "600" }}> Welcome to Order Edit Pro!</h1>
                      <s-paragraph color="subdued">
                        Empower your customers to manage their own orders, reducing support tickets and increasing satisfaction.
                      </s-paragraph>
                    </s-stack>

                    <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                      <s-box padding="base" border="base" borderRadius="base" background="success-secondary">
                        <s-stack gap="tight">
                          <s-text tone="bold">Happier Customers</s-text>
                          <s-text color="subdued" variant="bodySm">Let them fix mistakes instantly without waiting for support.</s-text>
                        </s-stack>
                      </s-box>
                      <s-box padding="base" border="base" borderRadius="base" background="info-secondary">
                        <s-stack gap="tight">
                          <s-text tone="bold">Fewer Tickets</s-text>
                          <s-text color="subdued" variant="bodySm">Reduce manual work for address changes and item swaps.</s-text>
                        </s-stack>
                      </s-box>
                      <s-box padding="base" border="base" borderRadius="base" background="warning-secondary">
                        <s-stack gap="tight">
                          <s-text tone="bold">Instant Resolution</s-text>
                          <s-text color="subdued" variant="bodySm">Customers resolve issues 24/7 without needing your team.</s-text>
                        </s-stack>
                      </s-box>
                      <s-box padding="base" border="base" borderRadius="base" background="surface-secondary-active">
                        <s-stack gap="tight">
                          <s-text tone="bold">Professional Experience</s-text>
                          <s-text color="subdued" variant="bodySm">Modern self-serve portal that builds trust with your brand.</s-text>
                        </s-stack>
                      </s-box>
                    </s-grid>
                  </s-stack>
                  <s-image src="https://mandasa1.b-cdn.net/custlo_order_edit__720.png" alt="" />
                </s-grid>
              )}

              {/* STEP 1: Quick Settings */}
              {currentStep === 1 && (
                <s-stack gap="base">
                  <s-stack>
                    <h1 tone='bold' style={{ fontSize: "1rem", fontWeight: "600" }}> Quick Settings</h1>
                    <s-paragraph color="subdued">
                      Choose which parts of the order customers should be allowed to edit. You can change these anytime later.
                    </s-paragraph>
                  </s-stack>
                  <s-box border="base" borderRadius="base">
                    <s-stack gap="none">
                      {[
                        { key: "shipping_address_editing", label: "Allow Address Editing", icon: "truck" },
                        { key: "phone_number_editing", label: "Allow Phone Editing", icon: "mobile" },
                        { key: "order_line_items_editing", label: "Allow Item Quantity Changes", icon: "order" },
                        { key: "adding_more_products", label: "Allow Adding Products", icon: "plus" },
                        { key: "discount_code", label: "Allow Discount Codes", icon: "discount" },
                        { key: "invoice_download", label: "Allow Invoice Download", icon: "note" },
                      ].map((f, i, arr) => (
                        <s-box key={f.key}>
                          <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base" padding="base">
                            <s-icon type={f.icon} size="small" />
                            <s-text tone="bold">{f.label}</s-text>
                            <s-switch
                              checked={config?.[f.key]?.status === "enable"}
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
                  <s-stack>
                    <h1 tone='bold' style={{ fontSize: "1rem", fontWeight: "600" }}> Activate the Edit Block</h1>
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
                <s-stack gap="small" alignItems="center">
                  <s-box inlineSize="150px">
                    <s-image
                      src="https://as2.ftcdn.net/jpg/03/31/43/67/1000_F_331436731_6juLGFXf8VFGTxORH26ITUH0I6y1fPFb.jpg"
                      alt="Main view"
                      aspectRatio="1/1"
                      objectFit="cover"
                    />
                  </s-box>
                  <h1 tone='bold' style={{ fontSize: "1.2rem", fontWeight: "600" }}>Ready to Go!</h1>
                  <s-text color="subdued">Your order editing experience is configured and ready.</s-text>
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