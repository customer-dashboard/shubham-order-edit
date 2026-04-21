import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import countries from "./countries";
import COUNTRY_STATES from "./country-states";

export default async () => {
  render(<OrderStatusManager />, document.body);
};

// Keeping the tunnel URL as requested (current code is perfectly working)
const BASEURL = "https://nearly-diamond-treasures-jeremy.trycloudflare.com";

function OrderStatusManager() {
  const order = shopify.order;
  const sessionToken = shopify.sessionToken;
  const orderId = order?.current?.id;
  const storeId = shopify.shop.id.replace("gid://shopify/Shop/", "");
  const orderNumericId = orderId?.replace("gid://shopify/Order/", "");

  // Shared state
  const [shippingAddress, setShippingAddress] = useState(shopify.shippingAddress.value);
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(
    shopify.shippingAddress.value?.countryCode ?? shopify.shippingAddress.value?.["country"] ?? ""
  );

  // Box states
  const [addressBoxOpen, setAddressBoxOpen] = useState(false);
  const [phoneBoxOpen, setPhoneBoxOpen] = useState(false);
  const [openInvoice, setOpenInvoice] = useState(false);
  const [openDelivery, setOpenDelivery] = useState(false);

  // Saving states
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isPhoneSaving, setIsPhoneSaving] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  const [addressErrors, setAddressErrors] = useState([]);
  const [lastInvoiceAction, setLastInvoiceAction] = useState(null);

  // Settings
  const settings = shopify.settings.value;
  const showDownloadInvoice = settings?.download_invoice ?? true;
  const showDeliveryInst = settings?.change_delivery_instruction ?? true;

  // Invoice & Delivery logic
  const [invoiceOption, setInvoiceOption] = useState(["email"]);
  const [invoiceEmail, setInvoiceEmail] = useState(null);
  const [deliveryInst, setDeliveryInst] = useState("");
  const [orderId_full, setOrderId_full] = useState(null);

  // Refs for tracking changes
  const originalAddressRef = useRef(null);
  const originalPhoneRef = useRef(null);
  const originalNoteRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const token = await sessionToken.get();

        // 1. Load order details (including full ID and email)
        const orderRes = await fetch(`${BASEURL}/api/order-status`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ Target: "GET_ORDER_DETAILS", id: orderId }),
        });
        const json = await orderRes.json();
        const fetchedOrder = json.data;

        if (fetchedOrder) {
          if (fetchedOrder.shippingAddress) {
            setShippingAddress(fetchedOrder.shippingAddress);
            setSelectedCountry(fetchedOrder.shippingAddress.countryCode || fetchedOrder.shippingAddress.country || "");
            originalAddressRef.current = JSON.parse(JSON.stringify(fetchedOrder.shippingAddress));
            originalPhoneRef.current = fetchedOrder.shippingAddress.phone;
          }
          if (fetchedOrder.email) {
            setCustomerEmail(fetchedOrder.email);
          }
          if (fetchedOrder.id) {
            setOrderId_full(fetchedOrder.id);
          }
        }

        // 2. Load delivery note
        if (showDeliveryInst) {
          const noteRes = await fetch(`${BASEURL}/api/order/fetch_note`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ Target: "FETCH_DELIVERY_INSTRUCTIONS", UpdatedData: { orderId } }),
          });
          const { note } = await noteRes.json();
          setDeliveryInst(note ?? "");
          if (note && !originalNoteRef.current) originalNoteRef.current = note;
        }
      } catch (err) {
        shopify.toast.show("Error: Unable to load order details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orderId]);

  // Comparison helpers
  const hasAddressChanges = () => {
    if (!originalAddressRef.current || !shippingAddress) return false;
    const orig = originalAddressRef.current;
    const curr = shippingAddress;
    return (
      (orig.firstName ?? "") !== (curr.firstName ?? "") ||
      (orig.lastName ?? "") !== (curr.lastName ?? "") ||
      (orig.address1 ?? "") !== (curr.address1 ?? "") ||
      (orig.address2 ?? "") !== (curr.address2 ?? "") ||
      (orig.city ?? "") !== (curr.city ?? "") ||
      (orig.provinceCode ?? orig.province ?? "") !== (curr.provinceCode ?? curr.province ?? "") ||
      (orig.zip ?? "") !== (curr.zip ?? "") ||
      (orig.countryCode ?? orig.country ?? "") !== (curr.countryCode ?? curr.country ?? "")
    );
  };

  const hasPhoneChanges = () => {
    if (!originalPhoneRef.current || !shippingAddress?.phone) return false;
    return originalPhoneRef.current !== shippingAddress.phone;
  };

  const hasDeliveryInstChanges = () => {
    return originalNoteRef.current !== deliveryInst;
  };

  // Validation
  const validatePhone = (phone, countryCode) => {
    if (!phone) return "Phone number is required.";
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+")) return "Phone number must start with country code (e.g. +1).";
    const digits = cleaned.replace(/\D/g, "");
    const dialCodes = { IN: "91", US: "1", CA: "1", GB: "44", AU: "61" };
    const rules = { IN: 10, US: 10, CA: 10, GB: 10, AU: 9 };
    const dial = dialCodes[countryCode];
    const expectedLength = rules[countryCode];
    if (dial && expectedLength) {
      if (!digits.startsWith(dial)) return `Phone number must begin with +${dial} for ${countryCode}.`;
      const localLength = digits.length - dial.length;
      if (localLength !== expectedLength) return `Phone number must contain ${expectedLength} digits for your country.`;
    }
    if (/[^0-9+]/.test(phone)) return "Phone number cannot contain special characters.";
    return "";
  };

  const updateField = (field, event) => {
    const value = event.target?.value ?? event;
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const getCountryCode = (value) => {
    if (typeof value === "string" && value.length === 2) return value;
    const found = countries.find((c) => c.name.toLowerCase() === value?.toLowerCase());
    return found ? found.code : "";
  };

  const updateInvoice = (event) => {
    const newValuesArray = event?.target?.values;
    if (Array.isArray(newValuesArray) && newValuesArray.length > 0) {
      setInvoiceOption(newValuesArray);
    }
  };

  const handleInvoice = async () => {
    setIsSavingInvoice(true);
    try {
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          option: invoiceOption,
          email: invoiceOption.includes("email") ? (invoiceEmail || customerEmail) : undefined,
        }),
      });
      const json = await res.json();
      if (json?.message) {
        setLastInvoiceAction(json.message);
      }
    } catch (e) {
      shopify.toast.show("Error: Unable to process invoice.");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const updateDeliveryInst = async () => {
    try {
      setIsSavingDelivery(true);
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/delivery_instruction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          Target: "UPDATE_DELIVERY_INSTRUCTIONS",
          UpdatedData: {
            orderId: orderId_full ?? orderId,
            deliveryInstructions: deliveryInst
          }
        }),
      });
      const json = await res.json();
      const updatedNote = json.data.note;
      setDeliveryInst(updatedNote);
      originalNoteRef.current = updatedNote;
      shopify.toast.show("Delivery instructions saved successfully.");
    } catch (e) {
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setIsSavingDelivery(false);
    }
  };

  // Save Handlers
  const handleSaveAddress = async () => {
    const variables = {
      orderId: orderId,
      address: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        province: shippingAddress.provinceCode || shippingAddress.province,
        city: shippingAddress.city,
        zip: shippingAddress.zip,
        phone: shippingAddress.phone,
        territoryCode: shippingAddress.countryCode || shippingAddress.country,
      },
    };
    try {
      setIsAddressSaving(true);
      setAddressErrors([]);
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order_update_address`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ Target: "UPDATE_ADDRESS", UpdatedData: variables }),
      });
      const json = await res.json();
      if (json.status !== 200) {
        let extractedErrors = [];
        try {
          const match = json.error?.match(/\[(.*)\]/);
          if (match) extractedErrors = JSON.parse(match[0]);
        } catch (err) { }
        setAddressErrors(extractedErrors);
        return;
      }
      const updated = json.data;
      setShippingAddress(updated);
      originalAddressRef.current = JSON.parse(JSON.stringify(updated));
      shopify.toast.show("Address updated successfully.");
      if (typeof navigation !== "undefined") {
        navigation.navigate(`https://shopify.com/${storeId}/account/orders/${orderNumericId}`);
      }
    } catch (e) {
      shopify.toast.show("Error: Unable to save address.");
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleSavePhone = async () => {
    try {
      setIsPhoneSaving(true);
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/update_phone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          Target: "UPDATE_PHONE",
          UpdatedData: {
            orderId,
            address: { phone: shippingAddress.phone }
          }
        }),
      });
      const json = await res.json();
      if (json.status !== 200) throw new Error(json.error);

      const updatedPhone = json.data.phone;
      setShippingAddress((prev) => ({ ...prev, phone: updatedPhone }));
      originalPhoneRef.current = updatedPhone;
      shopify.toast.show("Phone updated successfully.");
      if (typeof navigation !== "undefined") {
        navigation.navigate(`https://shopify.com/${storeId}/account/orders/${orderNumericId}`);
      }
    } catch (e) {
      shopify.toast.show("Error: Unable to save phone.");
    } finally {
      setIsPhoneSaving(false);
    }
  };

  if (loading) {
    return (
      <s-section>
        <s-stack inlineSize="100%" justifyContent="center" gap="base">
          <s-spinner />
        </s-stack>
      </s-section>
    );
  }

  return (
    <s-stack>
      <s-section>
        <s-box border="base" borderRadius="base">
          {/* SHIPPING ADDRESS SECTION */}
          <s-box padding="base">
            <s-clickable inlineSize="100%" onClick={() => setAddressBoxOpen(!addressBoxOpen)}>
              <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                <s-box padding="large none">
                  <s-stack direction="inline" alignItems="center" gap="base">
                    <s-icon type="truck" />
                    <s-heading>Edit shipping address</s-heading>
                  </s-stack>
                </s-box>
                {addressBoxOpen ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
              </s-stack>
            </s-clickable>

            {addressBoxOpen && (
              <s-grid gap="base">
                <s-select
                  label="Country"
                  value={getCountryCode(shippingAddress?.countryCode ?? shippingAddress?.country)}
                  onChange={(val) => {
                    updateField("countryCode", val);
                    setSelectedCountry(val.target?.value ?? val);
                  }}
                >
                  {countries.map((c) => (
                    <s-option key={c.code} value={c.code}>{c.name}</s-option>
                  ))}
                </s-select>

                <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                  <s-text-field label="First name" value={shippingAddress?.firstName ?? ""} onChange={(val) => updateField("firstName", val)} />
                  <s-text-field label="Last name" value={shippingAddress?.lastName ?? ""} onChange={(val) => updateField("lastName", val)} />
                </s-grid>

                <s-text-field label="Address 1" value={shippingAddress?.address1 ?? ""} onChange={(val) => updateField("address1", val)} />
                <s-text-field label="Address 2" value={shippingAddress?.address2 ?? ""} onChange={(val) => updateField("address2", val)} />

                <s-select
                  label="State / Province"
                  value={shippingAddress?.provinceCode ?? shippingAddress?.province}
                  onChange={(val) => updateField("provinceCode", val)}
                >
                  <s-option value="">Select State</s-option>
                  {(COUNTRY_STATES[selectedCountry] ?? []).map((state) => (
                    <s-option key={state.code} value={state.code}>{state.name}</s-option>
                  ))}
                </s-select>

                <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                  <s-text-field
                    label="City"
                    value={shippingAddress?.city ?? ""}
                    error={addressErrors.find((e) => e.field?.includes("city"))?.message}
                    onChange={(val) => updateField("city", val)}
                  />
                  <s-text-field
                    label="Postal code"
                    value={shippingAddress?.zip ?? ""}
                    error={addressErrors.find((e) => e.field?.includes("zip") || e.field?.includes("postal"))?.message}
                    onChange={(val) => updateField("zip", val)}
                  />
                </s-grid>

                <s-stack direction="inline" justifyContent="end">
                  {hasAddressChanges() && (
                    <s-button variant="primary" loading={isAddressSaving} onClick={handleSaveAddress}>
                      Save address
                    </s-button>
                  )}
                </s-stack>
              </s-grid>
            )}
          </s-box>
          <s-divider />
          {/* PHONE NUMBER SECTION */}
          <s-box padding="base">
            <s-clickable inlineSize="100%" onClick={() => setPhoneBoxOpen(!phoneBoxOpen)}>
              <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                <s-box padding="large none">
                  <s-stack direction="inline" alignItems="center" gap="base">
                    <s-icon type="mobile" />
                    <s-heading>Phone Number (order)</s-heading>
                  </s-stack>
                </s-box>
                {phoneBoxOpen ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
              </s-stack>
            </s-clickable>

            {phoneBoxOpen && (
              <s-grid gap="base">
                <s-email-field readOnly label="Email" value={customerEmail} />
                <s-phone-field
                  label="Phone"
                  value={shippingAddress?.phone ?? ""}
                  error={validatePhone(shippingAddress?.phone, getCountryCode(shippingAddress?.countryCode ?? shippingAddress?.country))}
                  onChange={(val) => updateField("phone", val)}
                />
                <s-stack direction="inline" justifyContent="end">
                  {hasPhoneChanges() && (
                    <s-button variant="primary" loading={isPhoneSaving} onClick={handleSavePhone}>
                      Save phone
                    </s-button>
                  )}
                </s-stack>
              </s-grid>
            )}
          </s-box>
          <s-divider />
          {/* DOWNLOAD INVOICE SECTION */}
          {showDownloadInvoice && (
            <s-box padding="base">
              <s-clickable inlineSize="100%" onClick={() => setOpenInvoice(!openInvoice)}>
                <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                  <s-box padding="large none">
                    <s-stack direction="inline" alignItems="center" gap="base">
                      <s-icon type="note" />
                      <s-heading>Download Invoice</s-heading>
                    </s-stack>
                  </s-box>
                  {openInvoice ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
                </s-stack>
              </s-clickable>

              {openInvoice && (
                <s-stack gap="base" direction="block">
                  <s-choice-list values={invoiceOption} onChange={updateInvoice}>
                    <s-choice value="email">Send invoice by email</s-choice>
                  </s-choice-list>
                  <s-text type="small" color="subdued">
                    Send an invoice only when the order has a remaining balance (such as added items)
                  </s-text>
                  {invoiceOption.includes("email") && (
                    <s-text-field
                      label="Email"
                      value={invoiceEmail ?? customerEmail}
                      onChange={(val) => setInvoiceEmail(val.target.value)}
                    />
                  )}
                  <s-stack direction="inline" justifyContent="end">
                    <s-button loading={isSavingInvoice} onClick={handleInvoice}>Generate Invoice</s-button>
                  </s-stack>
                  {lastInvoiceAction && (
                    <s-banner tone="info"><s-text>{lastInvoiceAction}</s-text></s-banner>
                  )}
                </s-stack>
              )}
            </s-box>
          )}
          <s-divider />
          {/* DELIVERY INSTRUCTIONS SECTION */}
          {showDeliveryInst && (
            <s-box padding="base">
              <s-clickable inlineSize="100%" onClick={() => setOpenDelivery(!openDelivery)}>
                <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                  <s-box padding="large none">
                    <s-stack direction="inline" alignItems="center" gap="base">
                      <s-icon type="note" />
                      <s-heading>Change delivery instructions</s-heading>
                    </s-stack>
                  </s-box>
                  {openDelivery ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
                </s-stack>
              </s-clickable>

              {openDelivery && (
                <s-stack gap="base" direction="block">
                  <s-heading>Delivery Instructions</s-heading>
                  <s-text color="subdued">Special instructions provided by the customer for this order.</s-text>
                  <s-text-field
                    label="Delivery Instructions"
                    value={deliveryInst}
                    onChange={(val) => setDeliveryInst(val.target.value)}
                  />
                  <s-stack direction="inline" justifyContent="end">
                    {hasDeliveryInstChanges() && (
                      <s-button variant="primary" loading={isSavingDelivery} onClick={updateDeliveryInst}>Save changes</s-button>
                    )}
                  </s-stack>
                  <s-text type="small" color="subdued">These instructions will be shared with our delivery team.</s-text>
                </s-stack>
              )}
            </s-box>
          )}
        </s-box>
      </s-section>
    </s-stack>
  );
}