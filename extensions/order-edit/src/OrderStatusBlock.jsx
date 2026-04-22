import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import countries from "./countries";
import COUNTRY_STATES from "./country-states";

export default async () => {
    render(<OrderStatusManager />, document.body);
};

// Keeping the tunnel URL as requested (current code is perfectly working)
const BASEURL = "https://timber-remarks-indirect-chest.trycloudflare.com";

function OrderStatusManager() {
    const { edit_address, edit_phone, apply_discount, download_invoice, delivery_instructions, edit_order_lines, add_products } = shopify.settings.value;
    const view = shopify.extension.editor
    console.log("idfoksdfk====", view)
    const orderId = shopify.order?.value?.id;
    const sessionToken = shopify.sessionToken;

    const storeId = shopify.shop?.id?.replace("gid://shopify/Shop/", "") || "";
    const orderNumericId = orderId?.replace("gid://shopify/Order/", "");

    const currencyCode = shopify.localization.currency?.value?.isoCode || 'INR';
    const countryCode = shopify.localization.country?.value?.isoCode || 'IN';

    const formatPrice = (amount, code = currencyCode) => {
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: code,
            }).format(amount);
        } catch (e) {
            return `${code} ${amount}`;
        }
    };

    // Shared state
    const [shippingAddress, setShippingAddress] = useState(shopify.shippingAddress?.value || {});
    const [customerEmail, setCustomerEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState(
        shopify.shippingAddress?.value?.countryCode ?? shopify.shippingAddress?.value?.["country"] ?? ""
    );

    // Box states
    const [addressBoxOpen, setAddressBoxOpen] = useState(false);
    const [phoneBoxOpen, setPhoneBoxOpen] = useState(false);
    const [openInvoice, setOpenInvoice] = useState(false);
    const [openDelivery, setOpenDelivery] = useState(false);
    const [openAddProduct, setOpenAddProduct] = useState(false);
    const [openEditLines, setOpenEditLines] = useState(false);
    const [replaceIndex, setReplaceIndex] = useState(null);
    const [openDiscountBox, setOpenDiscountBox] = useState(false);
    const [discountCode, setDiscountCode] = useState("");
    const [applyDiscountLoading, setApplyDiscountLoading] = useState(false);


    // Saving states
    const [isAddressSaving, setIsAddressSaving] = useState(false);
    const [isPhoneSaving, setIsPhoneSaving] = useState(false);
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);
    const [isSavingDelivery, setIsSavingDelivery] = useState(false);

    const [addressErrors, setAddressErrors] = useState([]);
    const [lastInvoiceAction, setLastInvoiceAction] = useState(null);



    // Invoice & Delivery logic
    const [invoiceOption, setInvoiceOption] = useState(["email"]);
    const [invoiceEmail, setInvoiceEmail] = useState(null);
    const [deliveryInst, setDeliveryInst] = useState("");
    const [orderId_full, setOrderId_full] = useState(null);

    // Product Search/Add state (Adopting reference implementation)
    const [fullOrder, setFullOrder] = useState(null);
    const [originalOrder, setOriginalOrder] = useState(null);
    const [productSearchQuery, setProductSearchQuery] = useState("");
    const [productSearchResults, setProductSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSavingLines, setIsSavingLines] = useState(false);
    const [isAddingProducts, setIsAddingProducts] = useState(false);
    const [isSavingFullOrder, setIsSavingFullOrder] = useState(false);
    const [page, setPage] = useState(0);

    const originalFullOrderRef = useRef(null);
    const baselineReadyRef = useRef(false);

    const pageSize = 4;
    const products_list = productSearchResults ?? [];
    const totalPages = Math.max(1, Math.ceil(products_list.length / pageSize));
    const start = page * pageSize;
    const visibleProducts = products_list.slice(start, start + pageSize);

    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

    const normalizeProducts = (raw) =>
        raw.map((item) => {
            const product = item.node ?? item;
            return {
                id: product.id,
                title: product.title,
                vendor: product.vendor,
                featuredImage: product.featuredImage ?? null,
                variants: product.variants
            };
        });

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
                    body: JSON.stringify({ Target: "GET_ORDER_DETAILS", id: orderId, countryCode }),
                });

                if (!orderRes.ok) {
                    throw new Error(`Order fetch failed with status: ${orderRes.status}`);
                }

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

                    // Reference logic: Initialize order staging
                    let fetchedForStaging = deepClone(fetchedOrder);
                    if (fetchedForStaging?.lineItems?.edges) {
                        fetchedForStaging = {
                            ...fetchedForStaging,
                            lineItems: {
                                ...fetchedForStaging.lineItems,
                                edges: fetchedForStaging.lineItems.edges.filter((e) => e?.node?.currentQuantity > 0)
                            }
                        };
                    }
                    setFullOrder(fetchedForStaging);
                    setOriginalOrder(fetchedForStaging);
                }

                // Fetch initial products (Reference logic)
                try {

                    const pRes = await fetch(`${BASEURL}/api/products_search`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
                        body: JSON.stringify({ query: "" }), // Fetch some default products or empty
                    });
                    const json = await pRes.json();
                    setProductSearchResults(normalizeProducts(json.data || []));

                } catch (e) {
                    console.error("Products search error:", e);
                    setProductSearchResults([]);
                }

                // 2. Load delivery note

                const noteRes = await fetch(`${BASEURL}/api/order/fetch_note`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
                    body: JSON.stringify({ Target: "FETCH_DELIVERY_INSTRUCTIONS", UpdatedData: { orderId } }),
                });
                const { note } = await noteRes.json();
                setDeliveryInst(note ?? "");
                if (note && !originalNoteRef.current) originalNoteRef.current = note;

            } catch (err) {
                console.error("loadData error:", err);
                shopify.toast.show("Error: Unable to load order details.");
            } finally {

                setLoading(false);
            }
        }
        loadData();
    }, [orderId]);

    // Comparison helpers
    const hasAddressChanges = () => {
        const orig = originalAddressRef.current || {};
        const curr = shippingAddress || {};
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
        const orig = originalPhoneRef.current ?? "";
        const curr = shippingAddress?.phone ?? "";
        return orig !== curr;
    };

    const hasDeliveryInstChanges = () => {
        return (originalNoteRef.current ?? "") !== (deliveryInst ?? "");
    };

    const hasLineItemsChanges = () => {
        if (!baselineReadyRef.current || !originalFullOrderRef.current || !fullOrder) return false;
        const origEdges = originalFullOrderRef.current.lineItems?.edges ?? [];
        const newEdges = fullOrder.lineItems?.edges ?? [];
        const hasAdded = newEdges.some((edge) => edge.added || !edge?.node?.id);
        const hasRemoved = origEdges.some((origEdge) => {
            const origId = origEdge?.node?.id;
            if (!origId) return false;
            const newEdge = newEdges.find((edge) => edge?.node?.id && String(edge.node.id) === String(origId));
            return !newEdge || newEdge.remove;
        });
        const hasQuantityChanged = origEdges.some((origEdge) => {
            const origId = origEdge?.node?.id;
            if (!origId) return false;
            const newEdge = newEdges.find((edge) => edge?.node?.id && String(edge.node.id) === String(origId));
            return newEdge && Number(origEdge.node.quantity) !== Number(newEdge.node.quantity);
        });
        const hasReplaced = newEdges.some((edge) => edge.replaced_with);
        return hasAdded || hasRemoved || hasQuantityChanged || hasReplaced;
    };

    const updateLineQty = (index, value) => {
        const qty = Number(value.target?.value ?? value);
        setFullOrder((o) => {
            if (!o) return o;
            const edges = o.lineItems?.edges ?? [];
            return {
                ...o,
                lineItems: {
                    ...o.lineItems,
                    edges: edges.map((edge, i) => i === index ? { ...edge, node: { ...edge.node, quantity: qty } } : edge)
                }
            };
        });
    };

    const toggleRemove = (index) => {
        setFullOrder((o) => {
            if (!o) return o;
            const edges = o.lineItems?.edges ?? [];
            const updatedEdges = edges.map((edge, i) => {
                if (i !== index) return edge;
                const alreadyRemoved = edge.remove === true;
                const originalQty = edge.originalQuantity ?? edge.node?.quantity ?? edge.node?.currentQuantity ?? 1;
                if (alreadyRemoved) {
                    const { remove, originalQuantity, ...restEdge } = edge;
                    return { ...restEdge, node: { ...edge.node, quantity: originalQuantity } };
                }
                return { ...edge, remove: true, originalQuantity: originalQty, node: { ...edge.node, quantity: 0 } };
            });
            return { ...o, lineItems: { ...o.lineItems, edges: updatedEdges } };
        });
    };

    const toggleReplace = (index, newProduct) => {
        const variantNode = newProduct?.variants?.edges?.[0]?.node || newProduct?.variants?.[0];
        if (!variantNode) return;
        const price = variantNode?.contextualPricing?.price?.amount || variantNode?.price || "0.00";
        const itemCurrency = variantNode?.contextualPricing?.price?.currencyCode || currencyCode;
        const newVariantId = variantNode.id;
        setFullOrder((prev) => {
            if (!prev) return prev;
            const edges = prev.lineItems?.edges ?? [];
            const updatedEdges = edges.map((edge, i) => {
                if (i !== index) return edge;
                const alreadyReplaced = edge.replaced_with && String(edge.replaced_with.variant_id) === String(newVariantId);
                if (alreadyReplaced) {
                    const { replaced_with, ...rest } = edge;
                    return rest;
                }
                return {
                    ...edge,
                    replaced_with: {
                        title: newProduct.title ?? newProduct.node?.title ?? "",
                        variant_id: newVariantId,
                        product_id: newProduct.id ?? null,
                        price: String(price)
                    }
                };
            });
            return { ...prev, lineItems: { ...prev.lineItems, edges: updatedEdges } };
        });
    };

    const handleOrderEdit = async (source) => {
        if (!fullOrder || !originalOrder) return;

        if (source === "lines") setIsSavingLines(true);
        else if (source === "add") setIsAddingProducts(true);
        else setIsSavingFullOrder(true);

        try {
            const origEdges = originalOrder.lineItems?.edges ?? [];
            const newEdges = fullOrder.lineItems?.edges ?? [];
            const changed_line_items = [], added_line_items = [], removed_line_items = [], replacement_items = [];
            const origById = {};
            origEdges.forEach((edge) => { if (edge?.node?.id) origById[String(edge.node.id)] = edge; });
            newEdges.forEach((edge) => {
                const node = edge?.node ?? {};
                const itemId = node?.id;
                if (!itemId || edge.added) {
                    added_line_items.push({ variant_id: edge.variant_id ?? null, product_id: edge.product_id ?? null, quantity: node.quantity ?? 1, price: node.originalUnitPriceSet?.shopMoney?.amount ?? "0.00", title: node.name ?? edge.title ?? "", properties: node.properties ?? [] });
                    return;
                }
                const origEdge = origById[String(itemId)];
                if (!origEdge) return;
                if (edge.replaced_with) {
                    replacement_items.push({
                        old_line_item_id: itemId,
                        variant_id: origEdge.node.variant?.id,
                        new_item: {
                            title: edge.replaced_with.title ?? "",
                            variant_id: edge.replaced_with.variant_id ?? null,
                            product_id: edge.replaced_with.product_id ?? null,
                            price: edge.replaced_with.price ?? "0.00",
                            quantity: node.quantity ?? origEdge.node.quantity
                        }
                    });
                    return;
                }
                if (edge.remove) {
                    removed_line_items.push({
                        id: itemId,
                        variant_id: origEdge.node.variant?.id
                    });
                    return;
                }
                if (Number(origEdge.node.quantity) !== Number(node.quantity)) {
                    changed_line_items.push({
                        id: itemId,
                        variant_id: origEdge.node.variant?.id,
                        quantity: Number(node.quantity)
                    });
                }
            });
            const updated = {};
            if (changed_line_items.length) updated.changed_line_items = changed_line_items;
            if (added_line_items.length) updated.added_line_items = added_line_items;
            if (removed_line_items.length) updated.removed_line_items = removed_line_items;
            if (replacement_items.length) updated.replacements = replacement_items;

            if (!Object.keys(updated).length) {
                setIsSavingLines(false);
                setIsAddingProducts(false);
                setIsSavingFullOrder(false);
                return;
            }

            const token = await sessionToken.get();
            const res = await fetch(`${BASEURL}/api/order/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "application/json" },
                body: JSON.stringify({ Target: "UPDATE_ORDER", id: orderId_full ?? orderId, updated }),
            });
            const json = await res.json();
            if (json.status === 200) {
                shopify.toast.show("Order updated successfully.");
                if (typeof shopify.navigation !== "undefined") {
                    shopify.navigation.navigate(`https://shopify.com/${storeId}/account/orders/${orderNumericId}`);
                }
            } else {
                shopify.toast.show(`Error: ${json.error || "Unable to save changes."}`);
            }
        } catch (e) {
            shopify.toast.show("Error: Unable to save changes.");
        } finally {
            setIsSavingLines(false);
            setIsAddingProducts(false);
            setIsSavingFullOrder(false);
        }
    };

    useEffect(() => {
        if (!fullOrder) return;
        if (!baselineReadyRef.current) {
            const edges = fullOrder?.lineItems?.edges ?? [];
            if (edges.length > 0) {
                originalFullOrderRef.current = deepClone(fullOrder);
                baselineReadyRef.current = true;
            }
        }
    }, [fullOrder]);

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

    const applyDiscount = async () => {
        if (!discountCode) return;
        setApplyDiscountLoading(true);
        try {
            const token = await sessionToken.get();
            const res = await fetch(`${BASEURL}/api/discount/apply`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: orderId_full || orderId, code: discountCode }),
            });
            const json = await res.json();
            if (!res.ok) {
                shopify.toast.show(json.error || "Discount already applied or invalid.");
                return;
            }
            shopify.toast.show("Discount applied!");
            if (typeof shopify.navigation !== "undefined") {
                shopify.navigation.navigate(`https://shopify.com/${storeId}/account/orders/${orderNumericId}`);
            }
        } catch (e) {
            shopify.toast.show("Error: Unable to apply discount.");
        } finally {
            setApplyDiscountLoading(false);
        }
    };


    const handleProductSearch = async (query) => {
        setProductSearchQuery(query);
        setPage(0);
        setSearchLoading(true);
        try {
            const token = await sessionToken.get();
            const res = await fetch(`${BASEURL}/api/products_search`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ query, countryCode }),
            });
            const json = await res.json();
            setProductSearchResults(normalizeProducts(json.data || []));
        } catch (e) {
            console.error("Search error:", e);
            setProductSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const toggleAddProduct = (product) => {
        setFullOrder((o) => {
            if (!o) return o;
            const edges = o.lineItems?.edges ?? [];

            // Handle potential variant nesting
            const variantNode = product.variants?.edges?.[0]?.node || product.variants?.[0];
            const price = variantNode?.contextualPricing?.price?.amount || variantNode?.price || "0.00";
            const itemCurrency = variantNode?.contextualPricing?.price?.currencyCode || currencyCode;
            const productId = product.id;
            const variantId = variantNode?.id ?? null;

            const existingIndex = edges.findIndex((e) => e.added === true && String(e.product_id) === String(productId));

            if (existingIndex !== -1) {
                return {
                    ...o,
                    lineItems: {
                        ...o.lineItems,
                        edges: edges.filter((_, i) => i !== existingIndex)
                    }
                };
            }

            const newItem = {
                node: {
                    id: null,
                    name: product.title,
                    image: product.featuredImage ?? null,
                    currentQuantity: 1,
                    quantity: 1,
                    originalUnitPriceSet: {
                        shopMoney: { amount: String(price), currencyCode: itemCurrency }
                    }
                },
                variant_id: variantId,
                product_id: productId,
                title: product.title,
                price: String(price),
                currency: itemCurrency,
                image: product.featuredImage?.url ?? null,
                currentQuantity: 1,
                vendor: product.vendor ?? null,
                properties: [],
                added: true,
            };

            return {
                ...o,
                lineItems: { ...o.lineItems, edges: [...edges, newItem] }
            };
        });
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
                    {console.log(shopify.settings.value, "tttrttr")}
                    {edit_address == null || edit_address == true &&
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
                                                Save changes
                                            </s-button>
                                        )}
                                    </s-stack>
                                </s-grid>
                            )}
                        </s-box>
                    }
                    <s-divider />
                    {edit_phone == null || edit_phone == true &&
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
                                                Save changes
                                            </s-button>
                                        )}
                                    </s-stack>
                                </s-grid>
                            )}
                        </s-box>
                    }
                    <s-divider />
                    {apply_discount == null || apply_discount == true &&
                        <s-box padding="base">
                            <s-clickable inlineSize="100%" onClick={() => setOpenDiscountBox(!openDiscountBox)}>
                                <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                                    <s-box padding="large none">
                                        <s-stack direction="inline" alignItems="center" gap="base">
                                            <s-icon type="order" />
                                            <s-heading>Apply discount code</s-heading>
                                        </s-stack>
                                    </s-box>
                                    {openDiscountBox ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
                                </s-stack>
                            </s-clickable>

                            {openDiscountBox && (
                                <s-stack direction="inline" gap="base">
                                    <s-text-field
                                        label="Discount code"
                                        value={discountCode}
                                        onChange={(val) => setDiscountCode(val.target.value)}
                                    />
                                    <s-button onClick={applyDiscount} loading={applyDiscountLoading}>
                                        Apply
                                    </s-button>
                                </s-stack>
                            )}
                        </s-box>
                    }
                    <s-divider />
                    {/* DOWNLOAD INVOICE SECTION */}
                    {download_invoice == null || download_invoice == true &&
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
                    }
                    <s-divider />
                    {/* DELIVERY INSTRUCTIONS SECTION */}
                    {delivery_instructions == null || delivery_instructions == true &&
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
                    }
                    <s-divider />
                    {edit_order_lines == null || edit_order_lines == true &&
                        <s-box padding="base">
                            <s-clickable inlineSize="100%" onClick={() => setOpenEditLines(!openEditLines)}>
                                <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                                    <s-box padding="large none">
                                        <s-stack direction="inline" alignItems="center" gap="base">
                                            <s-icon type="order" />
                                            <s-heading>Order Line Items</s-heading>
                                        </s-stack>
                                    </s-box>
                                    {openEditLines ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
                                </s-stack>
                            </s-clickable>

                            {openEditLines && (
                                <s-grid gap="base">
                                    {(fullOrder?.lineItems?.edges ?? []).map((item, index) => (
                                        <s-stack gap="base" inlineSize="100%" key={item.node?.id || index}>
                                            <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base" inlineSize="100%">
                                                <s-stack direction="inline" gap="base" alignItems="center" inlineSize="65%">
                                                    <s-stack blockSize="70px" inlineSize="70px">
                                                        <s-image src={item?.node?.image?.url ?? "https://cdn.shopify.com/shopifycloud/customer-account-web/production/assets/placeholder-image.DbJ5S1V8.svg"} alt={item.node?.image?.altText} borderRadius="large-100" border="base" />
                                                    </s-stack>
                                                    <s-stack gap="small-500">
                                                        <s-text type="generic" color="base">{item?.node?.name}</s-text>
                                                        <s-text>Price: {formatPrice(
                                                            item?.node?.originalUnitPriceSet?.presentmentMoney?.amount || item?.node?.originalUnitPriceSet?.shopMoney?.amount,
                                                            item?.node?.originalUnitPriceSet?.presentmentMoney?.currencyCode || item?.node?.originalUnitPriceSet?.shopMoney?.currencyCode
                                                        )}</s-text>
                                                        {item.replaced_with && (
                                                            <s-text color="info" size="small">Replaced with: {item.replaced_with.title}</s-text>
                                                        )}
                                                        {item.remove && (
                                                            <s-text color="critical" size="small">Marked for removal</s-text>
                                                        )}
                                                    </s-stack>
                                                </s-stack>
                                                <s-stack direction="inline" alignItems="center" gap="base" justifyContent="end" inlineSize="auto">
                                                    {!item.remove && (
                                                        <s-number-field label="Qty" controls="stepper" defaultValue={String(item.node?.currentQuantity)} step={1} min={0} max={100} onChange={(val) => updateLineQty(index, val)} />
                                                    )}
                                                    <s-stack direction="inline" alignItems="center" gap="base">
                                                        {!item.remove && (
                                                            <s-button variant="secondary" command="--show" commandFor="replacePanelModal" onClick={() => { setReplaceIndex(index); setProductSearchQuery(""); }}>
                                                                <s-icon type="reset" />
                                                            </s-button>
                                                        )}
                                                        <s-button variant="secondary" tone={item.remove ? undefined : "critical"} inlineSize="auto" onClick={() => toggleRemove(index)}>
                                                            {item.remove ? "Undo" : <s-icon type="delete" />}
                                                        </s-button>
                                                    </s-stack>
                                                </s-stack>
                                            </s-stack>
                                            <s-divider />
                                        </s-stack>
                                    ))}

                                    <s-stack direction="inline" justifyContent="end">
                                        {hasLineItemsChanges() && (
                                            <s-button variant="primary" loading={isSavingLines} onClick={() => handleOrderEdit("lines")}>Save changes</s-button>
                                        )}
                                    </s-stack>
                                </s-grid>
                            )}
                        </s-box>
                    }
                    <s-divider />
                    {add_products == null || add_products == true &&
                        <s-box padding="base">
                            <s-clickable inlineSize="100%" onClick={() => setOpenAddProduct(!openAddProduct)}>
                                <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="base" inlineSize="100%">
                                    <s-box padding="large none">
                                        <s-stack direction="inline" alignItems="center" gap="base">
                                            <s-icon type="plus" />
                                            <s-heading>Add more products</s-heading>
                                        </s-stack>
                                    </s-box>
                                    {openAddProduct ? <s-icon type="chevron-up" /> : <s-icon type="chevron-down" />}
                                </s-stack>
                            </s-clickable>

                            {openAddProduct && (
                                <s-stack gap="base" direction="block">
                                    <s-text-field
                                        label="Search products"
                                        placeholder="Search products..."
                                        value={productSearchQuery}
                                        onChange={(val) => { handleProductSearch(val.target.value); }}
                                    />

                                    {searchLoading ? (
                                        <s-stack inlineSize="100%" direction="block" alignItems="center" justifyContent="center">
                                            <s-box padding="large"><s-spinner size="small" /></s-box>
                                        </s-stack>
                                    ) : (
                                        <>
                                            {!searchLoading && visibleProducts.length === 0 && <s-text color="subdued">No products found.</s-text>}
                                            {visibleProducts.map((p, i) => {
                                                const edges = fullOrder?.lineItems?.edges ?? [];
                                                // Handle both connection and flat variants structure
                                                const variantNode = p.variants?.edges?.[0]?.node || p.variants?.[0];
                                                const variantId = variantNode?.id ?? p.id;
                                                const isAdded = edges.some((item) => item.variant_id === variantId || item.product_id === p.id);
                                                const price = variantNode?.contextualPricing?.price?.amount || variantNode?.price || "0.00";
                                                const itemCurrency = variantNode?.contextualPricing?.price?.currencyCode || currencyCode;

                                                return (
                                                    <s-grid
                                                        key={p.id ?? i}
                                                        gridTemplateColumns="auto 1fr auto"
                                                        gap="base"
                                                        alignItems="center"
                                                        padding="base"
                                                        borderWidth="base"
                                                        borderRadius="base"
                                                    >
                                                        <s-stack inlineSize="64px" blockSize="64px">
                                                            <s-image
                                                                src={p?.featuredImage?.url ?? "https://cdn.shopify.com/shopifycloud/customer-account-web/production/assets/placeholder-image.DbJ5S1V8.svg"}
                                                                alt={p?.title}
                                                                inlineSize="fill"
                                                                objectFit="contain"
                                                            />
                                                        </s-stack>
                                                        <s-stack gap="small-100" direction="block">
                                                            <s-text tone="bold">{p?.title}</s-text>
                                                            {p.vendor && <s-text type="small" color="subdued">{p.vendor}</s-text>}
                                                            <s-text>{formatPrice(price, itemCurrency)}</s-text>
                                                        </s-stack>
                                                        <s-button
                                                            variant={isAdded ? "secondary" : "primary"}
                                                            tone={isAdded ? "critical" : undefined}
                                                            onClick={() => toggleAddProduct(p)}
                                                        >
                                                            {isAdded ? "Remove" : "Add product"}
                                                        </s-button>
                                                    </s-grid>
                                                );
                                            })}
                                        </>
                                    )}

                                    {products_list.length > pageSize && (
                                        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="center">
                                            <s-button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</s-button>
                                            <s-text type="small">Page {page + 1} of {totalPages}</s-text>
                                            <s-button variant="secondary" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>›</s-button>
                                        </s-stack>
                                    )}

                                    <s-stack direction="inline" justifyContent="end">
                                        {hasLineItemsChanges() && (
                                            <s-button variant="primary" loading={isAddingProducts} onClick={() => handleOrderEdit("add")}>Save changes</s-button>
                                        )}
                                    </s-stack>
                                </s-stack>
                            )}
                        </s-box>
                    }
                    <s-divider />
                </s-box>
            </s-section>
            <s-modal id="replacePanelModal" heading="Replace Product" size="large-100">
                <s-box padding="small-100">
                    <s-text>Replace product #{(replaceIndex ?? 0) + 1}</s-text>
                </s-box>
                <s-stack gap="base" direction="block">
                    <s-text-field
                        label="Search replacement..."
                        placeholder="Search products..."
                        value={productSearchQuery}
                        onChange={(val) => { setPage(0); handleProductSearch(val.target.value); }}
                    />
                    {searchLoading ? (
                        <s-stack inlineSize="100%" direction="block" alignItems="center" justifyContent="center">
                            <s-box padding="large"><s-spinner size="large-100" /></s-box>
                        </s-stack>
                    ) : (
                        visibleProducts.map((p, i) => {
                            const edges = fullOrder?.lineItems?.edges ?? [];
                            const variantNode = p.variants?.edges?.[0]?.node || p.variants?.[0];
                            const variantId = variantNode?.id ?? p.id;
                            const isReplaced = edges[replaceIndex]?.replaced_with &&
                                String(edges[replaceIndex].replaced_with.variant_id) === String(variantId);
                            const price = variantNode?.contextualPricing?.price?.amount || variantNode?.price || "0.00";
                            const itemCurrency = variantNode?.contextualPricing?.price?.currencyCode || currencyCode;
                            return (
                                <s-grid key={p.id ?? i} gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center" padding="base" borderWidth="base" borderRadius="base">
                                    <s-stack inlineSize="64px" blockSize="64px">
                                        <s-image src={p?.featuredImage?.url ?? "https://cdn.shopify.com/shopifycloud/customer-account-web/production/assets/placeholder-image.DbJ5S1V8.svg"} alt={p?.title} inlineSize="fill" objectFit="contain" />
                                    </s-stack>
                                    <s-stack gap="small-500" direction="block">
                                        <s-text>{p?.title}</s-text>
                                        {p.vendor && <s-text type="small" color="subdued">{p.vendor}</s-text>}
                                        <s-text>{formatPrice(price, itemCurrency)}</s-text>
                                    </s-stack>
                                    <s-button variant={isReplaced ? "secondary" : "primary"} tone={isReplaced ? "critical" : undefined} onClick={() => toggleReplace(replaceIndex, p)}>
                                        {isReplaced ? "Undo replace" : "Replace with this"}
                                    </s-button>
                                </s-grid>
                            );
                        })
                    )}
                    {products_list.length > pageSize && (
                        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="center">
                            <s-button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</s-button>
                            <s-text type="small">Page {page + 1} of {totalPages}</s-text>
                            <s-button variant="secondary" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>›</s-button>
                        </s-stack>
                    )}
                    <s-stack direction="inline" justifyContent="end">
                        <s-button variant="primary" command="--hide" commandFor="replacePanelModal" slot="primary-action" onClick={() => setReplaceIndex(null)}>
                            Apply Changes
                        </s-button>
                    </s-stack>
                </s-stack>
            </s-modal>
        </s-stack>
    );
}
