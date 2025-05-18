import { useEffect, useState } from "react";
import { useSubmit, useNavigation, useActionData, useLoaderData } from "react-router";
import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import Table, { type Column } from "~/components/table";
import { toast } from "sonner";
import type { Route } from "./+types/factor";
import { db } from "~/db/db";
import { combinedFactorsView, factors, orgFactors } from "~/db/schema";
import { or, eq, isNull } from "drizzle-orm";
import {
  FactorForm,
} from "~/components/factor-input";

import { getAuth } from '@clerk/react-router/ssr.server'
import { redirect } from "react-router";

export async function loader(args: Route.LoaderArgs) {
  const auth = await getAuth(args)
  if (!auth.orgId) {
    return redirect('/')
  }
  const availableFactors = await db.select().from(combinedFactorsView).where(
    or(
      eq(combinedFactorsView.factorOrgId, auth.orgId),
      isNull(combinedFactorsView.factorOrgId)
    )
  );
  return { availableFactors };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "add") {
    const name = formData.get("name")?.toString() || "";
    const type = formData.get("type")?.toString() || "";
    const unit = formData.get("unit")?.toString() || "";
    const factor = Number(formData.get("factor"));
    const result = await db
      .insert(factors)
      .values({ name, type, unit, factor })
      .returning();
    return {
      success: true,
      intent: "add",
      updatedRecord: result[0],
      message: "Factor added successfully",
    };
  }
  if (intent === "edit") {
    const id = formData.get("id")?.toString();
    const name = formData.get("name")?.toString() || "";
    const type = formData.get("type")?.toString() || "";
    const unit = formData.get("unit")?.toString() || "";
    const factor = Number(formData.get("factor"));
    const result = await db
      .update(orgFactors)
      .set({ name, type, unit, factor })
      .where(eq(orgFactors.id, id))
      .returning();
    return {
      success: true,
      intent: "edit",
      updatedRecord: result[0],
      message: "Factor updated successfully",
    };
  }
  if (intent === "delete") {
    const id = formData.get("id")?.toString();
    const result = await db
      .delete(factors)
      .where(eq(factors.id, id))
      .returning();
    return {
      success: true,
      intent: "delete",
      updatedRecord: result[0],
      message: "Factor deleted successfully",
    };
  }
  return { success: false, message: "Invalid intent" };
}

export default function FactorRoute() {
  const { availableFactors } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [factorData, setFactorData] = useState(availableFactors);
  const [editingFactor, setEditingFactor] = useState(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData?.success) {
      if (actionData.intent === "add" && actionData.updatedRecord) {
        setFactorData((prev) => [...prev, actionData.updatedRecord]);
      } else if (actionData.intent === "edit" && actionData.updatedRecord) {
        setFactorData((prev) =>
          prev.map((item) =>
            item.id === actionData.updatedRecord.id
              ? actionData.updatedRecord
              : item
          )
        );
      } else if (actionData.intent === "delete" && actionData.updatedRecord) {
        setFactorData((prev) =>
          prev.filter((item) => item.id !== actionData.updatedRecord.id)
        );
      }
      setEditingFactor(null);
    }
  }, [navigation.state, actionData]);

  const handleSubmit = (data: {
    name: string;
    type: string;
    unit: string;
    factor: number;
  }) => {
    const formData = new FormData();
    formData.append("intent", "add");
    formData.append("name", data.name);
    formData.append("type", data.type);
    formData.append("unit", data.unit);
    formData.append("factor", data.factor.toString());
    submit(formData, { method: "post" });
  };

  const handleEdit = (
    id: number,
    data: {
      name: string;
      type: string;
      unit: string;
      factor: number;
    }
  ) => {
    const formData = new FormData();
    formData.append("intent", "edit");
    formData.append("id", id.toString());
    formData.append("name", data.name);
    formData.append("type", data.type);
    formData.append("unit", data.unit);
    formData.append("factor", data.factor.toString());
    submit(formData, { method: "post" });
  };

  const handleDelete = (id: number) => {
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());
    submit(formData, { method: "post" });
  };

  const columns: Column[] = [
    { key: "id", title: "ID", type: "number" },
    { key: "name", title: "Name", type: "string" },
    { key: "type", title: "Type", type: "string" },
    { key: "unit", title: "Unit", type: "string" },
    { key: "factor", title: "Factor", type: "number" },
  ];

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
        Custom Factors Configuration
      </span>
      <FactorForm
        onSubmit={handleSubmit}
        onEdit={handleEdit}
        editingFactor={editingFactor}
      />
      <Table
        columns={columns}
        data={factorData}
        onEditStart={(item) => setEditingFactor(item)}
        onDelete={(item) => handleDelete(item.id)}
      />
    </div>
  );
}
