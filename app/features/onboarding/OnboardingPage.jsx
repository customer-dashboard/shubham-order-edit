import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";

export default function OnboardingPage() {
  const { config, setConfig } = useOutletContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [isCheckingExtension, setIsCheckingExtension] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { id: 0, title: "Welcome" },
    { id: 1, title: "Activation" },
    { id: 2, title: "Features" },
    { id: 3, title: "Complete" },
  ];

  const currentStep = Math.min(config.onboarding?.step ?? 0, steps.length - 1);

  const checkExtensionStatus = async () => {
    setIsCheckingExtension(true);
    try {
      const extensions = await shopify.app.extensions();
      const result = extensions.find((item) => item.handle === "order-edit");
      setIsExtensionActive(!!(result && result.activations.length > 0));
    } catch (e) {
      console.error("Failed to check extensions:", e);
    } finally {
      setIsCheckingExtension(false);
    }
  };

  useEffect(() => {
    if (currentStep === 1) {
      checkExtensionStatus();
    }
  }, [currentStep]);

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
    navigate("/");
  };

  const stepProgress = ((currentStep + 1) / steps.length) * 100;

  return (
    <s-page inlineSize="small">
      <s-box>
        <s-stack gap="base">

          {/* Progress Bar */}
          <s-stack gap="extraTight">
            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
              <s-text color="subdued" variant="bodySm">
                Step {currentStep + 1} of {steps.length}
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
              {currentStep === 0 && (
                <s-grid gridTemplateColumns="1fr auto" gap="none" alignItems="stretch">
                  <s-box>
                    <s-stack gap="base">
                      <s-text variant="headingLg">
                        Let Customers Fix Orders — Before It Becomes Support Work
                      </s-text>

                      <s-paragraph color="subdued">
                        Reduce cancellations, cut support tickets, and give shoppers full control directly from the order status page.
                      </s-paragraph>
                      <s-divider />
                      <s-stack gap="tight">
                        <s-box paddingBlockEnd="base">
                          <s-grid gridTemplateColumns="auto 1fr" alignItems="center" gap="base">
                            <s-icon type="chevron-right" />
                            <s-box>
                              <s-heading>Edit Order Details</s-heading>
                              <s-paragraph color="subdued">
                                Update address, phone number, and delivery instructions
                              </s-paragraph>
                            </s-box>
                          </s-grid>
                        </s-box>
                        <s-box paddingInline="small-100">
                          <s-divider />
                        </s-box>
                        <s-box paddingBlockEnd="base" paddingBlockStart="base">
                          <s-grid gridTemplateColumns="auto 1fr" alignItems="center" gap="base">
                            <s-icon type="chevron-right" />
                            <s-box>
                              <s-heading>Modify Products</s-heading>
                              <s-paragraph color="subdued">
                                Change quantity, swap items, or add new products
                              </s-paragraph>
                            </s-box>
                          </s-grid>
                        </s-box>
                        <s-box paddingInline="small-100">
                          <s-divider />
                        </s-box>
                        <s-box paddingBlockEnd="base" paddingBlockStart="base">
                          <s-grid gridTemplateColumns="auto 1fr" alignItems="center" gap="base">
                            <s-icon type="chevron-right" />
                            <s-box>
                              <s-heading>Apply Discounts & Updates</s-heading>
                              <s-paragraph color="subdued">
                                Let customers apply coupons or make last-minute changes
                              </s-paragraph>
                            </s-box>
                          </s-grid>
                        </s-box>
                      </s-stack>
                    </s-stack>
                  </s-box>
                  <s-box
                    background="success-secondary"
                    maxInlineSize="220px"
                    minInlineSize="220px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <s-image
                      src="https://cdn.shopify.com/s/files/1/0649/8743/1125/files/image_8.png?v=1776924944"
                      aspectRatio="1/1"
                      alt="Order editing preview"
                    />
                  </s-box>
                </s-grid>
              )}

              {/* ── STEP 1: Activate ── */}
              {currentStep === 1 && (
                <s-stack gap="base">
                  <s-stack gap="extraTight">
                    <s-heading variant="headingLg">Activate Order Editing Block</s-heading>
                    <s-paragraph color="subdued">
                      Enable the Order Edit block on your order status page so customers can update orders after purchase.
                    </s-paragraph>
                  </s-stack>

                  {/* How-to steps */}
                  <s-grid gridTemplateColumns="1fr 1fr" gap='base'>
                    <s-box padding="base" border="base" borderRadius="base">
                      <s-stack gap="tight">
                        <s-box
                          padding="extraTight"
                          paddingInline="tight"
                          background="success-secondary"
                          borderRadius="full"
                          display="inline-flex"
                        >
                          <s-text variant="bodySm" tone="success">Step 1</s-text>
                        </s-box>
                        <s-text tone="bold">Open Checkout Editor</s-text>
                        <s-text color="subdued" variant="bodySm">
                          Go to your Shopify checkout editor using the button below
                        </s-text>
                      </s-stack>
                    </s-box>
                    <s-box padding="base" border="base" borderRadius="base">
                      <s-stack gap="tight">
                        <s-box
                          padding="extraTight"
                          paddingInline="tight"
                          background="surface-secondary-active"
                          borderRadius="full"
                          display="inline-flex"
                        >
                          <s-text variant="bodySm" color="subdued">Step 2</s-text>
                        </s-box>
                        <s-text tone="bold">Add the Block</s-text>
                        <s-text color="subdued" variant="bodySm">
                          Find "Order Edit" in the blocks panel and add it to the order status page
                        </s-text>
                      </s-stack>
                    </s-box>
                  </s-grid>

                  {/* Status indicator */}
                  <s-box
                    padding="base"
                    border="base"
                    borderRadius="base"
                    background={isExtensionActive ? "success-secondary" : "warning-secondary"}
                  >
                    <s-stack direction="inline" alignItems="center" justifyContent="space-between">
                      <s-stack gap="none">
                        <s-text tone="bold">Extension Status</s-text>
                        {isCheckingExtension ? (
                          <s-stack direction="inline" gap="extraTight" alignItems="center">
                            <s-spinner size="small" />
                            <s-text color="subdued" variant="bodySm">Checking…</s-text>
                          </s-stack>
                        ) : (
                          <s-text
                            tone={isExtensionActive ? "success" : "critical"}
                            variant="bodySm"
                          >
                            {isExtensionActive ? "Active ✓" : "Not enabled"}
                          </s-text>
                        )}
                      </s-stack>
                      <s-button icon="refresh" onClick={checkExtensionStatus} />
                    </s-stack>
                  </s-box>

                  <s-button
                    variant="primary"
                    href="shopify:admin/settings/checkout/editor?page=order-status&context=apps"
                  >
                    Open Checkout Editor
                  </s-button>

                  <s-text color="subdued" variant="bodySm">
                    Enable the block, click refresh ↻ to verify, then continue.
                  </s-text>
                </s-stack>
              )}

              {/* ── STEP 2: Features ── */}
              {currentStep === 2 && (
                <s-stack gap="base">
                  <s-stack gap="extraTight">
                    <s-heading variant="headingLg">What Your Customers Can Do</s-heading>
                    <s-paragraph color="subdued">
                      Once live, customers can self-serve their order changes — saving you time and reducing support load.
                    </s-paragraph>
                  </s-stack>

                  <s-grid gridTemplateColumns="1fr 1fr" gap='base'>

                    {[
                      { icon: "location", tone: "success", bg: "success-secondary", title: "Update Shipping", desc: "Change address, phone, and delivery notes" },
                      { icon: "products", tone: "info", bg: "info-secondary", title: "Modify Items", desc: "Update quantity or replace products" },
                      { icon: "plus", tone: "success", bg: "success-secondary", title: "Add Products", desc: "Add new items before fulfillment" },
                      { icon: "discount", tone: "warning", bg: "warning-secondary", title: "Apply Discounts", desc: "Use promo codes after ordering" },
                      { icon: "customer", tone: "info", bg: "info-secondary", title: "Update Contact", desc: "Keep phone and email current" },
                      { icon: "note", tone: "subdued", bg: "surface-secondary-active", title: "Delivery Notes", desc: "Add instructions for the courier" },
                    ].map((f) => (
                      <s-box key={f.title} padding="base" border="base" borderRadius="base">
                        <s-stack direction="inline" gap="tight" alignItems="flex-start">
                          <s-box padding="extraTight" background={f.bg} borderRadius="base">
                            <s-icon source={f.icon} tone={f.tone} size="small" />
                          </s-box>
                          <s-stack gap="none">
                            <s-text tone="bold">{f.title}</s-text>
                            <s-text color="subdued" variant="bodySm">{f.desc}</s-text>
                          </s-stack>
                        </s-stack>
                      </s-box>
                    ))}

                  </s-grid>
                </s-stack>
              )}

              {/* ── STEP 3: Complete ── */}
              {currentStep === 3 && (
                <s-box padding="large-200">
                  <s-stack gap="loose" alignItems="center">
                    <s-stack gap="base" alignItems="center" justifyContent="center" display="flex">
                      <div style={{ fontSize: "48px", width: "100px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }} className="onbordblessicon">🎉</div>
                      <s-heading variant="displayMd">You're All Set!</s-heading>
                      <s-box padding="extraTight" borderRadius="base">
                        <div style={{ fontSize: "13px", display: "flex", alignItems: "center", textAlign: "center", justifyContent: "center", borderRadius: "50%" }} className="onbordblessicon">
                          Your order editing experience is now live. Customers can update orders directly reducing support tickets and cancellations.
                        </div>
                      </s-box>
                    </s-stack>
                    <s-box paddingBlockStart="base" paddingBlockEnd="base" borderRadius="base">
                      <s-button variant="primary" onClick={finish}>
                        Go to Dashboard →
                      </s-button>
                    </s-box>
                    <s-text color="subdued" variant="bodySm">
                      You can update settings anytime from your dashboard.
                    </s-text>

                  </s-stack>
                </s-box>
              )}
            </s-section>
            {/* ── NAVIGATION ── */}
            <s-box paddingBlock="base" paddingInline="base" borderTop="base">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                {currentStep > 0 ? (
                  <s-button onClick={() => nav(-1)}>← Previous</s-button>
                ) : (
                  <s-box />
                )}

                {currentStep < steps.length - 1 && (
                  <s-button
                    variant="primary"
                    onClick={() => nav(1)}
                    loading={isSaving}
                    disabled={currentStep === 1 && !isExtensionActive}
                  >
                    {currentStep === 0 ? "Get Started →" : "Continue →"}
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