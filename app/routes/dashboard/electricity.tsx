import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { and, eq, isNull, or } from "drizzle-orm";
import { useEffect, useState } from "react";
import DataInput, { type DataInputProps } from "~/components/data-input";
import Table from "~/components/table";
import { db } from "~/db/db";
import {
  collectedData,
  factors,
  combinedFactorsView,
  type CollectedDataWithEmission,
} from "~/db/schema";
import type { Route } from "./+types/electricity";
import { getAuth } from "@clerk/react-router/ssr.server";
import { toast } from "sonner";

const factorType = "electricity";

export async function loader(args: Route.LoaderArgs) {
  const auth = await getAuth(args);
  const orgId = auth.orgId!;
  // Fetch initial data
  const electricity_usage = await db
    .select()
    .from(collectedData)
    .innerJoin(
      combinedFactorsView,
      eq(collectedData.factorId, combinedFactorsView.id),
    )
    .where(
      and(
        eq(collectedData.orgId, orgId),
        eq(combinedFactorsView.type, factorType),
      ),
    );

  // Fetch available factors with 'factor' value
  const availableFactors = await db
    .select()
    .from(combinedFactorsView)
    .where(
      and(
        or(
          isNull(combinedFactorsView.factorOrgId),
          eq(combinedFactorsView.factorOrgId, orgId),
        ),
        eq(combinedFactorsView.type, factorType),
      ),
    );

  // Calculate total emission using the fetched factor
  const electricity_usage_with_emission: CollectedDataWithEmission[] =
    electricity_usage.map((data) => {
      const factor =
        availableFactors.find((f) => f.id === data.collected_data.factorId)
          ?.factor || 0;
      return {
        ...data,
        recordedFactor: factor,
        totalEmission:
          Math.round(
            (data.collected_data.value * factor + Number.EPSILON) * 100,
          ) / 100,
      };
    });

  const formattedData = electricity_usage_with_emission.map((item) => {
    return {
      ...item.collected_data,
      type: item.combined_factors_view.name,
      recordedFactor: item.recordedFactor,
      totalEmission: item.totalEmission,
    };
  });

  return { formattedData, availableFactors };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  let result;

  if (intent === "add") {
    const factorId = Number(formData.get("factorId"));
    const value = Number(formData.get("value"));
    const orgId = formData.get("orgId")?.toString() || "1";
    const factorValue = Number(formData.get("factorValue"));

    // Add data to the database
    result = await db
      .insert(collectedData)
      .values({
        factorId,
        value,
        orgId,
        recordedFactor: factorValue,
      })
      .returning();
  } else if (intent === "edit") {
    const id = formData.get("id")?.toString();
    const factorId = Number(formData.get("factorId"));
    const value = Number(formData.get("value"));
    if (!id) throw new Error("Missing ID for editing data");

    // Update data in the database
    result = await db
      .update(collectedData)
      .set({
        factorId,
        value,
      })
      .where(eq(collectedData.id, id))
      .returning();
  } else if (intent === "delete") {
    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing ID for deleting data");

    // Delete data from the database
    result = await db
      .delete(collectedData)
      .where(eq(collectedData.id, id))
      .returning();
  } else {
    return { success: false, message: "Invalid intent" };
  }

  // Return the updated record and all current records
  return {
    success: true,
    message: "Data updated successfully",
    updatedRecord: result?.[0],
    intent: intent,
  };
}

export default function ElectricityInputPage() {
  const { formattedData, availableFactors } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // Use state to track the table data, initialized from the loader
  const [tableData, setTableData] = useState(formattedData);

  const [editingData, setEditingData] =
    useState<DataInputProps["editingData"]>(null);

  // Update the table data immediately after action and show a toast
  useEffect(() => {
    if (navigation.state === "idle" && actionData?.success) {
      toast.success(actionData.message || "Data updated successfully");
      if (actionData.intent === "add" && actionData.updatedRecord) {
        setTableData((prev) => {
          // Prevent duplicate addition if record already exists
          if (prev.find((item) => item.id === actionData.updatedRecord.id)) {
            return prev;
          }
          const factor =
            availableFactors.find(
              (f) => f.id === actionData.updatedRecord.factorId,
            )?.factor || 0;
          const newRecord = {
            ...actionData.updatedRecord,
            recordedFactor: factor,
            totalEmission:
              Math.round(
                (actionData.updatedRecord.value * factor + Number.EPSILON) *
                  100,
              ) / 100,
          };
          return [...prev, newRecord];
        });
      } else if (actionData.intent === "edit" && actionData.updatedRecord) {
        setTableData((prev) =>
          prev.map((item) => {
            if (item.id === actionData.updatedRecord.id) {
              const factor =
                availableFactors.find(
                  (f) => f.id === actionData.updatedRecord.factorId,
                )?.factor || 0;
              return {
                ...actionData.updatedRecord,
                recordedFactor: factor,
                totalEmission:
                  Math.round(
                    (actionData.updatedRecord.value * factor + Number.EPSILON) *
                      100,
                  ) / 100,
              };
            }
            return item;
          }),
        );
      } else if (actionData.intent === "delete" && actionData.updatedRecord) {
        setTableData((prev) =>
          prev.filter((item) => item.id !== actionData.updatedRecord.id),
        );
      }

      setEditingData(null); // Exit editing mode
    }
  }, [navigation.state, actionData, availableFactors]);

  const columns = [
    { key: "timestamp", title: "Timestamp", type: "timestamp" },
    { key: "value", title: "Value", type: "string", suffix: "kWh" },
    {
      key: "recordedFactor",
      title: "Recorded Factor",
      type: "number",
      suffix: "Kg CO₂e/kWh",
    },
    {
      key: "totalEmission",
      title: "Total Emission",
      type: "number",
      suffix: "Kg CO₂e",
    },
  ];

  const handleDataSubmit = async (newData: {
    factorId: number;
    value: number | "";
    orgId: string;
    factorValue: number;
  }) => {
    const formData = new FormData();
    formData.append("intent", "add");
    formData.append("factorId", newData.factorId.toString());
    formData.append(
      "value",
      newData.value === "" ? "0" : newData.value.toString(),
    );
    formData.append("orgId", newData.orgId.toString());
    formData.append("factorValue", newData.factorValue.toString());
    submit(formData, { method: "post" });
  };

  const handleEditStart = (editData: {
    id: string;
    factorId: number;
    value: number;
    recordedFactor: number;
  }) => {
    setEditingData(editData);
  };

  const handleDataEdit = async (
    id: string,
    updatedData: {
      factorId: number;
      value: number | "";
    },
  ) => {
    const formData = new FormData();
    formData.append("intent", "edit");
    formData.append("id", id);
    formData.append("factorId", updatedData.factorId.toString());
    formData.append(
      "value",
      updatedData.value === "" ? "0" : updatedData.value.toString(),
    );
    submit(formData, { method: "post" });
  };

  const handleDelete = (id: string) => {
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id);
    submit(formData, { method: "post" });
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
      <span
        className={css({
          fontSize: "xl",
          fontWeight: "bold",
        })}
      >
        Electricity Consumption
      </span>
      <DataInput
        inputType="factor"
        availableFactors={availableFactors}
        onSubmit={handleDataSubmit}
        onEdit={handleDataEdit}
        editingData={editingData}
        factorType={factorType}
        allowEmptyValues={true} // Add this prop to DataInput component
      />
      <Table
        columns={columns}
        data={tableData}
        onEditStart={handleEditStart}
        onDelete={handleDelete}
      />
    </div>
  );
}
