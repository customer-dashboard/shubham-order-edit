import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import countries from "./countries";
import COUNTRY_STATES from "./country-states";

export default async () => {
  render(<EditShippingAddress />, document.body);
};

const BASEURL = "https://nearly-diamond-treasures-jeremy.trycloudflare.com";

function EditShippingAddress() {
  const order = shopify.order;
  const sessionToken = shopify.sessionToken;
  const orderId = order?.current?.id;
  const settings = shopify.settings.value;

  const storeId = shopify.shop.id.replace("gid://shopify/Shop/", "");
  const orderNumericId = orderId.replace("gid://shopify/Order/", "");

  const [shippingAddress, setShippingAddress] = useState(shopify.shippingAddress.value);
  const [selectedCountry, setSelectedCountry] = useState(
    shopify.shippingAddress.value?.countryCode ?? shopify.shippingAddress.value?.["country"] ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [addressErrors, setAddressErrors] = useState([]);
  const [openBox, setOpenBox] = useState(false);

  const originalShippingAddressRef = useRef(null);

  useEffect(() => {
    if (shippingAddress && !originalShippingAddressRef.current) {
      originalShippingAddressRef.current = JSON.parse(JSON.stringify(shippingAddress));
    }
  }, [shippingAddress]);

  const hasShippingAddressChanges = () => {
    if (!originalShippingAddressRef.current || !shippingAddress) return false;
    const orig = originalShippingAddressRef.current;
    const current = shippingAddress;
    return (
      (orig.firstName ?? "") !== (current.firstName ?? "") ||
      (orig.lastName ?? "") !== (current.lastName ?? "") ||
      (orig.address1 ?? "") !== (current.address1 ?? "") ||
      (orig.address2 ?? "") !== (current.address2 ?? "") ||
      (orig.city ?? "") !== (current.city ?? "") ||
      (orig.provinceCode ?? orig?.["province"] ?? "") !== (current.provinceCode ?? current?.["province"] ?? "") ||
      (orig.zip ?? "") !== (current.zip ?? "") ||
      (orig.countryCode ?? orig?.["country"] ?? "") !== (current.countryCode ?? current?.["country"] ?? "") ||
      (orig.phone ?? "") !== (current.phone ?? "")
    );
  };

  const updateShippingField = (field, event) => {
    const value = event.target?.value ?? event;
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const getCountryCode = (value) => {
    if (typeof value === "string" && value.length === 2) return value;
    const found = countries.find((c) => c.name.toLowerCase() === value?.toLowerCase());
    return found ? found.code : "";
  };

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

  const handleSaveAddress = async () => {
    const variables = {
      orderId: orderId,
      address: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        province: shippingAddress.provinceCode,
        city: shippingAddress.city,
        zip: shippingAddress.zip,
        phone: shippingAddress.phone,
        territoryCode: shippingAddress.countryCode,
      },
    };
    try {
      setIsSaving(true);
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
          const match = json.data.error.match(/\[(.*)\]/);
          if (match) extractedErrors = JSON.parse(match[0]);
        } catch (err) { }
        setAddressErrors(extractedErrors);
        return;
      }
      setAddressErrors([]);
      const updatedAddress = json.data;
      setShippingAddress(updatedAddress);
      originalShippingAddressRef.current = JSON.parse(JSON.stringify(updatedAddress));
      shopify.toast.show("Address updated successfully.");
      navigation.navigate(`https://shopify.com/${storeId}/account/orders/${orderNumericId}`);
    } catch (e) {
      setAddressErrors([{ field: ["unknown"], message: "Unexpected error" }]);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <s-section>
      <s-box padding="base">
        <s-clickable inlineSize="100%" onClick={() => setOpenBox(!openBox)}>
          <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
            <s-box padding="large none">
              <s-stack direction="inline" alignItems="center" gap="base">
                <s-icon type="truck" />
                <s-heading>Edit shipping address</s-heading>
              </s-stack>
            </s-box>
            {openBox ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
          </s-stack>
        </s-clickable>

        {openBox && (
          <s-grid gap="base">
            <s-select
              label="Country"
              value={getCountryCode(shippingAddress?.countryCode ?? shippingAddress?.["country"])}
              onChange={(val) => {
                updateShippingField("countryCode", val);
                setSelectedCountry(val.target.value);
              }}
            >
              {countries.map((c) => (
                <s-option key={c.code} value={c.code}>{c.name}</s-option>
              ))}
            </s-select>

            <s-phone-field
              label="Phone"
              value={shippingAddress?.phone ?? ""}
              error={
                validatePhone(shippingAddress?.phone, shippingAddress?.countryCode) ||
                addressErrors.find((e) => Array.isArray(e.field) && e.field[e.field.length - 1] === "phone")?.message
              }
              onChange={(val) => updateShippingField("phone", val)}
            />

            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-text-field label="First name" value={shippingAddress?.firstName ?? ""} onChange={(val) => updateShippingField("firstName", val)} />
              <s-text-field label="Last name" value={shippingAddress?.lastName ?? ""} onChange={(val) => updateShippingField("lastName", val)} />
            </s-grid>

            <s-text-field label="Address 1" value={shippingAddress?.address1 ?? ""} onChange={(val) => updateShippingField("address1", val)} />
            <s-text-field label="Address 2" value={shippingAddress?.address2 ?? ""} onChange={(val) => updateShippingField("address2", val)} />

            <s-select
              label="State / Province"
              value={shippingAddress?.provinceCode}
              onChange={(val) => updateShippingField("provinceCode", val)}
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
                error={addressErrors.find((e) => e.field.includes("city"))?.message}
                onChange={(val) => updateShippingField("city", val)}
              />
              <s-text-field
                label="Postal code"
                value={shippingAddress?.zip ?? ""}
                error={addressErrors.find((e) => e.field.includes("zip") || e.field.includes("postal"))?.message}
                onChange={(val) => updateShippingField("zip", val)}
              />
            </s-grid>

            <s-stack direction="inline" justifyContent="end">
              {hasShippingAddressChanges() && (
                <s-button variant="primary" loading={isSaving} onClick={handleSaveAddress}>
                  Save changes
                </s-button>
              )}
            </s-stack>
          </s-grid>
        )}
      </s-box>
    </s-section>
  );
}