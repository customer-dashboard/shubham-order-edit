export function UsageInsights({ usageInsights }) {
  const categories = [
    { label: "High Adoption", color: "#008060", items: usageInsights.highAdoption },
    { label: "Growth Opportunity", color: "#458fcc", items: usageInsights.growthOpportunity },
    { label: "Monitor Closely", color: "#b47c00", items: usageInsights.monitorClosely },
  ];

  return (
    <s-box border="base" border-radius="base">
      <s-box padding="base">
        <s-heading>Usage Insights</s-heading>
      </s-box>
      <s-divider />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {categories.map((col, idx) => (
          <div
            key={idx}
            style={{ padding: "16px", borderRight: idx < 2 ? "1px solid #e1e3e5" : "none" }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: col.color,
                marginBottom: 10,
              }}
            >
              {col.label}
            </p>
            {col.items.length === 0 ? (
              <s-text color="subdued">No data yet</s-text>
            ) : (
              col.items.map((item, i) => <s-text key={i}>{item}</s-text>)
            )}
          </div>
        ))}
      </div>
    </s-box>
  );
}
