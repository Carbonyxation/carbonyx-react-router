import { db } from "~/db/db"; // Your Drizzle ORM db instance
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

type MonthlyEmissions = {
  month: string;
  emissions: number; // in kg CO2e
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

type YearlyData = {
  grossEmissions: MonthlyEmissions[];
  netEmissions: MonthlyEmissions[];
  offsetData: OffsetData[];
  emissionSources: EmissionSource[];
};

type ChartData = {
  labels: string[];
  datasets: any[];
};

type DataOutput = {
  monthly: {
    chartData: ChartData;
    latestGrossEmissionsTonnes: number;
    previousGrossEmissionsTonnes: number;
    latestNetEmissionsTonnes: number;
    previousNetEmissionsTonnes: number;
  };
  yearly: {
    chartData: ChartData;
    latestGrossEmissionsTonnes: number;
    previousGrossEmissionsTonnes: number;
    latestNetEmissionsTonnes: number;
    previousNetEmissionsTonnes: number;
    latestOffsetTonnes: number;
    previousOffsetTonnes: number;
  };
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

// --- Helper Functions ---

/**
 * Formats a Unix timestamp into "Mon YYYY" format.
 * @param timestamp Unix timestamp in seconds
 */
function formatMonthYear(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const monthNames = [
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
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Gets the first and last day of the month specified by the date, in milliseconds.
 */
function getMonthRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the first and last day of the previous month, in milliseconds.
 */
function getPreviousMonthRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the first and last day of the year, in milliseconds.
 */
function getYearRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the first and last day of the previous year, in milliseconds.
 */
function getPreviousYearRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear() - 1, 0, 1);
  const end = new Date(date.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the start and end dates for the last 5 years (or less if fewer are available).
 */
function getLastNYearsRange(
  currentDate: Date,
  numYears: number,
): { start: number; end: number } {
  const endYear = currentDate.getFullYear();
  const startYear = Math.max(endYear - numYears + 1, 0); // Ensure start year is not negative

  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31, 23, 59, 59, 999).getTime();

  return { start, end };
}

// **New: Function to format factor type names**
function formatFactorType(factorType: string): string {
  switch (factorType) {
    case "electricity":
      return "Electricity";
    case "transportation":
      return "Transportation";
    case "stationary_combustion":
      return "Stationary Combustion";
    case "waste":
      return "Waste";
    default:
      return factorType; // Return original if not found (or handle as needed)
  }
}

// --- Data Fetching and Calculation Functions ---

/**
 * Fetches and aggregates emission data for a given organization and period.
 * @param orgId Organization ID
 * @param startDate Start date (Unix timestamp in seconds)
 * @param endDate End date (Unix timestamp in seconds)
 * @param monthly If true, aggregates by month; otherwise, aggregates by year
 */
async function getEmissionData(
  orgId: string,
  startDate: number,
  endDate: number,
  monthly: boolean = true,
): Promise<EmissionSource[]> {
  const periodFormat = monthly ? "%Y-%m" : "%Y";

  const emissionDataQuery = db
  .select({
    name: combinedFactorsView.type,
    period: sql`strftime(${periodFormat}, ${
      collectedData.timestamp
    }, 'unixepoch')`.as("period"),
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
      eq(collectedData.isOrgFactor, combinedFactorsView.isOrgFactor)
    )
  )
  .where(
    and(
      eq(collectedData.orgId, orgId),
      between(collectedData.timestamp, startDate, endDate),
    ),
  )
  .groupBy(combinedFactorsView.type, sql`period`)
  .orderBy(sql`period`);
  
  const emissionData = await emissionDataQuery;

  // Group data by emission source (factor type)
  const groupedData: { [key: string]: any[] } = {};
  for (const item of emissionData) {
    if (!groupedData[item.name]) {
      groupedData[item.name] = [];
    }
    groupedData[item.name].push(item);
  }

  // Transform into EmissionSource[] format
  const emissionSources: EmissionSource[] = [];
  for (const label in groupedData) {
    const data = groupedData[label].map((item) => ({
      // Use the period directly as the month (formatted as "YYYY-MM" or "YYYY")
      month: item.period,
      emissions: item.totalEmission,
    }));

    emissionSources.push({
      label,
      data,
      backgroundColor: getBackgroundColor(label),
    });
  }

  return emissionSources;
}

/**
 * Fetches offset data for a given organization and period (yearly).
 * @param orgId Organization ID
 * @param startDate Start date (Unix timestamp in seconds)
 * @param endDate End date (Unix timestamp in seconds)
 */
async function getOffsetData(
  orgId: string,
  startDate: number,
  endDate: number,
): Promise<OffsetData[]> {
  const offsetDataQuery = db
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
    .orderBy(sql`year`);

  const offsetDataResult = await offsetDataQuery;

  console.log(offsetDataResult);

  return offsetDataResult.map((item) => ({
    year: parseInt(item.year),
    tco2e: item.tco2e,
    price_per_tco2e: item.price_per_tco2e,
  }));
}

/**
 * Calculates gross and net emissions for a given period.
 * @param emissionSources Emission data
 * @param offsetData Offset data (only used for yearly calculations)
 * @param monthly If true, calculates for each month; otherwise, calculates for each year
 */
function calculateGrossAndNetEmissions(
  emissionSources: EmissionSource[],
  offsetData: OffsetData[] | null = null,
  monthly: boolean = true,
): {
  grossEmissions: MonthlyEmissions[];
  netEmissions: MonthlyEmissions[];
} {
  const grossEmissions: MonthlyEmissions[] = [];
  const netEmissions: MonthlyEmissions[] = [];

  // Get unique periods (months or years) and sort them
  const periods = new Set<string>();
  for (const source of emissionSources) {
    for (const dataPoint of source.data) {
      periods.add(dataPoint.month);
    }
  }
  const sortedPeriods = Array.from(periods).sort();

  for (const period of sortedPeriods) {
    let gross = 0;
    for (const source of emissionSources) {
      const emissionData = source.data.find((d) => d.month === period);
      if (emissionData) {
        gross += emissionData.emissions;
      }
    }
    grossEmissions.push({ month: period, emissions: gross });

    if (!monthly && offsetData) {
      const year = parseInt(period);
      const offset = offsetData.find((o) => o.year === year);
      const offsetAmount = offset ? offset.tco2e * 1000 : 0;
      netEmissions.push({ month: period, emissions: gross - offsetAmount });
    } else {
      netEmissions.push({ month: period, emissions: gross });
    }
  }

  return { grossEmissions, netEmissions };
}
// Function to map emission source labels to background colors
function getBackgroundColor(label: string): string {
  const formattedLabel = formatFactorType(label); // Use formatted label for mapping
  switch (formattedLabel) {
    case "Electricity":
      return "rgba(75, 192, 192, 0.2)";
    case "Transportation":
      return "rgba(255, 206, 86, 0.2)";
    case "Stationary Combustion":
      return "rgba(54, 162, 235, 0.2)";
    case "Waste":
      return "rgba(255, 99, 132, 0.2)";
    case "Carbon Offset Purchases":
      return "rgba(0, 128, 0, 0.2)";
    default:
      return "rgba(0, 0, 0, 0.1)"; // Default color if not found
  }
}

// --- Main Data Provider Function ---

async function provideData(orgId: string): Promise<DataOutput> {
  const now = new Date();

  // --- Yearly Data (Last 5 years) ---
  const { start: last5YearsStart, end: last5YearsEnd } = getLastNYearsRange(
    now,
    5,
  );

  const yearlyEmissionSources = await getEmissionData(
    orgId,
    last5YearsStart / 1000,
    last5YearsEnd / 1000,
    false,
  );
  const yearlyOffsetData = await getOffsetData(
    orgId,
    last5YearsStart / 1000,
    last5YearsEnd / 1000,
  );
  const {
    grossEmissions: yearlyGrossEmissions,
    netEmissions: yearlyNetEmissions,
  } = calculateGrossAndNetEmissions(
    yearlyEmissionSources,
    yearlyOffsetData,
    false,
  );

  // Yearly Labels (Last 5 years):
  const startYear = new Date(last5YearsStart).getFullYear();
  const endYear = now.getFullYear();
  const yearlyLabels: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    yearlyLabels.push(year.toString());
  }

  const allYears: AllYears = {
    labels: yearlyLabels,
    datasets: yearlyEmissionSources.map((source) => ({
      // Use formatted factor type in label
      label: formatFactorType(source.label),
      data: yearlyLabels.map((label) => {
        const emissionData = source.data.find((d) => d.month === label);
        return {
          month: label,
          emissions: emissionData ? emissionData.emissions : 0,
        };
      }),
      backgroundColor: getBackgroundColor(source.label), // Use original label for color mapping
      type: "bar",
      yAxisID: "y-axis-1",
    })),
  };

  // Add Offset Data as a Line Dataset:
  allYears.datasets.push({
    label: "Carbon Offset Purchases",
    data: yearlyLabels.map((label) => {
      const offset = yearlyOffsetData.find((o) => o.year.toString() === label);
      return {
        month: label,
        emissions: offset ? offset.tco2e * 1000 : 0,
      }; // Convert to kg
    }),
    borderWidth: 3,
    borderColor: "rgba(0, 128, 0, 1)", // Green for offsets
    backgroundColor: getBackgroundColor("Carbon Offset Purchases"),
    type: "line",
    order: 2, // Adjust order as needed
    yAxisID: "y-axis-2", // Use the second y-axis
    pointStyle: "rectRot",
    pointRadius: 5,
    pointBorderColor: "rgb(0, 0, 0)",
  });

  // Add Gross and Net Emissions as line datasets for yearly chart
  allYears.datasets.push(
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
      type: "line",
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
      type: "line",
      order: 0,
      yAxisID: "y-axis-2",
    },
  );

  // Yearly Calculations
  const latestYearlyGrossEmissionsTonnes =
	yearlyGrossEmissions.length > 0
      ? yearlyGrossEmissions.at(-1)!.emissions / 1000
      : 0;

  const previousYearlyRange = getPreviousYearRange(now);
  const previousYearlyGrossEmissions = calculateGrossAndNetEmissions(
    await getEmissionData(
      orgId,
      previousYearlyRange.start / 1000,
      previousYearlyRange.end / 1000,
      false,
    ),
    await getOffsetData(
      orgId,
      previousYearlyRange.start / 1000,
      previousYearlyRange.end / 1000,
    ),
    false,
  ).grossEmissions;
  const previousYearlyGrossEmissionsTonnes =
    previousYearlyGrossEmissions.length > 0
      ? previousYearlyGrossEmissions.at(-1)!.emissions / 1000
      : 0;

  const latestYearlyNetEmissionsTonnes =
    yearlyNetEmissions.length > 0
      ? yearlyNetEmissions.at(-1)!.emissions / 1000
      : 0;

  const previousYearlyNetEmissions = calculateGrossAndNetEmissions(
    await getEmissionData(
      orgId,
      previousYearlyRange.start / 1000,
      previousYearlyRange.end / 1000,
      false,
    ),
    await getOffsetData(
      orgId,
      previousYearlyRange.start / 1000,
      previousYearlyRange.end / 1000,
    ),
    false,
  ).netEmissions;
  const previousYearlyNetEmissionsTonnes =
    previousYearlyNetEmissions.length > 0
      ? previousYearlyNetEmissions.at(-1)!.emissions / 1000
      : 0;

  const latestOffsetTonnes =
    yearlyOffsetData.length > 0 ? yearlyOffsetData.at(-1)!.tco2e : 0;
  const previousOffsetTonnes =
    yearlyOffsetData.length > 1 ? yearlyOffsetData.at(-2)!.tco2e : 0;

  // --- Monthly Data (Last 5 years) ---
  const monthlyEmissionSources = await getEmissionData(
    orgId,
    last5YearsStart / 1000,
    last5YearsEnd / 1000,
    true,
  );
  const { grossEmissions: monthlyGrossEmissions } =
    calculateGrossAndNetEmissions(monthlyEmissionSources, null, true);

  // Monthly Calculations
  const latestMonthlyGrossEmissionsTonnes =
    monthlyGrossEmissions.length > 0
      ? monthlyGrossEmissions.at(-1)!.emissions / 1000
      : 0;

  const previousMonthlyRange = getPreviousMonthRange(now);
  const previousMonthlyGrossEmissions = calculateGrossAndNetEmissions(
    await getEmissionData(
      orgId,
      previousMonthlyRange.start / 1000,
      previousMonthlyRange.end / 1000,
      true,
    ),
    null,
    true,
  ).grossEmissions;
  const previousMonthlyGrossEmissionsTonnes =
    previousMonthlyGrossEmissions.length > 0
      ? previousMonthlyGrossEmissions.at(-1)!.emissions / 1000
      : 0;

  // Extract all unique months from the last 5 years
  const allMonthsSet = new Set<string>();
  for (const source of monthlyEmissionSources) {
    for (const dataPoint of source.data) {
      allMonthsSet.add(dataPoint.month);
    }
  }
  const allMonthsLabels = Array.from(allMonthsSet).sort();

  // Construct the allMonths object with pre-filtered data
  const allMonths: AllMonths = {
    labels: allMonthsLabels,
    datasets: monthlyEmissionSources.map((source) => ({
      label: source.label,
      backgroundColor: source.backgroundColor,
      type: "bar",
      yAxisID: "y-axis-1",
      data: allMonthsLabels.map((label) => {
        const emissionData = source.data.find((d) => d.month === label);
        return {
          month: label, // Include the month property
          emissions: emissionData ? emissionData.emissions : 0,
        };
      }),
    })),
  };

  // Add Gross Emissions as a line dataset for monthly chart
  allMonths.datasets.push({
    label: "Gross Emissions",
    borderWidth: 3,
    borderColor: "rgba(255, 0, 0, 1)",
    type: "line",
    order: 1,
    yAxisID: "y-axis-2",
    data: allMonths.labels.map((month) => {
      const grossEmissionData = monthlyGrossEmissions.find(
        (d) => d.month === month,
      );
      return {
        month,
        emissions: grossEmissionData ? grossEmissionData.emissions : 0,
      };
    }),
  });

  // Net Emissions for the last 5 years
  const { netEmissions: monthlyNetEmissions } = calculateGrossAndNetEmissions(
    monthlyEmissionSources,
    null,
    true,
  );

  // Find the latest and previous month's net emissions
  const latestMonthlyNetEmissionsTonnes =
    monthlyNetEmissions.length > 0
      ? monthlyNetEmissions.at(-1)!.emissions / 1000
      : 0;
  const previousMonthlyNetEmissions = calculateGrossAndNetEmissions(
    await getEmissionData(
      orgId,
      previousMonthlyRange.start / 1000,
      previousMonthlyRange.end / 1000,
      true,
    ),
    null,
    true,
  ).netEmissions;
  const previousMonthlyNetEmissionsTonnes =
    previousMonthlyNetEmissions.length > 0
      ? previousMonthlyNetEmissions.at(-1)!.emissions / 1000
      : 0;

  // Add Net Emissions as a line dataset for monthly chart
  allMonths.datasets.push({
    label: "Net Emissions",
    borderWidth: 3,
    borderColor: "rgba(0, 0, 0, 1)",
    type: "line",
    order: 0,
    yAxisID: "y-axis-2",
    data: allMonths.labels.map((month) => {
      const netEmissionData = monthlyNetEmissions.find(
        (d) => d.month === month,
      );
      return {
        month,
        emissions: netEmissionData ? netEmissionData.emissions : 0,
      };
    }),
  });

  return {
    monthly: {
      allMonths,
      latestGrossEmissionsTonnes: latestMonthlyGrossEmissionsTonnes,
      previousGrossEmissionsTonnes: previousMonthlyGrossEmissionsTonnes,
      latestNetEmissionsTonnes: latestMonthlyNetEmissionsTonnes,
      previousNetEmissionsTonnes: previousMonthlyNetEmissionsTonnes,
    },
    yearly: {
      allYears,
      latestGrossEmissionsTonnes: latestYearlyGrossEmissionsTonnes,
      previousGrossEmissionsTonnes: previousYearlyGrossEmissionsTonnes,
      latestNetEmissionsTonnes: latestYearlyNetEmissionsTonnes,
      previousNetEmissionsTonnes: previousYearlyNetEmissionsTonnes,
      latestOffsetTonnes,
      previousOffsetTonnes,
    },
  };
}
export { provideData };
