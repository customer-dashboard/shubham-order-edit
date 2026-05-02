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
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateInput = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const handleSelectRange = (range) => {
    setActiveDateRange(range);
    setTempRange(range.period);
    const s = range.period.since;
    if (s && !isNaN(s.getTime())) {
      setView(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleDatePickerChange = (event) => {
    const val = event.currentTarget.value;
    if (!val || !val.includes('--')) return;
    const [s, e] = val.split('--');
    const since = new Date(s);
    const until = new Date(e);
    if (!isNaN(since.getTime()) && !isNaN(until.getTime())) {
      setTempRange({ since, until });
      setActiveDateRange(ranges[7]);
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
          <s-grid gridTemplateColumns="1fr 3fr">
            {/* Sidebar */}
            <s-box borderInlineEnd="all">
              <s-stack direction="block" gap="none">
                {ranges.map((range) => (
                  <s-clickable
                    //  background?: 'transparent' | 'base' | 'subdued' | 'strong';
                    background={activeDateRange.title === range.title ? 'strong' : ''}
                    key={range.title}
                    padding="small-100"
                    onClick={() => handleSelectRange(range)}
                    accessibilityLabel={range.title}
                  >
                    <s-grid
                      gridTemplateColumns="1fr auto"
                      alignItems="center"
                      gap="base"
                    >
                      <s-box>
                        <s-text variant="bodyMd" fontWeight={activeDateRange.title === range.title ? 'bold' : 'regular'}>{range.title}</s-text>
                      </s-box>
                      {activeDateRange.title === range.title ? <s-icon type="check" size="small" /> : <s-icon type="chevron-right" size="small" />}
                    </s-grid>
                  </s-clickable>
                ))}
              </s-stack>
            </s-box>

            {/* Content */}
            <s-box padding="large">
              <s-grid gridTemplateColumns="1fr">
                <s-grid gridTemplateColumns="1fr 1fr" gap="base">

                  <s-text-field
                    label="Since"
                    labelHidden
                    value={formatDateLabel(tempRange.since)}
                    inlineSize="fill"
                    onBlur={(e) => {
                      const d = new Date(e.currentTarget.value);
                      if (!isNaN(d.getTime())) {
                        setTempRange(prev => ({ ...prev, since: d }));
                        setView(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        setActiveDateRange(ranges[7]);
                      }
                    }}
                  />
                  <s-text-field
                    label="Until"
                    labelHidden
                    value={formatDateLabel(tempRange.until)}
                    inlineSize="fill"
                    onBlur={(e) => {
                      const d = new Date(e.currentTarget.value);
                      if (!isNaN(d.getTime())) {
                        setTempRange(prev => ({ ...prev, until: d }));
                        setActiveDateRange(ranges[7]);
                      }
                    }}
                  />
                </s-grid>
                <s-date-picker
                  type="range"
                  view={view}
                  value={`${formatDateInput(tempRange.since)}--${formatDateInput(tempRange.until)}`}
                  onChange={handleDatePickerChange}
                  onViewChange={(e) => setView(e.currentTarget.view)}
                />
              </s-grid>
            </s-box>
          </s-grid>
          <s-divider />
          <s-stack direction="inline" justifyContent="end" gap="base" padding="base">
            <s-button onClick={() => document.getElementById('date-range-popover')?.hideOverlay()}>Cancel</s-button>
            <s-button variant="primary" onClick={() => {
              if (tempRange.since && tempRange.until) {
                onDateRangeSelect({ start: tempRange.since, end: tempRange.until });
              }
              document.getElementById('date-range-popover')?.hideOverlay();
            }}>Apply</s-button>
          </s-stack>
        </s-box>
      </s-popover>
    </s-box>

  );
};




