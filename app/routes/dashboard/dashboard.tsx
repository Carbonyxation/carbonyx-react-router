import "chart.js/auto";
import { Bar } from "react-chartjs-2";
import { css } from "carbonyxation/css";
import { flex, hstack } from "carbonyxation/patterns";
import Indicator from "~/components/indicator";
import type { Route } from "./+types/dashboard";
import { provideData } from "~/utils/emission-provider.server";
import { Suspense, useState, useEffect, useRef } from "react";
import { monthlyOptions, yearlyOptions } from "~/utils/chart-options";
import {
  formatMonthYear,
  getYearRange,
  getPreviousYearRange,
} from "~/utils/time-utils";
import { Await } from "react-router";
import { button } from "~/components/button";

import MonthYearRangePicker,{ type DateOption, type DateRange } from "~/components/monthyearpicker";
import { format } from "date-fns";
import { getAuth } from "~/utils/auth-helper";

export function loader(args: Route.LoaderArgs) {
  const auth = getAuth(args);
  const orgId = auth.then(auth => auth.orgId);

  const data = orgId.then(id => provideData(id ?? ""));

  return data;
}

export default function Dashboard({ loaderData: data }: Route.ComponentProps) {
  const [monthYear, setMonthYear] = useState<"month" | "year">("month");

  // Use refs to track valid start and end dates
  const validStartDateRef = useRef<Date | null>(null);
  const validEndDateRef = useRef<Date | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  const handleRangeChange = (range: DateRange) => {
    validStartDateRef.current = range.startDate?.date || null;
    validEndDateRef.current = range.endDate?.date || null;

    setDateRange(range);

    if (range.startDate && range.endDate) {
      console.log('Range changed:', {
        startDate: range.startDate.value.toISOString(),
        endDate: range.endDate.value.toISOString()
      });
      // Do something with the selected range
    }
  };

  useEffect(() => {
    validStartDateRef.current = dateRange.startDate?.date
    validEndDateRef.current = dateRange.endDate?.date
  }, [dateRange])

  // Set default start and end dates to the current year
  useEffect(() => {
    const now = new Date();
    const yearRange = getYearRange(now);
    const initialStartDate = new Date(yearRange.start);
    const initialEndDate = new Date(yearRange.end);

    const startDateOption: DateOption = {
      date: initialStartDate,
      value: initialStartDate,
      label: `From: ${format(initialStartDate, 'MMM yyyy')}`,
      isStart: true
    }

    const endDateOption: DateOption = {
      date: initialEndDate,
      value: initialEndDate,
      label: `To: ${format(initialEndDate, 'MMM yyyy')}`
    }

    setDateRange({
      startDate: startDateOption,
      endDate: endDateOption
    })

    validStartDateRef.current = initialStartDate;
    validEndDateRef.current = initialEndDate;
  }, []);

  // --- Handle Date Range Selection ---
  // --- Handle Date Input Changes ---
  const getFilteredData = (dashboardData, monthYearView) => {
    // Use valid dates from refs for filtering
    if (!validStartDateRef.current || !validEndDateRef.current) {
      return monthYearView === "month"
        ? dashboardData.monthly.allMonths
        : dashboardData.yearly.allYears;
    }
    const startTimestamp = validStartDateRef.current.getTime() / 1000;
    const endTimestamp = validEndDateRef.current.getTime() / 1000;
    if (monthYearView === "month") {
      const labels = dashboardData.monthly.allMonths.labels
        .filter((label) => {
          const date = new Date(label + "-01");
          const timestamp = date.getTime() / 1000;
          return timestamp >= startTimestamp && timestamp <= endTimestamp;
        })
        .map((label) =>
          formatMonthYear(new Date(label + "-01").getTime() / 1000),
        );
      const filteredMonths = dashboardData.monthly.allMonths.datasets.map((dataset) => ({
        ...dataset,
        data: dataset.data
          .filter((d) => {
            const date = new Date(d.month + "-01");
            const timestamp = date.getTime() / 1000;
            return timestamp >= startTimestamp && timestamp <= endTimestamp;
          })
          .map((d) => ({
            x: formatMonthYear(new Date(d.month + "-01").getTime() / 1000),
            y: d.emissions,
          })),
      }));
      return {
        labels,
        datasets: filteredMonths,
      };
    } else {
      const labels = dashboardData.yearly.allYears.labels.filter((label) => {
        const year = parseInt(label);
        const yearStart = new Date(year, 0, 1).getTime() / 1000;
        const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime() / 1000;
        return yearStart >= startTimestamp && yearEnd <= endTimestamp;
      });
      const filteredYears = dashboardData.yearly.allYears.datasets.map((dataset) => ({
        ...dataset,
        data: dataset.data
          .filter((d) => {
            const year = parseInt(d.month);
            const yearStart = new Date(year, 0, 1).getTime() / 1000;
            const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime() / 1000;
            return yearStart >= startTimestamp && yearEnd <= endTimestamp;
          })
          .map((d) => ({
            x: d.month,
            y: d.emissions,
          })),
      }));
      return {
        labels,
        datasets: filteredYears,
      };
    }
  };

  return (
    <div
      className={flex({
        w: "full",
        p: 4,
        flexDirection: "column",
        gap: 4,
        h: "full",
      })}
    >
      <div className={hstack({
        justifyContent: "space-between"
      })}>
        <span
          className={css({
            fontSize: "xl",
            fontWeight: "bold",
          })}
        >
          Emission Dashboard
        </span>
        <div className={flex({
          justifyContent: 'center',
          alignItems: 'start',
          gap: 4
        })}>
          <MonthYearRangePicker value={dateRange} onChange={handleRangeChange} />

          <button
            onClick={() =>
              setMonthYear((prev) => (prev === "month" ? "year" : "month"))
            }
            className={button({
              color: 'primary',
            })}
          >
            {monthYear === 'year' ? 'Toggle Monthly' : 'Toggle Yearly'}
          </button>
        </div>

      </div>

      <div className={hstack()}>
        {/* Date Range Selection */}
        <div>
          <div className={hstack({ gap: 2, alignItems: "center" })}>
            {/*
            <div>
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="date"
                id="start-date"
                value={
                  startDate && !isNaN(startDate.getTime())
                    ? startDate.toISOString().slice(0, 10)
                    : ""
                }
                onChange={handleStartDateChange}
                onBlur={handleStartDateBlur}
                className={css({
                  border: 1,
                  borderStyle: "solid",
                  borderColor: "black",
                  padding: 2,
                  paddingX: 4,
                  rounded: "lg",
                  width: "full",
                  backgroundColor: "white",
                })}
              />
            </div>
            <div>
              <label htmlFor="end-date">End Date:</label>
              <input
                type="date"
                id="end-date"
                value={
                  endDate && !isNaN(endDate.getTime())
                    ? endDate.toISOString().slice(0, 10)
                    : ""
                }
                onChange={handleEndDateChange}
                onBlur={handleEndDateBlur}
                className={css({
                  border: 1,
                  borderStyle: "solid",
                  borderColor: "black",
                  padding: 2,
                  paddingX: 4,
                  rounded: "lg",
                  width: "full",
                  backgroundColor: "white",
                })}

              />
            </div>
            */}
          </div>
        </div>
        {/* Quick Select Buttons */}
        <div>


          {/*
          <button
            onClick={() => handleDateRangeSelect("thisYear")}
            className={css({
              bg: "gray-200",
              p: 1,
              rounded: "md",
              border: "1px solid gray",
            })}
          >
            This Year
          </button>
          <button
            onClick={() => handleDateRangeSelect("lastYear")}
            className={css({
              bg: "gray-200",
              p: 1,
              rounded: "md",
              border: "1px solid gray",
            })}
          >
            Last Year
          </button>
          <button
            onClick={() => handleDateRangeSelect("last3Months")}
            className={css({
              bg: "gray-200",
              p: 1,
              rounded: "md",
              border: "1px solid gray",
            })}
          >
            Last 3 Months
          </button>
          <button
            onClick={() => handleDateRangeSelect("last6Months")}
            className={css({
              bg: "gray-200",
              p: 1,
              rounded: "md",
              border: "1px solid gray",
            })}
          >
            Last 6 Months
          </button>
          */}

        </div>
      </div>

      {/* Use Suspense and Await for the data */}
      <Suspense fallback={<LoadingIndicators />}>
        <Await
          resolve={data}
          errorElement={<ErrorDisplay />}
        >
          {(resolvedData) => (
            <>
              <div className={hstack()}>
                <Indicator
                  id="net-emissions"
                  label="Net Emissions"
                  value={
                    monthYear === "month"
                      ? resolvedData.monthly.latestNetEmissionsTonnes
                      : resolvedData.yearly.latestNetEmissionsTonnes
                  }
                  previous={
                    monthYear === "month"
                      ? resolvedData.monthly.previousNetEmissionsTonnes
                      : resolvedData.yearly.previousNetEmissionsTonnes
                  }
                  unit="tCO₂e"
                />
                <Indicator
                  id="gross-emissions"
                  label="Gross Emissions"
                  value={
                    monthYear === "month"
                      ? resolvedData.monthly.latestGrossEmissionsTonnes
                      : resolvedData.yearly.latestGrossEmissionsTonnes
                  }
                  previous={
                    monthYear === "month"
                      ? resolvedData.monthly.previousGrossEmissionsTonnes
                      : resolvedData.yearly.previousGrossEmissionsTonnes
                  }
                  unit="tCO₂e"
                />
                <Indicator
                  id="total-offset"
                  label="Total Offset"
                  value={resolvedData.yearly.latestOffsetTonnes}
                  previous={resolvedData.yearly.previousOffsetTonnes}
                  unit="tCO₂e"
                  valueTrend="positive"
                />
              </div>
              <div
                className={flex({
                  bg: "white",
                  w: "full",
                  rounded: "2xl",
                  h: "40rem",
                  p: 4,
                  border: "1px solid",
                })}
              >
                {monthYear === "month" ? (
                  <Bar
                    key={`chart-${monthYear}-${dateRange.startDate?.date?.getTime() || 0}-${dateRange.endDate?.date?.getTime() || 0}`}
                    data={getFilteredData(resolvedData, monthYear)}
                    options={monthlyOptions}
                  />
                ) : (
                  <Bar
                    key={`chart-${monthYear}-${dateRange.startDate?.date?.getTime() || 0}-${dateRange.endDate?.date?.getTime() || 0}`}
                    data={getFilteredData(resolvedData, monthYear)}
                    options={yearlyOptions}
                  />
                )}
              </div>
            </>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

// Loading indicator component for the Suspense fallback
function LoadingIndicators() {
  return (
    <>
      <div className={hstack()}>
        <IndicatorSkeleton />
        <IndicatorSkeleton />
        <IndicatorSkeleton />
      </div>
      <div
        className={flex({
          bg: "white",
          w: "full",
          rounded: "2xl",
          h: "40rem",
          p: 4,
          border: "1px solid",
          justifyContent: "center",
          alignItems: "center",
        })}
      >
        <div>Loading chart data...</div>
      </div>
    </>
  );
}

// Error display component
function ErrorDisplay() {
  return (
    <div className={css({ p: 4, color: "red" })}>
      <h2>Error Loading Data</h2>
      <p>There was a problem loading the dashboard data. Please try again later.</p>
    </div>
  );
}

// Simple skeleton for indicators
function IndicatorSkeleton() {
  return (
    <div className={css({
      w: "full",
      p: 4,
      bg: "gray-100",
      rounded: "xl",
      m: 2,
      h: "6rem",
      animation: "pulse 1.5s infinite"
    })}>
      <div className={css({ w: "70%", h: "1rem", bg: "gray-200", mb: 2, rounded: "md" })}></div>
      <div className={css({ w: "40%", h: "2rem", bg: "gray-200", rounded: "md" })}></div>
    </div>
  );
}
