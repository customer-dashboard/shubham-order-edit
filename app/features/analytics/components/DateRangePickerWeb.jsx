import React from 'react';

/**
 * DateRangePicker using Polaris App Home web components
 * Layout matches Shopify admin date range picker
 */
export const DateRangePickerWeb = ({ onDateRangeSelect, value: { start, end } }) => {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const yesterday = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }, [today]);

  const ranges = React.useMemo(() => [
    { title: 'Today', period: { since: today, until: today } },
    { title: 'Yesterday', period: { since: yesterday, until: yesterday } },
    { title: 'Last 7 days', period: { since: new Date(new Date(today).setDate(today.getDate() - 6)), until: today } },
    { title: 'Last 30 days', period: { since: new Date(new Date(today).setDate(today.getDate() - 29)), until: today } },
    { title: 'Last 90 days', period: { since: new Date(new Date(today).setDate(today.getDate() - 89)), until: today } },
    { title: 'This month', period: { since: new Date(today.getFullYear(), today.getMonth(), 1), until: today } },
    {
      title: 'Last month',
      period: {
        since: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        until: new Date(today.getFullYear(), today.getMonth(), 0),
      },
    },
    { title: 'Custom range', period: { since: start, until: end } },
  ], [today, yesterday, start, end]);

  const [tempRange, setTempRange] = React.useState({ since: start, until: end });
  const [selecting, setSelecting] = React.useState(false);
  const [hoverDay, setHoverDay] = React.useState(null);

  const [sinceInput, setSinceInput] = React.useState('');
  const [untilInput, setUntilInput] = React.useState('');
  const [isSinceFocused, setIsSinceFocused] = React.useState(false);
  const [isUntilFocused, setIsUntilFocused] = React.useState(false);
  const uniqueId = React.useId().replace(/:/g, '');
  const popoverId = `date-range-popover-${uniqueId}`;

  const [viewLeft, setViewLeft] = React.useState(() => {
    const d = new Date(start);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return d;
  });

  const viewRight = React.useMemo(() => {
    const d = new Date(viewLeft);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [viewLeft]);

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatDateLabel = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateISO = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const getActiveRange = () => {
    const match = ranges.slice(0, 7).find(
      (r) => isSameDay(r.period.since, tempRange.since) && isSameDay(r.period.until, tempRange.until)
    );
    return match || ranges[7];
  };

  const activeRange = getActiveRange();

  const displayEnd = selecting && hoverDay ? hoverDay : tempRange.until;
  const displayStart = tempRange.since;
  const rangeStart = displayStart <= displayEnd ? displayStart : displayEnd;
  const rangeEnd = displayStart <= displayEnd ? displayEnd : displayStart;

  const handleSelectRange = (range) => {
    if (range.period.since) {
      setTempRange({ since: range.period.since, until: range.period.until });
      const d = new Date(range.period.until);
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
      setViewLeft(d);
    }
    setSelecting(false);
    setHoverDay(null);
  };

  const handleDayClick = (day) => {
    if (day > today) return;
    if (!selecting) {
      setTempRange({ since: day, until: day });
      setSelecting(true);
      setHoverDay(null);
    } else {
      const since = day < tempRange.since ? day : tempRange.since;
      const until = day < tempRange.since ? tempRange.since : day;
      setTempRange({ since, until });
      setSelecting(false);
      setHoverDay(null);
    }
  };

  const handleDayHover = (day) => {
    if (selecting) setHoverDay(day);
  };

  const handlePrevMonth = () => {
    setViewLeft((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewLeft((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleApply = () => {
    if (tempRange.since && tempRange.until) {
      onDateRangeSelect({ start: tempRange.since, end: tempRange.until });
    }
  };

  const handleCancel = () => {
    setTempRange({ since: start, until: end });
    setSelecting(false);
    setHoverDay(null);
  };

  const triggerLabel =
    activeRange.title === 'Custom range'
      ? `${formatDateLabel(tempRange.since)} - ${formatDateLabel(tempRange.until)}`
      : activeRange.title;

  return (
    <s-box>
      <s-button
        id="date-picker-trigger"
        commandFor={popoverId}
        icon="calendar"
        variant="secondary"
        suffixIcon="chevron-down"
        onClick={() => {
          setTempRange({ since: start, until: end });
          setSelecting(false);
          setHoverDay(null);
          const d = new Date(end);
          d.setMonth(d.getMonth() - 1);
          d.setDate(1);
          setViewLeft(d);
        }}
      >
        {triggerLabel}
      </s-button>

      <s-popover id={popoverId}>
        <s-box width="680px">
          <s-grid gridTemplateColumns="180px 1fr">

            {/* ── Sidebar ── */}
            <s-box borderColor='strong' borderWidth='none base none none'>
              <s-stack direction="block" gap="none">
                {ranges.map((range) => {
                  const isActive = activeRange.title === range.title;
                  return (
                    <s-clickable
                      background={isActive ? 'strong' : 'transparent'}
                      key={range.title}
                      padding="small-100"
                      onClick={() => handleSelectRange(range)}
                      accessibilityLabel={range.title}
                    >
                      <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
                        <s-box>
                          <s-heading>{range.title}</s-heading>
                        </s-box>
                        {isActive ? <s-icon type="check" /> : <s-icon type="chevron-right" />}
                      </s-grid>
                    </s-clickable>
                  );
                })}
              </s-stack>
            </s-box>

            {/* ── Right panel ── */}
            <s-box padding='base'>
              <s-stack direction="block" gap="base">
                <s-grid gridTemplateColumns="1fr auto 1fr auto" alignItems="center" gap="small-100">
                  <s-text-field
                    labelHidden
                    value={isSinceFocused ? sinceInput : formatDateLabel(tempRange.since)}
                    inlineSize="fill"
                    onFocus={() => {
                      setSinceInput(formatDateISO(tempRange.since));
                      setIsSinceFocused(true);
                    }}
                    onInput={(e) => setSinceInput(e.currentTarget.value)}
                    onBlur={() => {
                      setIsSinceFocused(false);
                      const d = parseDate(sinceInput);
                      if (d) {
                        setTempRange((prev) => ({ ...prev, since: d }));
                      }
                    }}
                  />
                  <s-icon type="arrow-right" size="small" />
                  <s-text-field
                    labelHidden
                    value={isUntilFocused ? untilInput : formatDateLabel(tempRange.until)}
                    inlineSize="fill"
                    onFocus={() => {
                      setUntilInput(formatDateISO(tempRange.until));
                      setIsUntilFocused(true);
                    }}
                    onInput={(e) => setUntilInput(e.currentTarget.value)}
                    onBlur={() => {
                      setIsUntilFocused(false);
                      const d = parseDate(untilInput);
                      if (d) {
                        setTempRange((prev) => ({ ...prev, until: d }));
                      }
                    }}
                  />
                </s-grid>

                {/* Dual calendars */}
                <s-box>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="large">
                    {[viewLeft, viewRight].map((monthDate, idx) => (
                      <CalendarMonth
                        key={idx}
                        monthDate={monthDate}
                        today={today}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        isSameDay={isSameDay}
                        onDayClick={handleDayClick}
                        onDayHover={handleDayHover}
                        showPrev={idx === 0}
                        showNext={idx === 1}
                        onPrev={handlePrevMonth}
                        onNext={handleNextMonth}
                      />
                    ))}
                  </s-grid>
                </s-box>

              </s-stack>
            </s-box>

          </s-grid>

          <s-divider />

          <s-stack direction="inline" justifyContent="end" gap="base" padding="base">
            <s-button onClick={handleCancel} commandFor={popoverId} command="--hide">Cancel</s-button>
            <s-button variant="primary" onClick={handleApply} commandFor={popoverId} command="--hide">Apply</s-button>
          </s-stack>
        </s-box>
      </s-popover>
    </s-box>
  );
};

// ─────────────────────────────────────────────
// Sub-component: single month calendar
// ─────────────────────────────────────────────
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarMonth({
  monthDate, today, rangeStart, rangeEnd,
  isSameDay, onDayClick, onDayHover,
  showPrev, showNext, onPrev, onNext,
}) {
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const weeks = React.useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startDay = new Date(first);
    startDay.setDate(1 - startDay.getDay());

    const rows = [];
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(startDay);
        day.setDate(startDay.getDate() + w * 7 + d);
        week.push(day);
      }
      rows.push(week);
    }
    return rows;
  }, [monthDate]);

  return (
    <s-stack direction="block">
      {/* Month header */}
      {showPrev &&
        <s-grid gridTemplateColumns="auto 1fr" alignItems="center">
          <s-stack direction="block" alignItems="start">
            <s-button variant="tertiary" icon="chevron-left" size="slim" onClick={onPrev} accessibilityLabel="Previous month" />
          </s-stack>
          <s-stack direction="block" alignItems="center">
            <s-text variant="headingSm" alignment="center">{monthName}</s-text>
          </s-stack>
        </s-grid>
      }
      {showNext &&
        <s-grid gridTemplateColumns="1fr auto" alignItems="center">
          <s-stack direction="block" alignItems="center">
            <s-text variant="headingSm" alignment="center">{monthName}</s-text>
          </s-stack>
          <s-stack direction="block" alignItems="end">
            <s-button variant="tertiary" icon="chevron-right" size="slim" onClick={onNext} accessibilityLabel="Next month" />
          </s-stack>
        </s-grid>
      }

      {/* Weekday headers */}
      <s-grid gridTemplateColumns="repeat(7, 1fr)">
        {WEEKDAYS.map((wd) => (
          <s-box key={wd} padding="small-100">
            <s-text variant="bodySm" alignment="center" tone="subdued">{wd}</s-text>
          </s-box>
        ))}
      </s-grid>

      {/* Day rows */}
      {weeks.map((week, wi) => (
        <s-grid key={wi} gridTemplateColumns="repeat(7, 1fr)" gap='none'>
          {week.map((day, di) => {
            const inMonth = day.getMonth() === monthDate.getMonth();
            const isFuture = day > today;
            // ✅ inMonth check added to all 3
            const isStart = isSameDay(day, rangeStart) && inMonth;
            const isEnd = isSameDay(day, rangeEnd) && inMonth;
            const inRange = day > rangeStart && day < rangeEnd && inMonth;
            const isToday = isSameDay(day, today);
            const disabled = !inMonth || isFuture;

            return (
              <div
                key={di}
                style={{
                  cursor: disabled ? 'default' : 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isStart || isEnd
                    ? 'var(--p-color-bg-fill-brand-selected)'
                    : inRange
                      ? 'var(--p-color-bg-surface-brand-selected)'
                      : '',
                  opacity: disabled ? 0.4 : 1,
                  fontWeight: isToday && !isStart && !isEnd ? 'bold' : 'normal',
                  color: isStart || isEnd ? 'white' : 'inherit',
                  borderRadius: isStart && isEnd ? '10px' : isStart ? '10px 0 0 10px' : isEnd ? '0 10px 10px 0' : '0',
                  userSelect: 'none',
                  padding: '8px',
                }}
                onClick={disabled ? undefined : () => onDayClick(day)}
                onMouseEnter={disabled ? undefined : () => onDayHover(day)}
                aria-label={day.toDateString()}
                aria-disabled={disabled}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={disabled ? undefined : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') onDayClick(day);
                }}
              >
                {inMonth ? day.getDate() : ''}
              </div>
            );
          })}
        </s-grid>
      ))}
    </s-stack>
  );
}