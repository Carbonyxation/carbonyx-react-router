import { useState, useEffect } from "react";
import { css } from "carbonyxation/css"; // Adjust import path for your PandaCSS setup
import {
  format,
  startOfMonth,
  subMonths,
  getYear,
  isBefore,
  isAfter,
  isSameMonth,
} from "date-fns";
import * as chrono from "chrono-node";
import Select, {
  type GroupProps,
  type OptionProps,
  components as SelectComponents,
} from "react-select";
import { vstack } from "carbonyxation/patterns";
import { toast } from "sonner";

// Define the interface for a month/year option
export interface DateOption {
  date: Date;
  value: Date;
  label: string;
  display?: string;
  isStart?: boolean;
  isEnd?: boolean;
}

// Define the interface for date range
interface DateRange {
  startDate: DateOption | null;
  endDate: DateOption | null;
}

// Create an option for a month/year
const createMonthOption = (d: Date) => {
  // Set to first day of month at 00:00 UTC
  const adjustedDate = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
  );
  return {
    date: adjustedDate,
    value: adjustedDate,
    label: format(adjustedDate, "MMMM yyyy"),
  };
};

// Create default options (three most recent past months, excluding current month)
const getDefaultOptions = () => {
  const now = new Date();
  const currentMonth = startOfMonth(now);
  const oneMonthAgo = subMonths(currentMonth, 1);
  const twoMonthsAgo = subMonths(currentMonth, 2);
  const threeMonthsAgo = subMonths(currentMonth, 3);

  // Sort chronologically (most recent first)
  const options = [
    createMonthOption(oneMonthAgo),
    createMonthOption(twoMonthsAgo),
    createMonthOption(threeMonthsAgo),
  ];

  return options;
};

// Create a set of months for a given year (filtering out future months)
const createYearMonthsGroup = (year = new Date().getFullYear()) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Determine how many months to include from this year
  let monthsToInclude = 12;
  if (year === currentYear) {
    // For current year, only include past months (excluding current month)
    monthsToInclude = currentMonth;
  }

  // If this is a future year, don't include any months
  if (year > currentYear) {
    return {
      label: `${year}`,
      options: [],
    };
  }

  const months = Array.from({ length: monthsToInclude }, (_, i) => {
    const d = new Date(year, i, 1);
    return { ...createMonthOption(d), display: "month-grid" };
  });

  return {
    label: `${year}`,
    options: months,
  };
};

// Suggestions for natural language parsing
const suggestions = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "this month",
  "next month",
  "last month",
  "this year",
  "next year",
  "last year",
].reduce<{ [key: string]: string }>((acc, str) => {
  for (let i = 1; i < str.length; i++) {
    acc[str.substr(0, i)] = str;
  }
  return acc;
}, {});

const suggest = (str: string) =>
  str
    .split(/\b/)
    .map((i) => suggestions[i] || i)
    .join("");

// Custom Group component for displaying months in a grid
const Group = (props: GroupProps<DateOption, false>) => {
  const {
    Heading,
    getStyles,
    children,
    label,
    headingProps,
    cx,
    theme,
    selectProps,
  } = props;
  return (
    <div
      aria-label={label as string}
      className={css({
        margin: "8px 0",
        paddingBottom: "8px",
      })}
    >
      <Heading
        selectProps={selectProps}
        theme={theme}
        getStyles={getStyles}
        getClassNames={cx}
        cx={cx}
        {...headingProps}
      >
        {label}
      </Heading>
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          padding: "8px 0",
        })}
      >
        {children}
      </div>
    </div>
  );
};

// Custom Option component for displaying months in a grid
const Option = (props: OptionProps<DateOption, false>) => {
  const { data, innerRef, innerProps, isSelected } = props;
  if (data.display === "month-grid") {
    return (
      <div
        {...innerProps}
        ref={innerRef}
        className={css({
          padding: "6px 10px",
          textAlign: "center",
          cursor: "pointer",
          borderRadius: "4px",
          backgroundColor: isSelected ? "blue.500" : "transparent",
          color: isSelected ? "white" : "inherit",
          _hover: {
            backgroundColor: isSelected ? "blue.600" : "blue.100",
          },
        })}
      >
        {format(data.date, "MMM")}
      </div>
    );
  } else {
    return <SelectComponents.Option {...props} />;
  }
};

// Custom MultiValueLabel to show range
const MultiValueLabel = ({ data }: any) => {
  return (
    <div className={css({ padding: "2px 6px" })}>
      {data.isStart ? "From: " : data.isEnd ? "To: " : ""}
      {data.label}
    </div>
  );
};

// Custom Control component to add the X button when selecting end date
const Control = ({ children, ...props }: any) => {
  const { selectProps } = props;
  const { value, onChange, isSelectingEnd } = selectProps;
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };
  const shouldShowClearButton = isSelectingEnd && value;
  return (
    <SelectComponents.Control {...props}>
      {children}
      {shouldShowClearButton && (
        <div
          onClick={handleClear}
          className={css({
            padding: "8px",
            cursor: "pointer",
            color: "gray.500",
            _hover: { color: "red.500" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          })}
          aria-label="Clear selection"
          title="Clear selection"
        >
          ✕
        </div>
      )}
    </SelectComponents.Control>
  );
};

interface MonthRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const MonthYearRangePicker = ({ value, onChange }: MonthRangePickerProps) => {
  const defaultOptions = getDefaultOptions();
  const currentYear = new Date().getFullYear();

  // Generate 5 historical years in chronological order (most recent first)
  const historicalYears = Array.from(
    { length: 5 },
    (_, i) => currentYear - i - 1,
  ).sort((a, b) => b - a); // Sort most recent first

  const [options, setOptions] = useState<any[]>([
    ...defaultOptions,
    ...historicalYears.map((year) => createYearMonthsGroup(year)),
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);

  // Helper function to check if a date is in the future or current month
  const isInvalidFutureDate = (date: Date) => {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    return !isBefore(date, currentMonth); // Invalid if not before current month
  };

  // Handle input change for natural language processing
  const handleInputChange = (input: string) => {
    setInputValue(input);
    if (!input) {
      // Reset to default options when input is cleared
      setOptions([
        ...defaultOptions,
        ...historicalYears.map((year) => createYearMonthsGroup(year)),
      ]);
      return;
    }

    try {
      // Try to parse the input as a date using chrono
      const suggestedInput = suggest(input.toLowerCase());
      const parsedDate = chrono.parseDate(suggestedInput);

      if (parsedDate) {
        const month = startOfMonth(parsedDate);

        // Skip if it's current month or future
        if (isInvalidFutureDate(month)) {
          setOptions([
            ...defaultOptions,
            ...historicalYears.map((year) => createYearMonthsGroup(year)),
          ]);
          return;
        }

        const monthOption = createMonthOption(month);

        // If we're selecting the end date, make sure it's after start date
        if (isSelectingEnd && value.startDate) {
          if (isBefore(month, value.startDate.date)) {
            return; // Don't suggest dates before start date
          }
        }

        // Find which year groups to show
        const year = getYear(month);
        const surroundingYears = [year - 2, year - 1, year].filter(
          (y) => y <= currentYear - 1,
        );

        setOptions([
          monthOption,
          ...surroundingYears.map((y) => createYearMonthsGroup(y)),
        ]);
      } else {
        // If no valid date is found, show default options
        setOptions([
          ...defaultOptions,
          ...historicalYears.map((year) => createYearMonthsGroup(year)),
        ]);
      }
    } catch (error) {
      // If parsing fails, show default options
      setOptions([
        ...defaultOptions,
        ...historicalYears.map((year) => createYearMonthsGroup(year)),
      ]);
    }
  };

  // Handle selection of a date
  const handleChange = (selectedOption: DateOption | null) => {
    if (!selectedOption) {
      // If selection is cleared, reset both dates
      onChange({ startDate: null, endDate: null });
      setIsSelectingEnd(false);
      return;
    }

    // Validate selected date is not current month or in the future
    if (isInvalidFutureDate(selectedOption.date)) {
      toast.error("Cannot select current or future months", {
        position: "top-right",
      });
      return;
    }

    if (!isSelectingEnd) {
      // First selection is the start date
      const newStartDate = {
        ...selectedOption,
        isStart: true,
        label: `From: ${format(selectedOption.date, "MMM yyyy")}`,
      };
      onChange({
        startDate: newStartDate,
        endDate: null,
      });
      setIsSelectingEnd(true);
      setInputValue("");
    } else {
      // Second selection is the end date
      const startDate = value.startDate;

      // Ensure end date is after or equal to start date
      if (startDate && isBefore(selectedOption.date, startDate.date)) {
        toast.error("End date must be after start date", {
          position: "top-right",
        });
        return;
      }

      const newEndDate = {
        ...selectedOption,
        isEnd: true,
        label: `To: ${format(selectedOption.date, "MMM yyyy")}`,
      };

      onChange({
        startDate: startDate,
        endDate: newEndDate,
      });

      setIsSelectingEnd(false);
    }
  };

  // Reset selection phase if values change externally
  useEffect(() => {
    if (!value.startDate) {
      setIsSelectingEnd(false);
    }
  }, [value]);

  // Format the placeholder based on selection state
  const getPlaceholder = () => {
    if (!value.startDate) {
      return "Select start month...";
    }
    if (isSelectingEnd) {
      return "Select end month...";
    }
    if (value.startDate && value.endDate) {
      return `${format(value.startDate.date, "MMM yyyy")} - ${format(value.endDate.date, "MMM yyyy")}`;
    }
    return "Select month range...";
  };

  // Format value for display
  const getDisplayValue = () => {
    if (isSelectingEnd && value.startDate) {
      // Show only start date when selecting end date
      return value.startDate;
    }
    if (value.startDate && value.endDate) {
      // When both dates are selected, show as one value
      return {
        label: `${format(value.startDate.date, "MMM yyyy")} - ${format(value.endDate.date, "MMM yyyy")}`,
        value: "range",
        date: value.startDate.date,
      };
    }
    // Otherwise return null to show placeholder
    return null;
  };

  return (
    <div
      className={vstack({
        width: "100%",
        minWidth: "14rem",
        gap: 0,
      })}
    >
      <Select
        inputId="month-range"
        components={{
          Group,
          Option,
          MultiValueLabel,
          Control, // Use our custom control with X button
        }}
        filterOption={null}
        isMulti={false}
        placeholder={getPlaceholder()}
        value={getDisplayValue()}
        inputValue={inputValue}
        onChange={handleChange as any}
        onInputChange={handleInputChange}
        options={options}
        maxMenuHeight={380}
        className={css({
          width: "100%",
        })}
        styles={{
          control: (base) => ({
            ...base,
            borderColor: "black",
            ":active": {
              outlineColor: "green",
            },
            minHeight: "42px",
          }),
          menu: (base) => ({
            ...base,
            zIndex: 10,
          }),
        }}
        // Pass isSelectingEnd as a custom prop to our Control component
        isSelectingEnd={isSelectingEnd}
      />
      {isSelectingEnd && value.startDate && (
        <div
          className={css({
            marginTop: "8px",
            fontSize: "sm",
            color: "blue.600",
          })}
        >
          Now select end month (must be after{" "}
          {format(value.startDate.date, "MMM yyyy")}) or click ✕ to reset
        </div>
      )}
    </div>
  );
};

export default MonthYearRangePicker;
export type { DateRange };
