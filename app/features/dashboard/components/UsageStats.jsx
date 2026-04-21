export function UsageStats() {
  const stats = [
    { label: "Total Orders", value: "0" },
    { label: "Total Edited Orders", value: "0" },
    { label: "Active Features", value: "0 / 10" },
  ];

  return (
    <s-box border="base" border-radius="base">
      <s-box padding="base">
        <s-heading>Feature Usage Overview</s-heading>
      </s-box>
      <s-divider />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            style={{ padding: "16px", borderRight: idx < 2 ? "1px solid #e1e3e5" : "none" }}
          >
            <s-text color="subdued">{stat.label}</s-text>
            <s-heading>{stat.value}</s-heading>
          </div>
        ))}
      </div>
    </s-box>
  );
}
