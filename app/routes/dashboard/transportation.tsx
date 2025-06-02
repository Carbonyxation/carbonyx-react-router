import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import {
  useLoaderData,
  useNavigation,
  useSubmit,
  useActionData,
} from "react-router";
import { and, eq } from "drizzle-orm";
import { useEffect, useState } from "react";
import DataInput, { type DataInputProps } from "~/components/data-input";
import Table from "~/components/table";
import { db } from "~/db/db";
import {
  collectedData,
  factors,
  type CollectedData,
  type CollectedDataWithEmission,
} from "~/db/schema";
import type { Route } from "./+types/electricity";
import { getAuth } from "@clerk/react-router/ssr.server";

const factorType = "mobile_combustion"; // Set the factor type here

export async function loader(args: Route.LoaderArgs) {
  const auth = await getAuth(args);
  const orgId = auth.orgId!;
  const transportationsUsage = await db
    .select()
    .from(collectedData)
    .innerJoin(factors, eq(collectedData.factorId, factors.id))
    .where(and(eq(factors.type, factorType), eq(collectedData.orgId, orgId)));

  // Fetch available factors with 'factor' value
  const availableFactors = await db
    .select({
      id: factors.id,
      name: factors.name,
      unit: factors.unit,
      type: factors.type,
      subType: factors.subType,
      factor: factors.factor,
    })
    .from(factors)
    .where(eq(factors.type, "transportation"));

  type TSUsageWithEmission = (typeof transportationsUsage)[number] & {
    totalEmission: number;
  };

  const ts_usage_with_emission: TSUsageWithEmission[] =
    transportationsUsage.map((data) => {
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

  const formattedData = ts_usage_with_emission.map((item) => {
    return {
      ...item.collected_data,
      type: item.factors.name,
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
    result = await db
      .delete(collectedData)
      .where(eq(collectedData.id, id))
      .returning();
  } else {
    return { success: false, message: "Invalid intent" };
  }

  return {
    success: true,
    message: "Data updated successfully",
    updatedRecord: result?.[0],
    intent,
  };
}

export default function TransportationInputPage() {
  const { formattedData, availableFactors } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [data, setData] = useState(formattedData);
  const [editingData, setEditingData] =
    useState<DataInputProps["editingData"]>(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData?.success) {
      if (actionData.intent === "add" && actionData.updatedRecord) {
        setData((prev) => {
          if (prev.find((item) => item.id === actionData.updatedRecord.id)) {
            return prev;
          }
          const factor =
            availableFactors.find(
              (f) => f.id === actionData.updatedRecord.factorId,
            )?.factor || 0;
          const newRecord = {
            ...actionData.updatedRecord,
            type:
              availableFactors.find(
                (f) => f.id === actionData.updatedRecord.factorId,
              )?.name || "",
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
        setData((prev) =>
          prev.map((item) => {
            if (item.id === actionData.updatedRecord.id) {
              const factor =
                availableFactors.find(
                  (f) => f.id === actionData.updatedRecord.factorId,
                )?.factor || 0;
              return {
                ...actionData.updatedRecord,
                type:
                  availableFactors.find(
                    (f) => f.id === actionData.updatedRecord.factorId,
                  )?.name || "",
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
        setData((prev) =>
          prev.filter((item) => item.id !== actionData.updatedRecord.id),
        );
      } else {
        // Refresh computed totals
        setData((prev) =>
          prev.map((item) => {
            const factor =
              availableFactors.find((f) => f.id === item.factorId)?.factor || 0;
            return {
              ...item,
              recordedFactor: factor,
              totalEmission:
                Math.round((item.value * factor + Number.EPSILON) * 100) / 100,
            };
          }),
        );
      }
      setEditingData(null);
    }
  }, [navigation.state, actionData, availableFactors]);

  const columns = [
    { key: "timestamp", title: "Timestamp", type: "timestamp" },
    { key: "type", title: "Type", type: "string" },
    { key: "value", title: "Value", type: "string", suffix: "tkm" },
    {
      key: "recordedFactor",
      title: "Recorded Factor",
      type: "number",
      suffix: "Kg CO₂e/tkm",
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
    value: number;
    orgId: string;
    factorValue: number;
  }) => {
    const formData = new FormData();
    formData.append("intent", "add");
    formData.append("factorId", newData.factorId.toString());
    formData.append("value", newData.value.toString());
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
    updatedData: { factorId: number; value: number },
  ) => {
    const formData = new FormData();
    formData.append("intent", "edit");
    formData.append("id", id);
    formData.append("factorId", updatedData.factorId.toString());
    formData.append("value", updatedData.value.toString());
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
        Transportation Consumption
      </span>
      <DataInput
        inputType="factor"
        availableFactors={availableFactors}
        onSubmit={handleDataSubmit}
        onEdit={handleDataEdit}
        editingData={editingData}
        factorType={factorType}
      />
      <Table
        columns={columns}
        data={data}
        onEditStart={handleEditStart}
        onDelete={handleDelete}
      />
    </div>
  );
}
