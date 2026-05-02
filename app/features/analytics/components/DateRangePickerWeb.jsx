import React from 'react';

/**
 * DateRangePicker using Polaris App Home web components
 */
export const DateRangePickerWeb = ({ onDateRangeSelect, value: { start, end } }) => {
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const today = React.useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const yesterday = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }, [today]);

  const ranges = React.useMemo(() => [
    { title: 'Today', period: { since: today, until: today } },
    { title: 'Yesterday', period: { since: yesterday, until: yesterday } },
    { title: 'Last 7 days', period: { since: new Date(new Date().setDate(today.getDate() - 7)), until: today } },
    { title: 'Last 30 days', period: { since: new Date(new Date().setDate(today.getDate() - 30)), until: today } },
    { title: 'Last 90 days', period: { since: new Date(new Date().setDate(today.getDate() - 90)), until: today } },
    { title: 'This month', period: { since: new Date(today.getFullYear(), today.getMonth(), 1), until: today } },
    { title: 'Last month', period: { since: new Date(today.getFullYear(), today.getMonth() - 1, 1), until: new Date(today.getFullYear(), today.getMonth(), 0) } },
    { title: 'Custom range', period: { since: start, until: end } },
  ], [today, yesterday, start, end]);


  const [activeDateRange, setActiveDateRange] = React.useState(ranges[7]);
  const [tempRange, setTempRange] = React.useState({ since: start, until: end });
  const [view, setView] = React.useState(() => `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);

  const formatDateLabel = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateInput = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleSelectRange = (range) => {
    setActiveDateRange(range);
    setTempRange(range.period);
    const s = range.period.since;
    setView(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleDatePickerChange = (event) => {
    const val = event.currentTarget.value;
    if (!val || !val.includes('--')) return;
    const [s, e] = val.split('--');
    setTempRange({ since: new Date(s), until: new Date(e) });
    setActiveDateRange(ranges[7]);
  };

  const togglePopover = () => {
    const popoverEl = document.getElementById('date-range-popover');
    if (!popoverEl) return;
    if (popoverOpen) {
      popoverEl.hideOverlay?.();
    } else {
      popoverEl.showOverlay?.();
    }
  };

  return (
    <s-box>
      <s-button
        id="date-picker-trigger"
        commandFor="date-range-popover"
        icon="calendar"
        variant="secondary"
        suffixIcon="chevron-down"
        onClick={togglePopover}
      >
        {activeDateRange.title === 'Custom range'
          ? `${formatDateLabel(tempRange.since)} - ${formatDateLabel(tempRange.until)}`
          : activeDateRange.title}
      </s-button>

      <s-popover
        id="date-range-popover"
        onShow={() => setPopoverOpen(true)}
        onHide={() => setPopoverOpen(false)}
      >
        <s-box width="620px">
          <s-grid gridTemplateColumns="200px 1fr">
            {/* Sidebar */}
            <s-box borderInlineEnd="all" padding="small-100">
              <s-stack direction="block" gap="none">
                {ranges.map((range) => (
                  <s-box
                    key={range.title}
                    padding="small-100"
                    borderRadius="base"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: activeDateRange.title === range.title ? '#e1e3e5' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleSelectRange(range)}
                  >
                    <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                      <s-text 
                        variant="bodyMd" 
                        fontWeight={activeDateRange.title === range.title ? 'bold' : 'regular'}
                      >
                        {range.title}
                      </s-text>
                      {activeDateRange.title === range.title && <s-icon type="chevron-right" size="small" />}
                    </s-grid>
                  </s-box>
                ))}
              </s-stack>
            </s-box>

            {/* Content */}
            <s-box padding="large">
              <s-stack gap="large">
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-stack gap="extra-tight" flex="1">
                    <s-text variant="bodySm" color="subdued">Since</s-text>
                    <s-text-field
                      label="Since"
                      labelHidden
                      value={formatDateLabel(tempRange.since)}
                      inlineSize="fill"
                      onInput={(e) => {
                        const d = new Date(e.currentTarget.value);
                        if (!isNaN(d.getTime())) {
                          setTempRange(prev => ({ ...prev, since: d }));
                          setView(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        }
                      }}
                    />
                  </s-stack>
                  <s-box paddingBlockStart="base">
                    <s-text>→</s-text>
                  </s-box>
                  <s-stack gap="extra-tight" flex="1">
                    <s-text variant="bodySm" color="subdued">Until</s-text>
                    <s-text-field
                      label="Until"
                      labelHidden
                      value={formatDateLabel(tempRange.until)}
                      inlineSize="fill"
                      onInput={(e) => {
                        const d = new Date(e.currentTarget.value);
                        if (!isNaN(d.getTime())) {
                          setTempRange(prev => ({ ...prev, until: d }));
                        }
                      }}
                    />
                  </s-stack>
                </s-stack>

                {/* Single Calendar */}
                <s-date-picker
                  type="range"
                  view={view}
                  value={`${formatDateInput(tempRange.since)}--${formatDateInput(tempRange.until)}`}
                  onChange={handleDatePickerChange}
                  onViewChange={(e) => setView(e.currentTarget.view)}
                />

                <s-divider />
                <s-stack direction="inline" justifyContent="end" gap="base">
                  <s-button onClick={() => document.getElementById('date-range-popover')?.hideOverlay()}>Cancel</s-button>
                  <s-button variant="primary" onClick={() => {
                    onDateRangeSelect({ start: tempRange.since, end: tempRange.until });
                    document.getElementById('date-range-popover')?.hideOverlay();
                  }}>Apply</s-button>
                </s-stack>
              </s-stack>
            </s-box>
          </s-grid>
        </s-box>
      </s-popover>
    </s-box>
  );
};




