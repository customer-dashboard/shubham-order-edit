import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import countries from "./countries";
import COUNTRY_STATES from "./country-states";

export default async () => {
  render(<OrderEdit />, document.body);
};

const BASEURL = "https://customer-dashboard-pro.fly.dev";
// const BASEURL = "https://ipod-cologne-steam-engineering.trycloudflare.com";


function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

console.log("shopify", shopify);

function OrderEdit() {
  const order = shopify.order;
  const sessionToken = shopify.sessionToken;
  const orderId = order?.current?.id;
  const settings = shopify.settings.value;
  console.log("settings", settings);
  const showEditShippingAddress = settings.edit_shipping_address ?? true;
  const showEditPhoneNumber = settings.edit_phone_number ?? true;
  const showLineItems = settings.show_line_items ?? true;
  const showUpdateQuantity = settings.update_quantity ?? true;
  const showReplaceButton = settings.replace_line_item ?? true;
  const showDeleteButton = settings.remove_line_item ?? true;
  const showAddProduct = settings.add_product ?? true;
  const showApplyDiscount = settings.apply_discount ?? true;
  const showDownloadInvoice = settings.download_invoice ?? true;
  const showDeliveryInst = settings.change_delivery_instruction ?? true;
  // console.log("orderId", orderId);

  // load/save states
  const [onloadSkeleton, setOnloadSkeleton] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullOrder, setFullOrder] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(
    shopify.shippingAddress.value
  );
  const [originalOrder, setOriginalOrder] = useState(null);
  const [showOrders, setShowOrders] = useState(true);

  // UI & features
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showReplacePanel, setShowReplacePanel] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [showModifyPanel, setShowModifyPanel] = useState(false);
  const [modifyIndex, setModifyIndex] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);
  const [discountCode, setDiscountCode] = useState("");
  const [applyDiscountLoading, setApplyDiscountLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [invoiceOption, setInvoiceOption] = useState(["email"]);
  const [invoiceEmail, setInvoiceEmail] = useState(null);
  const [replacements, setReplacements] = useState([]);
  const [deliveryInst, setDeliveryInst] = useState("");

  // local UI: which sections are open (replaces details/summary)
  const [openBox, setOpenBox] = useState(null);
  const [addressErrors, setAddressErrors] = useState([]);
  const [page, setPage] = useState(0); // 0-based

  const [selectedCountry, setSelectedCountry] = useState(
    shippingAddress?.countryCode ?? shippingAddress?.["country"] ?? ""
  );

  const pageSize = 4;

  const products = productSearchResults ?? [];
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const start = page * pageSize;
  const visibleProducts = products?.slice(start, start + pageSize);

  // Store original objects
  const originalFullOrderRef = useRef(null);
  const originalShippingAddressRef = useRef(null);
  const originalPhoneRef = useRef(null);
  const originalNoteRef = useRef(null);
  const baselineReadyRef = useRef(false);

  const API_VERSION = '2025-10';

  useEffect(() => {
    if (!fullOrder) return;

    // 🛑 Wait until second (final) data load
    if (!baselineReadyRef.current) {
      const edges = fullOrder?.lineItems?.edges ?? [];

      // Your case: final data has fewer items (2)
      // Adjust condition if needed
      if (edges.length > 0 && edges.length <= 5) {
        originalFullOrderRef.current = JSON.parse(JSON.stringify(fullOrder));
        baselineReadyRef.current = true;

        // console.log("✅ Baseline order locked", edges.length);
      }
    }

    // Other baselines
    if (
      shippingAddress &&
      !originalShippingAddressRef.current
    ) {
      originalShippingAddressRef.current = JSON.parse(
        JSON.stringify(shippingAddress)
      );
    }

    if (
      shippingAddress?.phone &&
      !originalPhoneRef.current
    ) {
      originalPhoneRef.current = shippingAddress.phone;
    }

    if (
      deliveryInst &&
      !originalNoteRef.current
    ) {
      originalNoteRef.current = deliveryInst;
    }
  }, [fullOrder, shippingAddress, deliveryInst]);


  // Check if shipping address has changes
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
      (orig.provinceCode ?? orig?.["province"] ?? "") !==
      (current.provinceCode ?? current?.["province"] ?? "") ||
      (orig.zip ?? "") !== (current.zip ?? "") ||
      (orig.countryCode ?? orig?.["country"] ?? "") !==
      (current.countryCode ?? current?.["country"] ?? "") ||
      (orig.phone ?? "") !== (current.phone ?? "")
    );
  };

  // Check if phone has changes
  const hasPhoneChanges = () => {
    if (!originalPhoneRef.current || !shippingAddress?.phone) return false;
    return originalPhoneRef.current !== shippingAddress.phone;
  };

  const hasdeliveryInstChanges = () => {
    if (!originalNoteRef.current || !deliveryInst) return false;
    return originalNoteRef.current !== deliveryInst;
  };
  // Check if line items have changes
  const hasLineItemsChanges = () => {
    if (
      !baselineReadyRef.current ||
      !originalFullOrderRef.current ||
      !fullOrder
    ) {
      return false;
    }

    const origEdges =
      originalFullOrderRef.current.lineItems?.edges ?? [];
    const newEdges =
      fullOrder.lineItems?.edges ?? [];

    // Added
    const hasAdded = newEdges.some(
      (edge) => edge.added || !edge?.node?.id
    );

    // Removed
    const hasRemoved = origEdges.some((origEdge) => {
      const origId = origEdge?.node?.id;
      if (!origId) return false;

      const newEdge = newEdges.find(
        (edge) =>
          edge?.node?.id &&
          String(edge.node.id) === String(origId)
      );

      return !newEdge || newEdge.remove;
    });

    // Quantity change
    const hasQuantityChanged = origEdges.some((origEdge) => {
      const origId = origEdge?.node?.id;
      if (!origId) return false;

      const newEdge = newEdges.find(
        (edge) =>
          edge?.node?.id &&
          String(edge.node.id) === String(origId)
      );

      return (
        newEdge &&
        Number(origEdge.node.quantity) !==
          Number(newEdge.node.quantity)
      );
    });

    // Replace
    const hasReplaced = newEdges.some(
      (edge) => edge.replaced_with
    );

    return (
      hasAdded ||
      hasRemoved ||
      hasQuantityChanged ||
      hasReplaced
    );
  };


  const storeId = shopify.shop.id.replace("gid://shopify/Shop/", "");
  const orderNumericId = orderId.replace("gid://shopify/Order/", "");

  // const finalUrl = `https://shopify.com/${storeId}/account/orders/${orderNumericId}`;

  // navigation.navigate(`extension://orders/${orderNumericId}`);

  // Example normalizer – call this before setProducts / setProductSearchResults
  const normalizeProducts = (raw) => {
    return raw.map((item) => {
      // If it's in { cursor, node } format, take node; else assume it's already product
      const product = item.node ?? item;

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        featuredImage: product.featuredImage ?? null,
        variants: product.variants,
        // optionally keep first variant shortcut
        firstVariantId: product.variants?.edges?.[0]?.node?.id,
        firstVariantPrice: product.variants?.edges?.[0]?.node?.price,
      };
    });
  };

  const getOrderQuery = {
    query: `
      query OrderDetails($id: ID!) {
        order(id: $id) {
          id
          name
          createdAt
          currencyCode
          lineItems(first: 50) {
            edges {
              node {
                id
                name
                image {
                  altText
                  url
                }
                productId
                title
                quantity
                currentTotalPrice{
                amount
                currencyCode
                }
              }
            }
          }
        }
      }
    `,
    variables: {
      id: orderId, // 👈 pass order GID here
    },
  };


  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setOnloadSkeleton(true);
      try {
        const response = await fetch(
          `shopify://customer-account/api/${API_VERSION}/graphql.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(getOrderQuery),
          }
        );

        const json = await response.json();

        console.log('fullOrder ::', json);

        const order = json?.data?.order;
                setFullOrder(order ? deepClone(order) : null);
                setOriginalOrder(order ? deepClone(order) : null);
        if (!order) return;

      } catch (error) {
        console.error('Order fetch error:', error);
      }finally {
        setLoading(false);
        setOnloadSkeleton(false);
      }
    };

    fetchOrder();
  }, []);

  useEffect(() => {
    // if (!orderId) return;
    setShowOrders(true);
    async function loadOrder() {
      try {
        const token = await sessionToken.get();
        const res = await fetch(`${BASEURL}/api/order-status`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ Target: "GET_ORDER_DETAILS", id: orderId }),
        });
        const data = await res.json();
        let fetched = data?.data ?? data?.order ?? null;

        if (fetched?.lineItems?.edges) {
          fetched = {
            ...fetched,
            lineItems: {
              ...fetched.lineItems,
              edges: fetched.lineItems.edges.filter(
                (edge) => edge?.node?.currentQuantity > 0
              ),
            },
          };
        }

        setFullOrder(fetched ? deepClone(fetched) : null);
        setOriginalOrder(fetched ? deepClone(fetched) : null);
        setShowOrders(false);
        // Set initial shipping address if available
        if (fetched?.shippingAddress) {
          setShippingAddress(fetched.shippingAddress);
        }

        // initial shipping method
        if (
          fetched &&
          fetched.lineItems &&
          fetched.lineItems?.edges?.length > 0
        ) {
          setSelectedShippingMethod(fetched.lineItems.edges[0]);
        }

        // fetch shipping methods
        try {
          const shipRes = await fetch(`${BASEURL}/api/shipping-methods`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ Target: "GET_SHIPPING_METHODS", orderId }),
          });
          const shipData = await shipRes.json();
          setShippingMethods(shipData?.methods ?? []);
        } catch (e) {
          setShippingMethods([]);
        }

        // fetch order note
        try {
          const res = await fetch(`${BASEURL}/api/order/fetch_note`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Target: "FETCH_DELIVERY_INSTRUCTIONS",
              UpdatedData: { orderId },
            }),
          });
          const { note } = await res.json();
          setDeliveryInst(note);
        } catch (e) {
          setDeliveryInst("");
        }

        // fetch produccts
        try {
          const res = await fetch(`${BASEURL}/api/get-products`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Target: "FETCH_PRODUCTS",
            }),
          });
          const { products } = await res.json();
          setProductSearchResults(normalizeProducts(products));
        } catch (e) {
          setProductSearchResults([]);
        }
      } catch (err) {
        console.error("loadOrder err", err);
        shopify.toast.show("Error: Unable to load.");
      }
    }
    loadOrder();
  }, [orderId, sessionToken]);



  // Update Shipping Address
  const handleSaveAddress = async () => {
    const variables = {
      orderId: fullOrder.id,
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
      setAddressErrors([]); // reset errors at start

      const token = await sessionToken.get();

      const res = await fetch(`${BASEURL}/api/order/update_address`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Target: "UPDATE_ADDRESS",
          UpdatedData: variables,
        }),
      });

      const json = await res.json();

      // ❌ If API returned an error — extract and store field errors
      if (json.status !== 200) {
        let extractedErrors = [];

        try {
          // Extract the array part:  Order update failed: [ {...} ]
          const match = json.data.error.match(/\[(.*)\]/);
          if (match) {
            extractedErrors = JSON.parse(match[0]);
          }
        } catch (err) {
          console.error("Failed to parse Shopify errors", err);
        }

        setAddressErrors(extractedErrors);
        return; // stop here — do not update shippingAddress
      }

      // ✅ Success
      setAddressErrors([]);
      const updatedAddress = json.data;
      setShippingAddress(updatedAddress);
      // Update original reference after successful save
      originalShippingAddressRef.current = JSON.parse(
        JSON.stringify(updatedAddress)
      );
      shopify.toast.show("Address updated successfully.");
      navigation.navigate(
        `https://shopify.com/${storeId}/account/orders/${orderNumericId}`
      );
    } catch (e) {
      console.error("UPDATE_ADDRESS err", e);
      setAddressErrors([{ field: ["unknown"], message: "Unexpected error" }]);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Update Customer Phone
  const handleSavePhone = async () => {
    const variables = {
      orderId: fullOrder.id,
      address: {
        phone: shippingAddress.phone,
      },
    };

    try {
      setIsSaving(true);
      const token = await sessionToken.get();

      const res = await fetch(`${BASEURL}/api/order/update_phone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Target: "UPDATE_PHONE",
          UpdatedData: variables,
        }),
      });

      const json = await res.json();
      const updatedPhone = json.data.phone;
      setShippingAddress((prev) => ({ ...prev, phone: updatedPhone }));
      // Update original reference after successful save
      originalPhoneRef.current = updatedPhone;
      shopify.toast.show("Phone changes successfully.");
      navigation.navigate(
        `https://shopify.com/${storeId}/account/orders/${orderNumericId}`
      );
    } catch (e) {
      console.error("UPDATE_PHONE err", e);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Update Del instruction
  const updateDeliveryInst = async () => {
    const variables = {
      orderId: fullOrder.id,
      deliveryInstructions: deliveryInst,
    };

    try {
      setIsSaving(true);
      const token = await sessionToken.get();

      const res = await fetch(`${BASEURL}/api/order/delivery_instruction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Target: "UPDATE_DELIVERY_INSTRUCTIONS",
          UpdatedData: variables,
        }),
      });

      const json = await res.json();
      const updatedNote = json.data.note;
      setDeliveryInst(updatedNote);
      // Update original reference after successful save
      originalNoteRef.current = updatedNote;
      shopify.toast.show("Delivery instructions saved successfully.");
    } catch (e) {
      console.error("UPDATE_DELIVERY_INSTRUCTIONS err", e);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setIsSaving(false);
      // navigation.navigate(`https://shopify.com/${storeId}/account/orders/${orderNumericId}`);
    }
  };

  // ====== helpers ======

  const updateShippingField = (field, event) => {
    const value = event.target?.value ?? event;
    setShippingAddress((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      return updated;
    });
  };

  const updateDiscount = (event) => {
    setDiscountCode(event.target.value);
  };

  const updateInvoiceEmail = (event) => {
    setInvoiceEmail(event.target.value);
  };

  const updateDelIns = (event) => {
    setDeliveryInst(event.target.value);
  };

  const updateInvoice = (event) => {
    const newValuesArray = event?.target?.values;

    // Check if we successfully extracted the array
    if (Array.isArray(newValuesArray) && newValuesArray.length > 0) {
      setInvoiceOption(newValuesArray);

      // Extract the single value for other logic
      const selectedValue = newValuesArray[0];
    } else {
      console.error(
        "Failed to extract a valid array from event object. Check the event object structure in the console."
      );
    }
  };

  const updateLineQty = (index, value) => {
    const qty = Number(value.target.value);
    setFullOrder((o) => {
      const edges = o?.lineItems?.edges ?? [];

      const updatedEdges = edges.map((edge, i) =>
        i === index ? { ...edge, node: { ...edge.node, quantity: qty } } : edge
      );

      return {
        ...o,
        lineItems: {
          ...o.lineItems,
          edges: updatedEdges,
        },
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
        const originalQty =
          edge.originalQuantity ??
          edge.node?.quantity ??
          edge.node?.currentQuantity ??
          1;

        // 🔁 UNDO REMOVE → delete `remove`
        if (alreadyRemoved) {
          const { remove, originalQuantity, ...restEdge } = edge;

          return {
            ...restEdge,
            node: {
              ...edge.node,
              quantity: originalQty,
            },
          };
        }

        // ❌ REMOVE → add remove: true
        return {
          ...edge,
          remove: true,
          originalQuantity: originalQty,
          node: {
            ...edge.node,
            quantity: 0,
          },
        };
      });

      return {
        ...o,
        lineItems: {
          ...o.lineItems,
          edges: updatedEdges,
        },
      };
    });
  };


  // ====== Product search (backend) ======
  const searchProducts = async (query, limit = 20) => {
    setProductSearchQuery(query);
    // if (!query || query?.length < 2) {
    //   setProductSearchResults([]);
    //   return;
    // }
    try {
      setSearchLoading(true);
      const token = await sessionToken.get();

      const res = await fetch(`${BASEURL}/api/products/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Target: "Product_Search",
          q: query, // product search term
          limit: 10,
        }),
      });

      const json = await res.json();

      setProductSearchResults(json.data || []);
      setSearchLoading(false);
    } catch (e) {
      console.error("searchProducts err", e);
      setProductSearchResults([]);
    }
  };

  // Replace flow
  const openReplacePanel = (index) => {
    setReplaceIndex(index);
    setShowReplacePanel(true);
    setProductSearchQuery("");
  };

  // Modify product options
  const openModifyPanel = (index) => {
    setModifyIndex(index);
    setShowModifyPanel(true);
  };

  const applyModify = (index, fields) => {
    setFullOrder((o) => {
      const items = (o?.lineItems ?? []).map((it, i) =>
        i === index ? { ...it, ...fields } : it
      );
      return { ...o, line_items: items };
    });
    setShowModifyPanel(false);
    setModifyIndex(null);
  };

  // Discount (backend)
  const applyDiscount = async () => {
    if (!discountCode) return;

    setApplyDiscountLoading(true);

    try {
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/discount/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, code: discountCode }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.log("json", json);

          // const rawErr = json?.data?.error || "Unable to apply discount";
          const rawErr = "Discount already applied.";

        shopify.toast.show(rawErr);
        return;
      }

      // ✔️ Success
      setFullOrder((o) => ({
        ...o,
        applied_discount_code: discountCode,
        ...(json?.updated ?? {}),
      }));

      shopify.toast.show("Discount applied!");
      navigation.navigate(
        `https://shopify.com/${storeId}/account/orders/${orderNumericId}`
      );
    } catch (e) {
      console.error("applyDiscount err", e);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setApplyDiscountLoading(false);
    }
  };

  // Cancellation request
  const requestCancellation = async () => {
    if (!cancelReason) return;
    setCancelLoading(true);
    try {
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/cancel_request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          reason: cancelReason,
          note: cancelNote,
        }),
      });
      const json = await res.json();
      setFullOrder((o) => ({
        ...o,
        cancellation_requested: true,
        cancellation_request_details: {
          reason: cancelReason,
          note: cancelNote,
        },
      }));
      shopify.toast.show("Order cancel successfully.");
      navigation.navigate(
        `https://shopify.com/${storeId}/account/orders/${orderNumericId}`
      );
    } catch (e) {
      console.error("requestCancellation err", e);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setCancelLoading(false);
    }
  };

  // Invoice
  const handleInvoice = async () => {
    setIsSaving(true);
    try {
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/invoice`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          option: invoiceOption,
          email: invoiceOption.includes("email")
            ? invoiceEmail || fullOrder?.customer?.email
            : undefined,
        }),
      });
      const json = await res.json();
      if (json?.download_url) {
        // allow the client to open the download
        try {
          window.open(json.download_url, "_blank");
        } catch (e) {
          console.warn("Cannot open new tab from extension environment", e);
        }
      } else if (json?.message) {
        setFullOrder((o) => ({ ...o, last_invoice_action: json.message }));
      }
    } catch (e) {
      console.error("handleInvoice err", e);
      shopify.toast.show("Error: Unable to download");
    } finally {
      setIsSaving(false);
      // shopify.toast.show("Download");
    }
  };

  // Handle order edit - update line items (quantity, replace, remove, add)
  const handleOrderEdit = async () => {
    if (!fullOrder || !originalOrder) return;
    setIsSaving(true);
    try {
      const origEdges = originalOrder.lineItems?.edges ?? [];
      const newEdges = fullOrder.lineItems?.edges ?? [];

      const changed_line_items = [];
      const added_line_items = [];
      const removed_line_items = [];
      const replacement_items = [];

      // Create a map of original items by ID for quick lookup
      const origById = {};
      origEdges.forEach((edge) => {
        const itemId = edge?.node?.id;
        if (itemId) {
          origById[String(itemId)] = edge;
        }
      });

      // Process new/updated items
      newEdges.forEach((edge, index) => {
        const node = edge?.node ?? {};
        const itemId = node?.id;

        // Check if item was added (no ID or has added flag)
        if (!itemId || edge.added) {
          const newItem = {
            variant_id: edge.variant_id ?? node.variant?.id ?? null,
            product_id: edge.product_id ?? node.product?.id ?? null,
            quantity: node.quantity ?? edge.quantity ?? 1,
            price:
              node.originalUnitPriceSet?.shopMoney?.amount ??
              edge.price ??
              "0.00",
            title: node.name ?? edge.title ?? edge.name ?? "",
            properties: node.properties ?? edge.properties ?? [],
          };
          added_line_items.push(newItem);
          return;
        }

        // Find original item
        const origEdge = origById[String(itemId)];
        if (!origEdge) {
          // Item exists in new but not in original (shouldn't happen, but handle it)
          return;
        }

        const origNode = origEdge?.node ?? {};
        const origQty = origNode?.quantity ?? 0;
        const newQty = node?.quantity ?? 0;

        // Check for replacements
        if (edge.replaced_with) {
          replacement_items.push({
            old_line_item_id: itemId,
            new_item: {
              title: edge.replaced_with.title ?? "",
              variant_id: edge.replaced_with.variant_id ?? null,
              product_id: edge.replaced_with.product_id ?? null,
              price: edge.replaced_with.price ?? "0.00",
              quantity: newQty > 0 ? newQty : origQty,
            },
          });
          return;
        }

        // Check for removals
        if (edge.remove) {
          removed_line_items.push({ id: itemId });
          return;
        }

        // Check for quantity changes
        if (Number(origQty) !== Number(newQty)) {
          changed_line_items.push({
            id: itemId,
            quantity: Number(newQty),
          });
        }
      });

      // Check for items that were removed (exist in original but not in new)
      origEdges.forEach((origEdge) => {
        const origId = origEdge?.node?.id;
        if (!origId) return;

        const stillExists = newEdges.some(
          (edge) => edge?.node?.id && String(edge.node.id) === String(origId)
        );

        if (!stillExists) {
          removed_line_items.push({ id: origId });
        }
      });

      // Build update payload
      const updated = {};

      if (changed_line_items.length > 0) {
        updated.changed_line_items = changed_line_items;
      }
      if (added_line_items.length > 0) {
        updated.added_line_items = added_line_items;
      }
      if (removed_line_items.length > 0) {
        updated.removed_line_items = removed_line_items;
      }
      if (replacement_items.length > 0) {
        updated.replacements = replacement_items;
      }

      // If no changes, return early
      if (Object.keys(updated).length === 0) {
        setIsSaving(false);
        return;
      }

      // Send API request
      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          Target: "UPDATE_ORDER",
          id: orderId,
          updated,
        }),
      });

      const json = await res.json();

      // Update state with response
      if (json?.data) {
        const updatedOrder = json.data;
        setFullOrder(updatedOrder);
        setOriginalOrder(deepClone(updatedOrder));
        originalFullOrderRef.current = JSON.parse(JSON.stringify(updatedOrder));
      } else if (json?.updatedOrder) {
        const updatedOrder = json.updatedOrder;
        setFullOrder(updatedOrder);
        setOriginalOrder(deepClone(updatedOrder));
        originalFullOrderRef.current = JSON.parse(JSON.stringify(updatedOrder));
      } else {
        // If no response data, just sync originalOrder with current fullOrder
        const syncedOrder = deepClone(fullOrder);
        setOriginalOrder(syncedOrder);
        originalFullOrderRef.current = JSON.parse(JSON.stringify(syncedOrder));
      }
      shopify.toast.show("Order updated successfully.");
      navigation.navigate(
        `https://shopify.com/${storeId}/account/orders/${orderNumericId}`
      );
    } catch (e) {
      console.error("handleOrderEdit err", e);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add product - save added products to order
  const handleAddProduct = async () => {
    // Adding products is also a line item operation, so use the same handler
    await handleOrderEdit();
  };
  // Save changes (diff compute & POST)
  const saveChanges = async () => {
    if (!fullOrder || !originalOrder) return;
    setSaving(true);
    try {
      const updated = {};
      const origShip = originalOrder.shipping_address ?? {};
      const newShip = shippingAddress ?? {};
      if (JSON.stringify(origShip) !== JSON.stringify(newShip)) {
        updated.shipping_address = newShip;
      }
      if ((originalOrder.phone ?? "") !== (fullOrder?.phone ?? "")) {
        updated.phone = fullOrder?.phone;
      }
      if (
        (originalOrder.applied_discount_code ?? "") !==
        (fullOrder?.applied_discount_code ?? "")
      ) {
        updated.applied_discount_code =
          fullOrder?.applied_discount_code ?? null;
      }
      if (selectedShippingMethod) {
        const origShipLine = (originalOrder.shipping_lines ?? [])[0];
        if (
          !origShipLine ||
          origShipLine.title !== selectedShippingMethod.title
        ) {
          updated.shipping_method = selectedShippingMethod;
        }
      }

      const origItems = originalOrder.lineItems ?? [];
      const newItems = fullOrder?.lineItems ?? [];
      const changed_line_items = [];
      const added_line_items = [];
      const removed_line_items = [];

      const origById = {};
      origItems.forEach((it) => {
        if (it.id != null) origById[String(it.id)] = it;
      });

      newItems.forEach((it) => {
        if (!it.id || it.added) {
          added_line_items.push(it);
          return;
        }
        const orig = origById[String(it.id)];
        if (!orig) {
          changed_line_items.push(it);
          return;
        }
        const qtyChanged = Number(orig.quantity) !== Number(it.quantity);
        const removeFlag = !!it.remove;
        const variantChanged =
          (orig.variant_id ?? null) !== (it.variant_id ?? null);
        const titleChanged = (orig.title ?? "") !== (it.title ?? "");
        if (qtyChanged || removeFlag || variantChanged || titleChanged) {
          changed_line_items.push({
            id: it.id,
            quantity: it.quantity,
            remove: it.remove ? true : false,
            variant_id: it.variant_id,
            title: it.title,
            properties: it.properties,
            replaced_with: it.replaced_with ?? undefined,
          });
        }
      });

      origItems.forEach((orig) => {
        const still = newItems.find(
          (n) => n.id && String(n.id) === String(orig.id)
        );
        if (!still) {
          removed_line_items.push({ id: orig.id });
        }
      });

      if (changed_line_items?.length)
        updated.changed_line_items = changed_line_items;
      if (added_line_items?.length) updated.added_line_items = added_line_items;
      if (removed_line_items?.length)
        updated.removed_line_items = removed_line_items;
      if (replacements?.length) updated.replacements = replacements;

      if (Object.keys(updated)?.length === 0) {
        setSaving(false);
        return;
      }

      const token = await sessionToken.get();
      const res = await fetch(`${BASEURL}/api/order/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Target: "UPDATE_ORDER", id: orderId, updated }),
      });
      const json = await res.json();

      if (json?.data) {
        setFullOrder(json.data);
        setOriginalOrder(deepClone(json.data));
      } else if (json?.updatedOrder) {
        setFullOrder(json.updatedOrder);
        setOriginalOrder(deepClone(json.updatedOrder));
      } else {
        setOriginalOrder(deepClone(fullOrder));
      }
      shopify.toast.show("Changes saved successfully.");
      navigation.navigate(
        `https://shopify.com/${storeId}/account/orders/${orderNumericId}`
      );
    } catch (e) {
      console.error("saveChanges err", e);
      shopify.toast.show("Error: Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  console.log("fullorder", fullOrder);
  // console.log("originalOrder", originalOrder);

  function handleProductSearchChange(event) {
    const value = event.target.value;

    setProductSearchQuery(value);
    searchProducts(value, 5).catch(() => { });
  }

  const getCountryCode = (value) => {
    // If it is already a 2-letter code → return directly
    if (typeof value === "string" && value.length === 2) {
      return value;
    }

    // Find country code by matching the country name
    const found = countries.find(
      (c) => c.name.toLowerCase() === value?.toLowerCase()
    );

    return found ? found.code : "";
  };

  const validatePhone = (phone, countryCode) => {
    if (!phone) return "Phone number is required.";

    const cleaned = phone.replace(/[^\d+]/g, "");

    if (!cleaned.startsWith("+")) {
      return "Phone number must start with country code (e.g. +1).";
    }

    // Extract digits only
    const digits = cleaned.replace(/\D/g, "");

    // Country → dial code
    const dialCodes = {
      IN: "91",
      US: "1",
      CA: "1",
      GB: "44",
      AU: "61",
    };

    // Country → expected local number length
    const rules = {
      IN: 10,
      US: 10,
      CA: 10,
      GB: 10,
      AU: 9,
    };

    const dial = dialCodes[countryCode];
    const expectedLength = rules[countryCode];

    if (dial && expectedLength) {
      if (!digits.startsWith(dial)) {
        return `Phone number must begin with +${dial} for ${countryCode}.`;
      }

      const localLength = digits.length - dial.length;

      if (localLength !== expectedLength) {
        return `Phone number must contain ${expectedLength} digits for your country.`;
      }
    }

    if (/[^0-9+]/.test(phone)) {
      return "Phone number cannot contain special characters.";
    }

    return "";
  };

  const VariantSelector = ({
    lineItemId,
    variants,
    selectedId,
    onChangeVariant,
  }) => {
    return (
      <s-select
        label="Select variant"
        value={selectedId}
        onChange={(e) => {
          const variantId = e.target.value;
          const selectedVariant = variants.find(
            (v) => v.node.id === variantId
          )?.node;

          if (selectedVariant) {
            onChangeVariant(lineItemId, selectedVariant);
          }
        }}
      >
        {variants.map((v) => (
          <s-option key={v.node.id} value={v.node.id}>
            {v.node.title} — {v.node.price}
          </s-option>
        ))}
      </s-select>
    );
  };

  const getSelectedVariantId = (item, variantsMap) => {
    const id =
      item?.replaced_with?.variant_id ??
      item?.node?.variant?.id ??
      variantsMap?.[item.node.id]?.[0]?.node?.id ??
      null;

    return id;
  };

  const handleVariantChange = (lineItemId, variant) => {
    // console.log("lineItemId", lineItemId);
    // console.log("variant", variant);
    setFullOrder((prev) => {
      if (!prev?.lineItems?.edges) return prev;

      const updated = deepClone(prev);

      const edge = updated.lineItems.edges.find(
        (e) => e?.node?.id === lineItemId
      );

      if (!edge) return prev; // safety

      // Mark replacement
      edge.replaced_with = {
        title: variant.title,
        variant_id: variant.id,
        product_id: variant.product?.id,
        price: variant.price,
      };

      // Update display
      edge.node.name = `${edge.node.product.title} – ${variant.title}`;
      if (edge.node.originalUnitPriceSet?.shopMoney) {
        edge.node.originalUnitPriceSet.shopMoney.amount = variant.price;
      }

      // Update image (if variant has an image)
      if (variant.image?.url) {
        edge.node.image = {
          url: variant.image.url,
          altText: variant.image.altText ?? "",
        };
      }

      return updated;
    });
  };

  const toggleAddProduct = (product) => {
    setFullOrder((o) => {
      if (!o) return o;

      const edges = o.lineItems?.edges ?? [];

      const variantNode = product.variants?.edges?.[0]?.node;
      const price = variantNode?.price ?? product.variant_price ?? "0.00";
      const productId = product.id;
      const variantId = variantNode?.id ?? null;

      // 🔍 Check if already added
      const existingIndex = edges.findIndex(
        (e) =>
          e.added === true &&
          String(e.product_id) === String(productId)
      );

      // ❌ REMOVE (DESELECT)
      if (existingIndex !== -1) {
        return {
          ...o,
          lineItems: {
            ...o.lineItems,
            edges: edges.filter((_, i) => i !== existingIndex),
          },
        };
      }

      // ➕ ADD
      const newItem = {
        node: {
          id: null,
          name: product.title ?? product.name,
          image: product.featuredImage ?? null,
          currentQuantity: 1,
          quantity: 1,
          originalUnitPriceSet: {
            shopMoney: {
              amount: String(price),
              currencyCode: o.currencyCode ?? "INR",
            },
          },
        },
        variant_id: variantId,
        product_id: productId,
        title: product.title ?? product.name,
        price: String(price),
        image: product.featuredImage?.url ?? null,
        currentQuantity: 1,
        vendor: product.vendor ?? null,
        properties: [],
        added: true, // 🔑 marker
      };

      return {
        ...o,
        lineItems: {
          ...o.lineItems,
          edges: [...edges, newItem],
        },
      };
    });
  };

  const toggleReplace = (index, newProduct) => {
    const variantNode = newProduct?.variants?.edges?.[0]?.node;
    if (!variantNode) return;

    const price = variantNode.price ?? newProduct.variant_price ?? "0.00";
    const newVariantId = variantNode.id;

    setFullOrder((prev) => {
      if (!prev) return prev;

      const edges = prev.lineItems?.edges ?? [];

      const updatedEdges = edges.map((edge, i) => {
        if (i !== index) return edge;

        const alreadyReplaced =
          edge.replaced_with &&
          String(edge.replaced_with.variant_id) ===
            String(newVariantId);

        // 🔁 UNDO replace
        if (alreadyReplaced) {
          const { replaced_with, title, ...rest } = edge;
          return rest;
        }

        // 🔄 REPLACE (overwrite previous)
        return {
          ...edge,
          replaced_with: {
            title: newProduct.title ?? newProduct.name,
            variant_id: newVariantId,
            product_id: newProduct.id ?? null,
            price: String(price),
          },
        };
      });

      return {
        ...prev,
        lineItems: {
          ...prev.lineItems,
          edges: updatedEdges,
        },
      };
    });

    // 🔁 Replace entry in replacements array
    setReplacements((r) => {
      const filtered = r.filter((item) => item.index !== index);

      // If undo, don't add again
      const alreadyReplaced =
        fullOrder?.lineItems?.edges?.[index]?.replaced_with &&
        String(
          fullOrder.lineItems.edges[index].replaced_with.variant_id
        ) === String(newVariantId);

      if (alreadyReplaced) return filtered;

      return [
        ...filtered,
        {
          index,
          old_line_item_id:
            fullOrder?.lineItems?.edges?.[index]?.node?.id ??
            null,
          new_item: {
            title: newProduct.title ?? newProduct.name,
            variant_id: newVariantId,
            product_id: newProduct.id ?? null,
            price: String(price),
          },
        },
      ];
    });
  };


    // Handle order edit - update line items (quantity, replace, remove, add)
    const getAllDiscount = async () => {
      try {
        // Send API request
        const token = await sessionToken.get();
        const res = await fetch(`${BASEURL}/api/get-all-discounts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            Target: "GET_DISCOUNTS",
            id: orderId,
          }),
        });

        const json = await res.json();

          const updatedOrder = json.data;
console.log("All Discounts", updatedOrder);
      } catch (e) {
        console.error("Discount err", e);
      }
    };

  return onloadSkeleton ? (
    <s-section>
      <s-stack direction="inline" gap="base" inlineSize="100%">
        <s-stack gap="base" inlineSize="20%">
          <s-skeleton-paragraph></s-skeleton-paragraph>
        </s-stack>

        <s-divider></s-divider>

        <s-stack gap="base" inlineSize="40%">
          <s-box padding="base">
            <s-skeleton-paragraph></s-skeleton-paragraph>
          </s-box>
        </s-stack>

        <s-divider></s-divider>

        <s-stack gap="base" inlineSize="40%">
          <s-box padding="base">
            <s-skeleton-paragraph></s-skeleton-paragraph>
          </s-box>
        </s-stack>

        <s-divider></s-divider>

        <s-stack gap="base" inlineSize="40%">
          <s-box padding="base">
            <s-skeleton-paragraph></s-skeleton-paragraph>
          </s-box>
        </s-stack>
      </s-stack>
    </s-section>
  ) : (
    <s-section heading="Edit the order">
      <s-box padding="base">
        <s-divider></s-divider>
                  {/* <s-button
                    variant="primary"
                    loading={isSaving}
                    onClick={() => getAllDiscount()}
                  >
                    Get discounts
                  </s-button> */}
        {/* Shipping Address */}
        {showEditShippingAddress && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() =>
              setOpenBox(openBox === "shipping" ? null : "shipping")
            }
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="truck" />
                  <s-heading>Edit shipping address</s-heading>
                </s-stack>
              </s-box>
              {openBox === "shipping" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "shipping" && (
            <s-grid gap="base">
              {/* <s-select
                label="Country"
                value={getCountryCode(
                  shippingAddress?.countryCode ?? shippingAddress?.["country"]
                )}
                onChange={(val) => {
                  updateShippingField("countryCode", val);
                }}
              >
                {countries.map((c) => (
                  <s-option key={c.code} value={c.code}>
                    {c.name}
                  </s-option>
                ))}
              </s-select> */}
              <s-select
                label="Country"
                value={getCountryCode(
                  shippingAddress?.countryCode ?? shippingAddress?.["country"]
                )}
                onChange={(val) => {
                  updateShippingField("countryCode", val);
                  setSelectedCountry(val.target.value); // <-- NEW
                }}
              >
                {countries.map((c) => (
                  <s-option key={c.code} value={c.code}>
                    {c.name}
                  </s-option>
                ))}
              </s-select>

              {/* Phone */}
              <s-phone-field
                label="Phone"
                value={shippingAddress?.phone ?? ""}
                error={
                  validatePhone(
                    shippingAddress?.phone,
                    shippingAddress?.countryCode
                  ) ||
                  addressErrors.find(
                    (e) =>
                      Array.isArray(e.field) &&
                      e.field[e.field.length - 1] === "phone"
                  )?.message
                }
                onChange={(val) => updateShippingField("phone", val)}
              ></s-phone-field>

              {/* First + Last Name */}
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                <s-text-field
                  label="First name"
                  value={shippingAddress?.firstName ?? ""}
                  onChange={(val) => updateShippingField("firstName", val)}
                />
                <s-text-field
                  label="Last name"
                  value={shippingAddress?.lastName ?? ""}
                  onChange={(val) => updateShippingField("lastName", val)}
                />
              </s-grid>

              {/* Address 1 + Address 2 */}
              <s-text-field
                label="Address 1"
                value={shippingAddress?.address1 ?? ""}
                onChange={(val) => updateShippingField("address1", val)}
              />

              <s-text-field
                label="Address 2"
                value={shippingAddress?.address2 ?? ""}
                onChange={(val) => updateShippingField("address2", val)}
              />

              {/* STATE SELECT */}
              <s-select
                label="State / Province"
                value={shippingAddress?.provinceCode}
                onChange={(val) => {
                  updateShippingField("provinceCode", val);
                }}
              >
                {/* Default option */}
                <s-option value="">Select State</s-option>

                {/* Dynamically add states */}
                {(COUNTRY_STATES[selectedCountry] ?? []).map((state) => (
                  <s-option key={state} value={state.code}>
                    {state.name}
                  </s-option>
                ))}
              </s-select>

              {/* state + Postal */}
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                {/* {provinces.length > 0 ? (
                  <s-select
                    label="State/Province"
                    value={
                      shippingAddress?.provinceCode ??
                      shippingAddress?.["province"] ??
                      ""
                    }
                    error={
                      addressErrors.find((e) => e.field.includes("province"))
                        ?.message
                    }
                    onChange={(val) => updateShippingField("provinceCode", val)}
                    disabled={loadingProvinces}
                  >
                    <s-option value="">Select a state/province</s-option>
                    {provinces.map((province) => (
                      <s-option
                        key={
                          typeof province === "string"
                            ? province
                            : province.code
                        }
                        value={
                          typeof province === "string"
                            ? province
                            : province.code
                        }
                      >
                        {typeof province === "string"
                          ? province
                          : province.name || province.code}
                      </s-option>
                    ))}
                  </s-select>
                ) : (
                  <s-text-field
                    label="State/Province"
                    value={
                      shippingAddress?.provinceCode ??
                      shippingAddress?.["province"] ??
                      ""
                    }
                    error={
                      addressErrors.find((e) => e.field.includes("province"))
                        ?.message
                    }
                    onChange={(val) => updateShippingField("provinceCode", val)}
                  />
                )} */}
                <s-text-field
                  label="City"
                  value={shippingAddress?.city ?? ""}
                  error={
                    addressErrors.find((e) => e.field.includes("city"))?.message
                  }
                  onChange={(val) => updateShippingField("city", val)}
                />

                <s-text-field
                  label="Postal code"
                  value={shippingAddress?.zip ?? ""}
                  error={
                    addressErrors.find(
                      (e) =>
                        e.field.includes("zip") || e.field.includes("postal")
                    )?.message
                  }
                  onChange={(val) => updateShippingField("zip", val)}
                />
              </s-grid>

              {/* save changes button  */}
              <s-stack direction="inline" justifyContent="end">
                {hasShippingAddressChanges() && (
                  <s-button
                    variant="primary"
                    loading={isSaving}
                    onClick={() => handleSaveAddress()}
                  >
                    Save changes
                  </s-button>
                )}
              </s-stack>
            </s-grid>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
      )}

        {/* Order-level Phone */}
        {showEditPhoneNumber && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() => setOpenBox(openBox === "phone" ? null : "phone")}
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="mobile" />
                  <s-heading>Phone Number (order)</s-heading>
                </s-stack>
              </s-box>
              {openBox === "phone" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "phone" && (
            <s-grid gap="base">
              <s-email-field
                readOnly
                label="Email"
                name="customerEmail"
                value={fullOrder?.customer?.email ?? ""}
              ></s-email-field>
              <s-phone-field
                label="Phone"
                defaultValue={shippingAddress?.phone ?? ""}
                error={
                  validatePhone(
                    shippingAddress?.phone,
                    shippingAddress?.countryCode
                  ) ||
                  addressErrors.find(
                    (e) =>
                      Array.isArray(e.field) &&
                      e.field[e.field.length - 1] === "phone"
                  )?.message
                }
                onChange={(val) => updateShippingField("phone", val)}
              ></s-phone-field>

              {/* save changes button  */}
              <s-stack direction="inline" justifyContent="end">
                {hasPhoneChanges() && (
                  <s-button
                    variant="primary"
                    loading={isSaving}
                    onClick={() => handleSavePhone()}
                  >
                    Save changes
                  </s-button>
                )}
              </s-stack>
            </s-grid>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
      )}

        {/* Line Items */}
        {showLineItems && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() =>
              setOpenBox(openBox === "lineItems" ? null : "lineItems")
            }
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="order" />
                  <s-heading>Order Line Items</s-heading>
                </s-stack>
              </s-box>
              {openBox === "lineItems" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "lineItems" && (
        !showOrders ? (
            <s-grid gap="base">
              {(fullOrder?.lineItems?.edges ?? []).map((item, index) => (
                <s-stack gap="base" inlineSize="100%">
  {/* ROW */}
  <s-stack
    direction="inline"
    justifyContent="space-between"
    alignItems="center"
    gap="base"
    inlineSize="100%"
  >
    {/* LEFT: Image + Info */}
    <s-stack
      direction="inline"
      gap="base"
      alignItems="center"
      inlineSize="65%"
    >
      <s-stack blockSize="70px" inlineSize="70px">
        <s-image
          src={
            item?.node?.image?.url ??
            "https://via.placeholder.com/64"
          }
          alt={item.node.image?.altText}
          borderRadius="large-100"
          border="base"
        />
      </s-stack>

      <s-stack gap="small-500">
        <s-text type="generic" color="base">
          {item?.node?.name}
        </s-text>

        <s-text>
          Price:{" "}
          {item?.node?.originalUnitPriceSet?.shopMoney?.amount}
        </s-text>
      </s-stack>
    </s-stack>

    {/* RIGHT: Controls */}
    <s-stack
      direction="inline"
      alignItems="center"
      gap="base"
      justifyContent="end"
      inlineSize="auto"
    >
      {/* Variant selector */}
      {(fullOrder?.variantsMap?.[item.node.id]?.length ?? 0) > 1 && (
        <VariantSelector
          lineItemId={item.node.id}
          variants={fullOrder?.variantsMap?.[item.node.id] ?? []}
          selectedId={getSelectedVariantId(
            item,
            fullOrder?.variantsMap
          )}
          onChangeVariant={handleVariantChange}
        />
      )}

      {/* Quantity */}
      {showUpdateQuantity && (
        <s-number-field
          label="Qty"
          controls="stepper"
          defaultValue={String(item.node.currentQuantity)}
          step={1}
          min={0}
          max={100}
          onChange={(val) => updateLineQty(index, val)}
        />
      )}

      {/* Action buttons */}
      <s-stack direction="inline" alignItems="center" gap="base">
        {showReplaceButton && (
          <s-button
            variant="secondary"
            command="--show"
            commandFor="replacePanelModal"
            onClick={() => openReplacePanel(index)}
          >
            <s-icon type="reset" />
          </s-button>
        )}

        {showDeleteButton && (
          <s-button
            variant="secondary"
            tone="critical"
            inlineSize="auto"
            onClick={() => toggleRemove(index)}
          >
            {item.remove ? "Undo Remove" : <s-icon type="delete" />}
          </s-button>
        )}
      </s-stack>
    </s-stack>
  </s-stack>

  {/* DIVIDER */}
  <s-divider />
</s-stack>

              ))}
              {/* save changes button  */}
              <s-stack direction="inline" justifyContent="end">
                {hasLineItemsChanges() && (
                  <s-button
                    variant="primary"
                    loading={isSaving}
                    onClick={() => handleOrderEdit()}
                  >
                    Save changes
                  </s-button>
                )}
              </s-stack>
            </s-grid>
          ) : <s-stack inlineSize="100%" justifyContent="center" gap="base"><s-spinner></s-spinner></s-stack>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
      )}

        {/* Add Product */}
        {
        showAddProduct && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() =>
              setOpenBox(openBox === "addProduct" ? null : "addProduct")
            }
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="mobile" />
                  <s-heading>Add a product</s-heading>
                </s-stack>
              </s-box>
              {openBox === "addProduct" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "addProduct" && (
            !showOrders ? (
            <s-stack gap="base" direction="block">
              <s-text-field
                label="Search products"
                placeholder="Search products..."
                value={productSearchQuery}
                onChange={(val) => {
                  setPage(0); // reset to first page on new search
                  handleProductSearchChange(val);
                }}
              ></s-text-field>

              <s-stack gap="base" direction="block">
                {/* {searchLoading && <s-spinner></s-spinner>} */}

                {!searchLoading && visibleProducts.length === 0 && (
                  <s-text color="subdued">No products found.</s-text>
                )}

                {searchLoading ? (
                  <s-stack
                    inlineSize="100%"
                    direction="block"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <s-box padding="large">
                      <s-spinner size="large-100"></s-spinner>
                    </s-box>
                  </s-stack>
                ) : (
                  visibleProducts.map((p, i) => {
                    const isAdded = (fullOrder?.lineItems?.edges ?? []).some(
                      (item) =>
                        item.variant_id ===
                        (p.variants?.edges?.[0]?.node?.id ?? p.id)
                    );

                    const price =
                      p?.variants?.edges?.[0]?.node?.price ?? p.variant_price;

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
                        {/* Image */}
                        <s-stack inlineSize="64px" blockSize="64px">
                          <s-image
                            src={
                              p?.featuredImage?.url ??
                              "https://via.placeholder.com/64"
                            }
                            alt={p?.title ?? p.name}
                            inlineSize="fill"
                            objectFit="contain"
                          />
                        </s-stack>

                        {/* Title + vendor + price */}
                        <s-stack gap="small-100" direction="block">
                          <s-text>{p?.title ?? p.name}</s-text>
                          {p.vendor && (
                            <s-text type="small" color="subdued">
                              {p.vendor}
                            </s-text>
                          )}
                          <s-text>₹{price}</s-text>
                        </s-stack>

                        {/* Right button (View/Add) */}
                        {/* <s-button
                          variant="primary"
                          onClick={() => addProductToOrder(p)}
                          disabled={isAdded}
                        >
                          {isAdded ? "Added" : "Add product"}
                        </s-button> */}
<s-button
  variant={isAdded ? "secondary" : "primary"}
  tone={isAdded ? "critical" : undefined}
  onClick={() => toggleAddProduct(p)}
>
  {isAdded ? "Remove" : "Add product"}
</s-button>

                      </s-grid>
                    );
                  })
                )}

                {/* Pagination arrows */}
                {products.length > pageSize && (
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <s-button
                      variant="secondary"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      ‹
                    </s-button>
                    <s-text type="small">
                      Page {page + 1} of {totalPages}
                    </s-text>
                    <s-button
                      variant="secondary"
                      disabled={page >= totalPages - 1}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                    >
                      ›
                    </s-button>
                  </s-stack>
                )}

                <s-stack direction="inline" justifyContent="end">
                  {hasLineItemsChanges() && (
                    <s-button
                      variant="primary"
                      loading={isSaving}
                      onClick={handleAddProduct}
                    >
                      Save changes
                    </s-button>
                  )}
                </s-stack>
              </s-stack>
            </s-stack>
      ) : <s-stack inlineSize="100%" justifyContent="center" gap="base"><s-spinner></s-spinner></s-stack>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
        )}

        {/* Discount code */}
        {showApplyDiscount && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() =>
              setOpenBox(openBox === "discount" ? null : "discount")
            }
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="order" />
                  <s-heading>Apply discount code</s-heading>
                </s-stack>
              </s-box>
              {openBox === "discount" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "discount" && (
            <s-stack direction="inline" gap="base">
              <s-text-field
                label="Discount code"
                value={discountCode}
                onChange={(val) => updateDiscount(val)}
              ></s-text-field>

              <s-button onClick={applyDiscount} loading={applyDiscountLoading}>
                Apply
              </s-button>
            </s-stack>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
        )}


        {/* Invoice */}
        {showDownloadInvoice && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() => setOpenBox(openBox === "invoice" ? null : "invoice")}
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="note" />
                  <s-heading>Download Invoice</s-heading>
                </s-stack>
              </s-box>
              {openBox === "invoice" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "invoice" && (
            <s-stack gap="base" direction="block">
              {/* Options Group */}
              <s-stack gap="base" direction="block">
                <s-choice-list values={invoiceOption} onChange={updateInvoice}>
                  {/* <s-choice value="download" defaultSelected>
                    Download Invoice
                  </s-choice> */}
                  <s-choice value="email" defaultSelected>
                    Send invoice by email
                  </s-choice>
                </s-choice-list>
                <s-text type="small" color="subdued">
                  Send an invoice only when the order has a remaining balance (such as added items)
                </s-text>
              </s-stack>

              {/* Email Field */}
              {invoiceOption.includes("email") && (
                <s-text-field
                  label="Email"
                  value={invoiceEmail ?? fullOrder?.customer?.email}
                  onChange={(val) => updateInvoiceEmail(val)}
                ></s-text-field>
              )}

              {/* Submit Button */}
              <s-stack direction="inline" justifyContent="end">
                <s-button loading={isSaving} onClick={handleInvoice}>
                  Generate Invoice
                </s-button>
              </s-stack>

              {/* Info Banner */}
              {fullOrder.last_invoice_action && (
                <s-banner tone="info">
                  <s-text>{fullOrder.last_invoice_action}</s-text>
                </s-banner>
              )}
            </s-stack>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
        )}

        {/* Change delivery instructions */}
        {showDeliveryInst && (
          <>
        <s-box padding="base">
          <s-clickable
            inlineSize="100%"
            onClick={() =>
              setOpenBox(openBox === "orderNote" ? null : "orderNote")
            }
          >
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
              gap="base"
              inlineSize="100%"
            >
              <s-box padding="large none">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-icon type="note" />
                  <s-heading>Change delivery instructions</s-heading>
                </s-stack>
              </s-box>
              {openBox === "orderNote" ? (
                <s-icon type="chevron-up" />
              ) : (
                <s-icon type="chevron-down" />
              )}
            </s-stack>
          </s-clickable>

          {openBox === "orderNote" && (
            <s-stack gap="base" direction="block">
              <s-heading>Delivery Instructions</s-heading>
              <s-text color="subdued">
                Special instructions provided by the customer for this order.
              </s-text>
              <s-text-field
                label="Delivery Instructions"
                value={deliveryInst}
                onChange={(val) => updateDelIns(val)}
              />
              {/* save changes button  */}
              <s-stack direction="inline" justifyContent="end">
                {hasdeliveryInstChanges() && (
                  <s-button
                    variant="primary"
                    loading={isSaving}
                    onClick={() => updateDeliveryInst()}
                  >
                    Save changes
                  </s-button>
                )}
              </s-stack>
              {/* <s-divider></s-divider> */}
              <s-text type="small" color="subdued">
                These instructions will be shared with our delivery team.
              </s-text>
            </s-stack>
          )}
        </s-box>
        <s-divider></s-divider>
        </>
        )}

        <s-modal
          id="replacePanelModal"
          heading="Replace Product"
          size="large-100"
        >
          <s-box padding="small-100">
            <s-text>Replace product #{replaceIndex + 1}</s-text>
          </s-box>
          <s-stack gap="base" direction="block">
            <s-stack gap="base" direction="block">
              <s-text-field
                label="Search replacement..."
                placeholder="Search products..."
                value={productSearchQuery}
                onChange={(val) => {
                  setPage(0);
                  handleProductSearchChange(val);
                }}
              ></s-text-field>
              {/* <s-icon slot="prefix" type="search" /> */}
            </s-stack>

            <s-stack gap="base" direction="block">
              {/* {searchLoading && <s-spinner></s-spinner>} */}

              {!searchLoading && visibleProducts.length === 0 && (
                <s-text color="subdued">No products found.</s-text>
              )}

              {/* Product list */}

              {searchLoading ? (
                <s-stack
                  inlineSize="100%"
                  direction="block"
                  alignItems="center"
                  justifyContent="center"
                >
                  <s-box padding="large">
                    <s-spinner size="large-100"></s-spinner>
                  </s-box>
                </s-stack>
              ) : (
                visibleProducts.map((p, i) => {
                  const variantId = p.variants?.edges?.[0]?.node?.id ?? p.id;
                  const isReplaced =
  fullOrder?.lineItems?.edges?.[replaceIndex]?.replaced_with &&
  String(
    fullOrder.lineItems.edges[replaceIndex].replaced_with.variant_id
  ) === String(p.variants?.edges?.[0]?.node?.id);


                  const price =
                    p?.variants?.edges?.[0]?.node?.price ?? p.variant_price;

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
                      {/* Image */}
                      <s-stack inlineSize="64px" blockSize="64px">
                        <s-image
                          src={
                            p?.featuredImage?.url ??
                            "https://via.placeholder.com/64"
                          }
                          alt={p?.title ?? p.name}
                          inlineSize="fill"
                          objectFit="contain"
                        />
                      </s-stack>

                      {/* Title + vendor + price */}
                      <s-stack gap="small-500" direction="block">
                        <s-text>{p?.title ?? p.name}</s-text>
                        {p.vendor && (
                          <s-text type="small" color="subdued">
                            {p.vendor}
                          </s-text>
                        )}
                        <s-text>₹{price}</s-text>
                      </s-stack>

                      {/* <s-button
                        variant="secondary"
                        onClick={() => performReplace(replaceIndex, p)}
                        disabled={isReplaced}
                      >
                        {isReplaced ? "Replaced" : "Replace with this"}
                      </s-button> */}
<s-button
  variant={isReplaced ? "secondary" : "primary"}
  tone={isReplaced ? "critical" : undefined}
  onClick={() => toggleReplace(replaceIndex, p)}
>
  {isReplaced ? "Undo replace" : "Replace with this"}
</s-button>


                    </s-grid>
                  );
                })
              )}

              {/* Pagination arrows */}
              {products.length > pageSize && (
                <s-stack
                  direction="inline"
                  gap="base"
                  alignItems="center"
                  justifyContent="center"
                >
                  <s-button
                    variant="secondary"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ‹
                  </s-button>
                  <s-text type="small">
                    Page {page + 1} of {totalPages}
                  </s-text>
                  <s-button
                    variant="secondary"
                    disabled={page >= totalPages - 1}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                  >
                    ›
                  </s-button>
                </s-stack>
              )}
              <s-stack direction="inline" justifyContent="end">
                <s-button
                  variant="primary"
                  command="--hide"
                  commandFor="replacePanelModal"
                  slot="primary-action"
                  onClick={() => {
                    setShowReplacePanel(false);
                    setReplaceIndex(null);
                  }}
                >
                  Apply Changes
                </s-button>
              </s-stack>
            </s-stack>
          </s-stack>

          {/* <s-grid
            gap="base"
            gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
            blockSize="auto"
          >
            {(searchLoading ? ("Loading...") : "")}
            {(productSearchResults ?? []).slice(0, 8).map((p, i) => {
              const variantId = p.variants?.edges?.[0]?.node?.id ?? p.id;

              const isReplaced = (fullOrder?.lineItems?.edges ?? []).some(
                (edge) => {
                  const rep = edge?.replaced_with;
                  return rep?.variant_id === variantId;
                }
              );

              return (
                <s-stack
                  key={i}
                  gap="base"
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  blockSize="auto"
                >
                  <s-stack blockSize="200px" inlineSize="100%">
                    <s-image
                      src={
                        p.featuredImage?.url ??
                        "https://via.placeholder.com/200"
                      }
                      alt={p?.title ?? p.name}
                      inlineSize="fill"
                      objectFit="contain"
                    />
                  </s-stack>

                  <s-heading>{p?.title ?? p.name}</s-heading>
                  <s-text type="small" color="subdued">
                    {p.vendor}
                  </s-text>

                  <s-text>
                    Price:{" "}
                    {p.variants?.edges?.[0]?.node?.price ?? p.variant_price}
                  </s-text>

                  <s-button
                    onClick={() => performReplace(replaceIndex, p)}
                    disabled={isReplaced}
                  >
                    {isReplaced ? "Replaced" : "Replace with this"}
                  </s-button>
                </s-stack>
              );
            })}
          </s-grid> */}
        </s-modal>

        <s-modal id="modifyPanelModal" heading="Edit Order" size="small">
          <s-text>Modify product #{modifyIndex + 1}</s-text>
          {/* Search input */}
          <s-stack>
            <s-text-field
              label="Variant title"
              value={fullOrder.lineItems?.edges[modifyIndex]?.node?.name ?? ""}
              onChange={() => { }}
            // we'll read actual value from textarea beneath to apply
            />

            <s-text-field
              label="Custom properties (JSON)"
              value={JSON.stringify(
                fullOrder.lineItems?.edges[modifyIndex]?.node?.properties ?? []
              )}
              onChange={() => { }}
            />

            <s-stack gap="base">
              <s-button
                onClick={() => {
                  // read current item inputs from state (since TextField onChange was not wired for simplicity)
                  // We will attempt to parse props JSON from current order object copy
                  const currentItem =
                    fullOrder.lineItems?.edges[modifyIndex] ?? {};
                  let parsedProps = currentItem.properties ?? [];
                  let vt = currentItem.variant_title ?? "";
                  try {
                    // Try parsing if it's a stringified value present
                    if (typeof currentItem.properties === "string")
                      parsedProps = JSON.parse(currentItem.properties);
                  } catch (e) {
                    parsedProps = currentItem.properties ?? [];
                  }
                  applyModify(modifyIndex, {
                    variant_title: vt,
                    properties: parsedProps,
                  });
                }}
              >
                Apply
              </s-button>
            </s-stack>
            <s-button
              variant="primary"
              command="--hide"
              commandFor="replacePanelModal"
              slot="primary-action"
              onClick={() => {
                setShowModifyPanel(false);
                setModifyIndex(null);
              }}
            >
              Close
            </s-button>
          </s-stack>
        </s-modal>
      </s-box>
    </s-section>
  );
}


{/* Shipping methods */ }
//     <BlockStack spacing="base">
//     <Pressable
//   onPress={() => setOpenShippingMethods((s) => !s)}
// >
//           <InlineLayout
//     columns={["fill", "auto"]}
//     blockAlignment="center"
//   >
//           <TextBlock>Select a faster shipping method</TextBlock>
//           {/* <Button plain size="small" onPress={() => setOpenShippingMethods((s) => !s)}> */}
//             {openShippingMethods ? <Icon source="chevronUp" /> : <Icon source="chevronDown" />}
//           {/* </Button> */}
//         </InlineLayout>
//         </Pressable>

//         {openShippingMethods && (
//           <BlockStack spacing="tight">
//             {shippingMethods.length === 0 ? (
//               <TextBlock>No alternative shipping methods available</TextBlock>
//             ) : (
//               shippingMethods.map((m, i) => (
//                 <InlineStack key={i} align="centerInline" spacing="tight">
//                   <Radio
//                     label={`${m.title} — ${m.price_display ?? m.price}`}
//                     checked={selectedShippingMethod?.id === m.id || selectedShippingMethod?.title === m.title}
//                     onChange={() => {
//                       setSelectedShippingMethod(m);
//                       setFullOrder((o) => ({ ...o, shipping_lines: [m] }));
//                     }}
//                   />
//                 </InlineStack>
//               ))
//             )}
//           </BlockStack>
//         )}
//       </BlockStack>
// <s-divider></s-divider>

{/* Cancellation request */ }
{/* <BlockStack spacing="base">
    <Pressable
  onPress={() => setOpenCancel((s) => !s)}
>
        <InlineStack align="spaceBetween">
          <TextBlock>Request order cancellation</TextBlock>
            {openCancel ? "Hide" : "Request"}
        </InlineStack>
        </Pressable>

        {openCancel && (
          <BlockStack spacing="tight">
            <Select
              label="Reason"
              placeholder="Select reason"
              value={cancelReason}
              onChange={(val) => setCancelReason(val)}
              options={[
                { label: "Changed my mind", value: "changed_mind" },
                { label: "Found cheaper elsewhere", value: "found_cheaper" },
                { label: "Item unavailable", value: "item_unavailable" },
                { label: "Other", value: "other" },
              ]}
            />
            <TextField
              label="Note (optional)"
              value={cancelNote}
              onChange={(val) => setCancelNote(val)}
              multiline
            />
            <Button destructive onPress={requestCancellation} loading={cancelLoading}>
              {cancelLoading ? "Requesting..." : "Proceed Cancellation"}
            </Button>
          </BlockStack>
        )}
      </BlockStack>
<s-divider></s-divider> */}