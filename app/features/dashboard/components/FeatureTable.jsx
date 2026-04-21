export function FeatureTable({ featureUsageData }) {
  return (
    <s-box border="base" border-radius="base">
      <s-box padding="base">
        <s-heading>Feature Usage Statistics</s-heading>
      </s-box>
      <s-divider />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 160px 150px",
          padding: "8px 16px",
          background: "#F9FAFB",
          borderBottom: "1px solid #e1e3e5",
        }}
      >
        <s-text color="subdued">Feature</s-text>
        <s-text color="subdued" style={{ textAlign: "center" }}>
          Usage Count
        </s-text>
        <s-text color="subdued" style={{ textAlign: "right" }}>
          Adoption Rate
        </s-text>
      </div>
      {featureUsageData.map((item, index) => (
        <div
          key={index}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 150px",
            padding: "10px 16px",
            borderBottom: index < featureUsageData.length - 1 ? "1px solid #f1f3f5" : "none",
            alignItems: "center",
          }}
        >
          <s-stack direction="inline" gap="base" align-items="center">
            <s-icon type={item.icon} />
            <s-text>{item.feature}</s-text>
          </s-stack>
          <s-text color="subdued" style={{ textAlign: "center" }}>
            {item.count}
          </s-text>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                background: "#e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${item.percentage}%`,
                  height: "100%",
                  background: "#008060",
                }}
              />
            </div>
            <s-text color="subdued">{item.percentage}%</s-text>
          </div>
        </div>
      ))}
    </s-box>
  );
}
