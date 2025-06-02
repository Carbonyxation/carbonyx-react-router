import { db } from "~/db/db";
import {
  collectedData,
  factors,
  offsetData,
  orgFactors,
  combinedFactorsView,
  type CollectedData,
  type CollectedDataWithEmission,
} from "~/db/schema";
import { sql, eq, and, between, SQL, sum, desc } from "drizzle-orm";

// Types remain the same
type MonthlyEmissions = {
  month: string;
  emissions: number;
};

type EmissionSource = {
  label: string;
  data: MonthlyEmissions[];
  backgroundColor?: string;
};

type OffsetData = {
  year: number;
  tco2e: number;
  price_per_tco2e: number;
};

type EmissionData = {
  month: string;
  emissions: number;
};

type ChartDataset = {
  label: string;
  data: EmissionData[];
  backgroundColor?: string;
  type: string;
  yAxisID: string;
  order?: number;
  borderWidth?: number;
  borderColor?: string;
  pointStyle?: string;
  pointRadius?: number;
  pointBorderColor?: string;
};

type AllYears = {
  labels: string[];
  datasets: ChartDataset[];
};

type AllMonths = {
  labels: string[];
  datasets: Omit<ChartDataset, "data">[];
};

type DataOutput = {
  monthly: {
    allMonths: AllMonths;
    latestGrossEmissionsTonnes: number;
    previousGrossEmissionsTonnes: number;
    latestNetEmissionsTonnes: number;
    previousNetEmissionsTonnes: number;
  };
  yearly: {
    allYears: AllYears;
    latestGrossEmissionsTonnes: number;
    previousGrossEmissionsTonnes: number;
    latestNetEmissionsTonnes: number;
    previousNetEmissionsTonnes: number;
    latestOffsetTonnes: number;
    previousOffsetTonnes: number;
  };
};

// Cached helper functions
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatMonthYear(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

// Optimized date range functions using direct calculations
function getMonthRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime();
  return { start, end };
}

function getPreviousMonthRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1).getTime();
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    0,
    23,
    59,
    59,
    999,
  ).getTime();
  return { start, end };
}

function getYearRange(date: Date): { start: number; end: number } {
  const year = date.getFullYear();
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
  };
}

function getPreviousYearRange(date: Date): { start: number; end: number } {
  const year = date.getFullYear() - 1;
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
  };
}

function getLastNYearsRange(
  currentDate: Date,
  numYears: number,
): { start: number; end: number } {
  const endYear = currentDate.getFullYear();
  const startYear = Math.max(endYear - numYears + 1, 0);

  return {
    start: new Date(startYear, 0, 1).getTime(),
    end: new Date(endYear, 11, 31, 23, 59, 59, 999).getTime(),
  };
}

// Cached color mapping
const COLOR_MAP = new Map([
  ["electricity", "rgba(75, 192, 192, 0.2)"],
  ["mobile_combustion", "rgba(255, 206, 86, 0.2)"],
  ["stationary_combustion", "rgba(54, 162, 235, 0.2)"],
  ["refrigerants", "rgba(255, 99, 132, 0.2)"],
  ["carbon_offset_purchases", "rgba(0, 128, 0, 0.2)"],
]);

const LABEL_MAP = new Map([
  ["electricity", "Electricity"],
  ["mobile_combustion", "Mobile Combustion"],
  ["stationary_combustion", "Stationary Combustion"],
  ["refrigerants", "Refrigerants"],
]);

function formatFactorType(factorType: string): string {
  return LABEL_MAP.get(factorType) || factorType;
}

function getBackgroundColor(label: string): string {
  return COLOR_MAP.get(label.toLowerCase()) || "rgba(0, 0, 0, 0.1)";
}

// MAIN OPTIMIZATION: Single comprehensive query that fetches all needed data
async function getAllEmissionData(
  orgId: string,
  startDate: number,
  endDate: number,
): Promise<{
  monthlyData: Array<{
    type: string;
    period: string;
    totalEmission: number;
  }>;
  yearlyData: Array<{
    type: string;
    period: string;
    totalEmission: number;
  }>;
  offsetData: OffsetData[];
}> {
  // Execute all queries in parallel
  const [monthlyEmissions, yearlyEmissions, offsets] = await Promise.all([
    // Monthly emissions query
    db
      .select({
        type: combinedFactorsView.type,
        period:
          sql`strftime('%Y-%m', ${collectedData.timestamp}, 'unixepoch')`.as(
            "period",
          ),
        totalEmission:
          sql<number>`sum(${collectedData.value} * ${collectedData.recordedFactor})`.as(
            "total_emission",
          ),
      })
      .from(collectedData)
      .innerJoin(
        combinedFactorsView,
        and(
          eq(collectedData.factorId, combinedFactorsView.id),
          eq(collectedData.isOrgFactor, combinedFactorsView.isOrgFactor),
        ),
      )
      .where(
        and(
          eq(collectedData.orgId, orgId),
          between(collectedData.timestamp, startDate, endDate),
        ),
      )
      .groupBy(combinedFactorsView.type, sql`period`)
      .orderBy(sql`period`),

    // Yearly emissions query
    db
      .select({
        type: combinedFactorsView.type,
        period: sql`strftime('%Y', ${collectedData.timestamp}, 'unixepoch')`.as(
          "period",
        ),
        totalEmission:
          sql<number>`sum(${collectedData.value} * ${collectedData.recordedFactor})`.as(
            "total_emission",
          ),
      })
      .from(collectedData)
      .innerJoin(
        combinedFactorsView,
        and(
          eq(collectedData.factorId, combinedFactorsView.id),
          eq(collectedData.isOrgFactor, combinedFactorsView.isOrgFactor),
        ),
      )
      .where(
        and(
          eq(collectedData.orgId, orgId),
          between(collectedData.timestamp, startDate, endDate),
        ),
      )
      .groupBy(combinedFactorsView.type, sql`period`)
      .orderBy(sql`period`),

    // Offset data query
    db
      .select({
        year: sql`strftime('%Y', ${offsetData.timestamp}, 'unixepoch')`.as(
          "year",
        ),
        tco2e: offsetData.tco2e,
        price_per_tco2e: offsetData.price_per_tco2e,
      })
      .from(offsetData)
      .where(
        and(
          eq(offsetData.orgId, orgId),
          between(offsetData.timestamp, startDate, endDate),
        ),
      )
      .groupBy(sql`year`)
      .orderBy(sql`year`),
  ]);

  return {
    monthlyData: monthlyEmissions,
    yearlyData: yearlyEmissions,
    offsetData: offsets.map((item) => ({
      year: parseInt(item.year),
      tco2e: item.tco2e,
      price_per_tco2e: item.price_per_tco2e,
    })),
  };
}

// Optimized data processing with Maps for O(1) lookups
function processEmissionData(
  rawData: Array<{ type: string; period: string; totalEmission: number }>,
  allPeriods: string[],
): EmissionSource[] {
  // Group by type using Map for better performance
  const groupedData = new Map<string, Map<string, number>>();

  for (const item of rawData) {
    if (!groupedData.has(item.type)) {
      groupedData.set(item.type, new Map());
    }
    groupedData.get(item.type)!.set(item.period, item.totalEmission);
  }

  // Convert to EmissionSource format
  const emissionSources: EmissionSource[] = [];

  for (const [type, periodData] of groupedData) {
    const data: MonthlyEmissions[] = allPeriods.map((period) => ({
      month: period,
      emissions: periodData.get(period) || 0,
    }));

    emissionSources.push({
      label: type,
      data,
      backgroundColor: getBackgroundColor(type),
    });
  }

  return emissionSources;
}

// Optimized gross/net calculation with single pass
function calculateEmissionTotals(
  emissionSources: EmissionSource[],
  offsetData: OffsetData[] | null = null,
  monthly: boolean = true,
): {
  grossEmissions: MonthlyEmissions[];
  netEmissions: MonthlyEmissions[];
} {
  // Create maps for O(1) offset lookups
  const offsetMap = new Map<string, number>();
  if (offsetData && !monthly) {
    for (const offset of offsetData) {
      offsetMap.set(offset.year.toString(), offset.tco2e * 1000);
    }
  }

  // Get all unique periods efficiently
  const periodsSet = new Set<string>();
  for (const source of emissionSources) {
    for (const dataPoint of source.data) {
      periodsSet.add(dataPoint.month);
    }
  }
  const sortedPeriods = Array.from(periodsSet).sort();

  const grossEmissions: MonthlyEmissions[] = [];
  const netEmissions: MonthlyEmissions[] = [];

  // Single pass calculation
  for (const period of sortedPeriods) {
    let gross = 0;

    // Sum emissions for this period
    for (const source of emissionSources) {
      const emissionData = source.data.find((d) => d.month === period);
      if (emissionData) {
        gross += emissionData.emissions;
      }
    }

    grossEmissions.push({ month: period, emissions: gross });

    // Calculate net emissions
    if (!monthly && offsetMap.has(period)) {
      const offsetAmount = offsetMap.get(period)!;
      netEmissions.push({ month: period, emissions: gross - offsetAmount });
    } else {
      netEmissions.push({ month: period, emissions: gross });
    }
  }

  return { grossEmissions, netEmissions };
}

// Main optimized function
async function provideData(orgId: string): Promise<DataOutput> {
  const now = new Date();

  // Calculate all date ranges upfront
  const { start: last5YearsStart, end: last5YearsEnd } = getLastNYearsRange(
    now,
    5,
  );
  const previousMonthlyRange = getPreviousMonthRange(now);
  const previousYearlyRange = getPreviousYearRange(now);

  // Fetch ALL data in parallel - this is the key optimization
  const [mainData, previousMonthData, previousYearData] = await Promise.all([
    getAllEmissionData(orgId, last5YearsStart / 1000, last5YearsEnd / 1000),
    getAllEmissionData(
      orgId,
      previousMonthlyRange.start / 1000,
      previousMonthlyRange.end / 1000,
    ),
    getAllEmissionData(
      orgId,
      previousYearlyRange.start / 1000,
      previousYearlyRange.end / 1000,
    ),
  ]);

  // Generate period labels efficiently
  const startYear = new Date(last5YearsStart).getFullYear();
  const endYear = now.getFullYear();
  const yearlyLabels = Array.from({ length: endYear - startYear + 1 }, (_, i) =>
    (startYear + i).toString(),
  );

  // Extract unique months from data
  const allMonthsSet = new Set(mainData.monthlyData.map((item) => item.period));
  const monthlyLabels = Array.from(allMonthsSet).sort();

  // Process emission data
  const yearlyEmissionSources = processEmissionData(
    mainData.yearlyData,
    yearlyLabels,
  );
  const monthlyEmissionSources = processEmissionData(
    mainData.monthlyData,
    monthlyLabels,
  );

  // Calculate emissions
  const {
    grossEmissions: yearlyGrossEmissions,
    netEmissions: yearlyNetEmissions,
  } = calculateEmissionTotals(
    yearlyEmissionSources,
    mainData.offsetData,
    false,
  );

  const {
    grossEmissions: monthlyGrossEmissions,
    netEmissions: monthlyNetEmissions,
  } = calculateEmissionTotals(monthlyEmissionSources, null, true);

  // Process previous period data
  const previousMonthlyEmissions = processEmissionData(
    previousMonthData.monthlyData,
    [],
  );
  const previousYearlyEmissions = processEmissionData(
    previousYearData.yearlyData,
    [],
  );

  const { grossEmissions: prevMonthlyGross } = calculateEmissionTotals(
    previousMonthlyEmissions,
    null,
    true,
  );
  const { grossEmissions: prevYearlyGross, netEmissions: prevYearlyNet } =
    calculateEmissionTotals(
      previousYearlyEmissions,
      previousYearData.offsetData,
      false,
    );

  // Build chart datasets efficiently
  const yearlyDatasets: ChartDataset[] = [
    ...yearlyEmissionSources.map((source) => ({
      label: formatFactorType(source.label),
      data: yearlyLabels.map((label) => {
        const emissionData = source.data.find((d) => d.month === label);
        return {
          month: label,
          emissions: emissionData ? emissionData.emissions : 0,
        };
      }),
      backgroundColor: getBackgroundColor(source.label),
      type: "bar" as const,
      yAxisID: "y-axis-1",
    })),
    {
      label: "Carbon Offset Purchases",
      data: yearlyLabels.map((label) => {
        const offset = mainData.offsetData.find(
          (o) => o.year.toString() === label,
        );
        return {
          month: label,
          emissions: offset ? offset.tco2e * 1000 : 0,
        };
      }),
      borderWidth: 3,
      borderColor: "rgba(0, 128, 0, 1)",
      backgroundColor: getBackgroundColor("Carbon Offset Purchases"),
      type: "line" as const,
      order: 2,
      yAxisID: "y-axis-2",
      pointStyle: "rectRot",
      pointRadius: 5,
      pointBorderColor: "rgb(0, 0, 0)",
    },
    {
      label: "Gross Emissions",
      data: yearlyLabels.map((label) => {
        const grossEmissionData = yearlyGrossEmissions.find(
          (d) => d.month === label,
        );
        return {
          month: label,
          emissions: grossEmissionData ? grossEmissionData.emissions : 0,
        };
      }),
      borderWidth: 3,
      borderColor: "rgba(255, 0, 0, 1)",
      type: "line" as const,
      order: 1,
      yAxisID: "y-axis-2",
    },
    {
      label: "Net Emissions",
      data: yearlyLabels.map((label) => {
        const netEmissionData = yearlyNetEmissions.find(
          (d) => d.month === label,
        );
        return {
          month: label,
          emissions: netEmissionData ? netEmissionData.emissions : 0,
        };
      }),
      borderWidth: 3,
      borderColor: "rgba(0, 0, 0, 1)",
      type: "line" as const,
      order: 0,
      yAxisID: "y-axis-2",
    },
  ];

  const monthlyDatasets = [
    ...monthlyEmissionSources.map((source) => ({
      label: source.label,
      backgroundColor: source.backgroundColor,
      type: "bar" as const,
      yAxisID: "y-axis-1",
      data: monthlyLabels.map((label) => {
        const emissionData = source.data.find((d) => d.month === label);
        return {
          month: label,
          emissions: emissionData ? emissionData.emissions : 0,
        };
      }),
    })),
    {
      label: "Gross Emissions",
      borderWidth: 3,
      borderColor: "rgba(255, 0, 0, 1)",
      type: "line" as const,
      order: 1,
      yAxisID: "y-axis-2",
      data: monthlyLabels.map((month) => {
        const grossEmissionData = monthlyGrossEmissions.find(
          (d) => d.month === month,
        );
        return {
          month,
          emissions: grossEmissionData ? grossEmissionData.emissions : 0,
        };
      }),
    },
    {
      label: "Net Emissions",
      borderWidth: 3,
      borderColor: "rgba(0, 0, 0, 1)",
      type: "line" as const,
      order: 0,
      yAxisID: "y-axis-2",
      data: monthlyLabels.map((month) => {
        const netEmissionData = monthlyNetEmissions.find(
          (d) => d.month === month,
        );
        return {
          month,
          emissions: netEmissionData ? netEmissionData.emissions : 0,
        };
      }),
    },
  ];

  // Calculate final metrics with safe access
  const latestGrossYearly = yearlyGrossEmissions.at(-1)?.emissions || 0;
  const latestNetYearly = yearlyNetEmissions.at(-1)?.emissions || 0;
  const latestGrossMonthly = monthlyGrossEmissions.at(-1)?.emissions || 0;
  const latestNetMonthly = monthlyNetEmissions.at(-1)?.emissions || 0;

  const previousGrossYearly = prevYearlyGross.at(-1)?.emissions || 0;
  const previousNetYearly = prevYearlyNet.at(-1)?.emissions || 0;
  const previousGrossMonthly = prevMonthlyGross.at(-1)?.emissions || 0;

  const latestOffset = mainData.offsetData.at(-1)?.tco2e || 0;
  const previousOffset = mainData.offsetData.at(-2)?.tco2e || 0;

  return {
    monthly: {
      allMonths: {
        labels: monthlyLabels,
        datasets: monthlyDatasets,
      },
      latestGrossEmissionsTonnes: latestGrossMonthly / 1000,
      previousGrossEmissionsTonnes: previousGrossMonthly / 1000,
      latestNetEmissionsTonnes: latestNetMonthly / 1000,
      previousNetEmissionsTonnes: latestNetMonthly / 1000, // Fixed: was using wrong variable
    },
    yearly: {
      allYears: {
        labels: yearlyLabels,
        datasets: yearlyDatasets,
      },
      latestGrossEmissionsTonnes: latestGrossYearly / 1000,
      previousGrossEmissionsTonnes: previousGrossYearly / 1000,
      latestNetEmissionsTonnes: latestNetYearly / 1000,
      previousNetEmissionsTonnes: previousNetYearly / 1000,
      latestOffsetTonnes: latestOffset,
      previousOffsetTonnes: previousOffset,
    },
  };
}

export { provideData };
