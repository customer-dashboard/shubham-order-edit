import React from 'react';

export default function OrderPreview({ appSettings }) {
  const isEnabled = (key) => {
    if (!appSettings) return true;
    if (appSettings.status === "disable") return false;
    return appSettings[key]?.status !== "disable";
  };

  const edit_address = isEnabled("shipping_address_editing");
  const edit_phone = isEnabled("phone_number_editing");
  const apply_discount = isEnabled("discount_code");
  const download_invoice = isEnabled("invoice_download");
  const delivery_instructions = isEnabled("delivery_instructions");
  const edit_order_lines = isEnabled("order_line_items_editing");
  const add_products = isEnabled("adding_more_products");

  // Time Limit check logic (mocked for preview)
  const timeLimitEnabled = appSettings?.time_limit?.status === "enable";
  const timeVal = appSettings?.time_limit?.time || 0;
  const period = appSettings?.time_limit?.period || "minutes";

  // For the preview, we'll assume the order is editable unless the overall app status is disabled
  const globalEditable = appSettings?.status !== "disable";

  return (
    <div className="custlo-preview-container">
      <style>{`
        .custlo-preview-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          color: #333;
          font-size: 14px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e5e5;
          overflow-y: auto;
        }

        /* NAV */
        .custlo-preview-container nav {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 0 20px;
          height: 56px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .custlo-preview-container .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
          color: #111;
          text-decoration: none;
        }
        .custlo-preview-container .nav-logo svg { width: 32px; height: 32px; }
        .custlo-preview-container .nav-links { display: flex; gap: 16px; margin-left: 8px; }
        .custlo-preview-container .nav-links a {
          text-decoration: underline;
          color: #111;
          font-size: 14px;
        }
        .custlo-preview-container .nav-links a.active { text-decoration: underline; }
        .custlo-preview-container .nav-links a:not(.active) { text-decoration: none; color: #555; }
        .custlo-preview-container .nav-avatar {
          margin-left: auto;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 500; color: #555;
          border: 1px solid #ccc;
        }

        /* MAIN */
        .custlo-preview-container .page-content {
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 900px) {
          .custlo-preview-container .page-content {
            grid-template-columns: 1fr 300px;
          }
        }
        
        .custlo-preview-container .left { display: flex; flex-direction: column; gap: 16px; }

        /* ORDER HEADER */
        .custlo-preview-container .order-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          grid-column: 1 / -1;
          margin-bottom: 4px;
        }
        .custlo-preview-container .order-title-group { display: flex; align-items: flex-start; flex-direction: column; gap: 2px; }
        .custlo-preview-container .back-btn {
          background: none; border: none; cursor: default;
          display: flex; align-items: center; gap: 6px;
          font-size: 18px; font-weight: 600; color: #111;
          padding: 0; line-height: 1;
        }
        .custlo-preview-container .back-btn svg { width: 18px; height: 18px; }
        .custlo-preview-container .order-date { color: #777; font-size: 13px; margin-top: 2px; padding-left: 24px; }
        .custlo-preview-container .buy-again-btn {
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 8px 18px;
          font-size: 14px;
          cursor: default;
          color: #111;
          font-weight: 400;
        }

        /* ACCORDION CARD */
        .custlo-preview-container .card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          overflow: hidden;
        }
        .custlo-preview-container .accordion-item {
          border-bottom: 1px solid #eee;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: default;
          gap: 12px;
        }
        .custlo-preview-container .accordion-item:last-child { border-bottom: none; }
        .custlo-preview-container .accordion-item-left {
          display: flex; align-items: center; gap: 12px;
        }
        .custlo-preview-container .accordion-item-left svg { width: 18px; height: 18px; color: #555; flex-shrink: 0; }
        .custlo-preview-container .accordion-item span { font-size: 14px; color: #111; }
        .custlo-preview-container .chevron { width: 16px; height: 16px; color: #999; flex-shrink: 0; }

        /* STATUS CARD */
        .custlo-preview-container .status-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .custlo-preview-container .status-line {
          display: flex; align-items: flex-start; gap: 10px;
        }
        .custlo-preview-container .status-check { color: #333; font-size: 16px; margin-top: 1px; }
        .custlo-preview-container .status-text h4 { font-size: 14px; font-weight: 600; color: #111; }
        .custlo-preview-container .status-text p { font-size: 13px; color: #555; margin-top: 2px; }
        .custlo-preview-container .status-text .status-date { font-size: 12px; color: #999; margin-top: 3px; }
        .custlo-preview-container .track-btn {
          border: 1px solid #ccc;
          border-radius: 20px;
          background: #fff;
          padding: 7px 16px;
          font-size: 13px;
          cursor: default;
          color: #333;
          width: fit-content;
          margin-top: 4px;
        }

        /* CONTACT / PAYMENT CARD */
        .custlo-preview-container .info-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .custlo-preview-container .info-section h4 {
          font-size: 13px;
          font-weight: 600;
          color: #111;
          margin-bottom: 8px;
        }
        .custlo-preview-container .info-section p {
          font-size: 13px;
          color: #444;
          line-height: 1.6;
        }

        /* RIGHT: ORDER SUMMARY */
        .custlo-preview-container .summary-card {
          background: #fff;
          max-height: 150px;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 20px;
        }
        .custlo-preview-container .product-line {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
        }
        .custlo-preview-container .product-img-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .custlo-preview-container .product-img-wrap img {
          width: 60px; height: 60px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #eee;
          background: #f5f5f5;
        }
        .custlo-preview-container .product-qty-badge {
          position: absolute;
          top: -6px; right: -6px;
          background: #333;
          color: #fff;
          border-radius: 50%;
          width: 18px; height: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600;
        }
        .custlo-preview-container .product-info { flex: 1; }
        .custlo-preview-container .product-info p {
          font-size: 13px; color: #333; line-height: 1.4;
        }
        .custlo-preview-container .product-price {
          font-size: 13px; color: #111; font-weight: 500;
          white-space: nowrap;
        }
        .custlo-preview-container .divider { border: none; border-top: 1px solid #eee; margin: 12px 0; }
        .custlo-preview-container .summary-row {
          display: flex; justify-content: space-between;
          font-size: 13px; color: #555;
          margin-bottom: 6px;
        }
        .custlo-preview-container .summary-row.total {
          font-weight: 700; font-size: 15px; color: #111;
          margin-top: 10px;
        }
        .custlo-preview-container .summary-row.total .total-right {
          display: flex; align-items: baseline; gap: 4px;
        }
        .custlo-preview-container .currency-label { font-size: 11px; color: #888; font-weight: 400; }

        /* FOOTER BRAND */
        .custlo-preview-container .page-footer {
          grid-column: 1 / -1;
          text-align: center;
          margin-top: 8px;
          padding-bottom: 24px;
        }
        .custlo-preview-container .page-footer a {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; color: #999; text-decoration: none;
        }
        .custlo-preview-container .page-footer a svg { width: 16px; height: 16px; }

        /* SKELETONS */
        .skeleton {
          background: #f0f0f0;
          border-radius: 4px;
          height: 12px;
          margin-bottom: 8px;
        }
        .skeleton.title { width: 40%; height: 16px; margin-bottom: 12px; }
        .skeleton.text-long { width: 80%; }
        .skeleton.text-medium { width: 60%; }
        .skeleton.text-short { width: 30%; }
        .skeleton.circle { width: 32px; height: 32px; border-radius: 50%; margin-bottom: 0; }
        .skeleton.img { width: 60px; height: 60px; border-radius: 6px; margin-bottom: 0; }
      `}</style>
      {/* PAGE GRID */}
      <div className="page-content">

        {/* ORDER HEADER */}
        <div className="order-header">
          <div className="order-title-group">
            <div className="back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Order #2871
            </div>
            <span className="order-date">Confirmed 1 May</span>
          </div>
          <div className="buy-again-btn">Buy again</div>
        </div>

        {/* LEFT COLUMN */}
        <div className="left">

          {/* Accordion Card (MAIN PREVIEW) */}
          {globalEditable && (
            <div className="card">
              {/* Edit shipping address */}
              {edit_address && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="6" width="18" height="13" rx="2" />
                      <path d="M3 10h18" />
                      <circle cx="7.5" cy="14" r="1" />
                    </svg>
                    <span>Edit shipping address</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}

              {/* Phone Number */}
              {edit_phone && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="7" y="2" width="10" height="20" rx="2" />
                      <circle cx="12" cy="17" r="1" />
                    </svg>
                    <span>Phone Number (order)</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}

              {/* Discount code */}
              {apply_discount && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="7" width="18" height="13" rx="2" />
                      <path d="M16 7V5a2 2 0 0 0-4 0v2" />
                      <path d="M12 12v4" />
                    </svg>
                    <span>Apply discount code</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}

              {/* Download Invoice */}
              {download_invoice && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    <span>Download Invoice</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}

              {/* Delivery Instructions */}
              {delivery_instructions && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Change delivery instructions</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}

              {/* Order Line Items */}
              {edit_order_lines && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    <span>Order Line Items</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}

              {/* Add More Products */}
              {add_products && (
                <div className="accordion-item">
                  <div className="accordion-item-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add more products</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Status Card (SKELETON) */}
          <div className="status-card">
            <div className="status-line">
              <div className="skeleton circle" />
              <div className="status-text" style={{ flex: 1 }}>
                <div className="skeleton title" />
                <div className="skeleton text-long" />
                <div className="skeleton text-short" />
              </div>
            </div>
            <div className="skeleton" style={{ width: '140px', height: '32px', borderRadius: '20px' }} />
          </div>

        </div>

        {/* RIGHT COLUMN (SKELETON) */}
        <div className="summary-card" style={{ padding: '12px' }}>
          <div className="product-line" style={{ marginBottom: '12px', gap: '8px' }}>
            <div className="skeleton img" style={{ width: '40px', height: '40px' }} />
            <div className="product-info">
              <div className="skeleton text-long" />
              <div className="skeleton text-short" />
            </div>
            <div className="skeleton text-short" style={{ width: '30px' }} />
          </div>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="summary-row" style={{ marginBottom: '4px' }}>
            <div className="skeleton text-short" style={{ width: '50px' }} />
            <div className="skeleton text-short" style={{ width: '30px' }} />
          </div>
          <div className="summary-row">
            <div className="skeleton text-short" style={{ width: '50px' }} />
            <div className="skeleton text-short" style={{ width: '30px' }} />
          </div>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="summary-row total">
            <div className="skeleton text-short" style={{ width: '70px', height: '16px' }} />
            <div className="skeleton text-short" style={{ width: '50px', height: '16px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
