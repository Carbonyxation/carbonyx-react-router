import { useEffect, useState } from "react";
import {
  useSubmit,
  useNavigation,
  useActionData,
  useLoaderData,
} from "react-router";
import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import Table, { type Column } from "~/components/table";
import { toast } from "sonner";
import type { Route } from "./+types/factor";
import { db } from "~/db/db";
import { factors } from "~/db/schema";
import { and, or, eq, isNull, isNotNull } from "drizzle-orm";
import { FactorForm } from "~/components/factor-input";

import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

export async function loader(args: Route.LoaderArgs) {
  const auth = await getAuth(args);
  if (!auth.orgId) {
    return redirect("/");
  }

  // Get all factors available to this organization (central + org-specific)
  const allFactors = await db
    .select({
      id: factors.id,
      orgId: factors.orgId,
      originalFactorId: factors.originalFactorId,
      name: factors.name,
      type: factors.type,
      subType: factors.subType,
      unit: factors.unit,
      factor: factors.factor,
      isCustom: factors.isCustom,
    })
    .from(factors)
    .where(
      or(
        isNull(factors.orgId), // Central factors
        eq(factors.orgId, auth.orgId), // Organization-specific factors
      ),
    )
    .orderBy(factors.type, factors.name);

  // Group factors to handle overrides
  const factorMap = new Map();
  const orgOverrides = new Set();

  // First pass: identify all organization overrides
  allFactors.forEach((factor) => {
    if (factor.orgId && factor.originalFactorId) {
      orgOverrides.add(factor.originalFactorId);
    }
  });

  // Second pass: build the final list, excluding central factors that have overrides
  allFactors.forEach((factor) => {
    const key = `${factor.type}-${factor.name}`;

    if (factor.orgId) {
      // Organization factor (custom or override) - always include
      factorMap.set(key, factor);
    } else {
      // Central factor - only include if no override exists
      if (!orgOverrides.has(factor.id) && !factorMap.has(key)) {
        factorMap.set(key, factor);
      }
    }
  });

  // Transform the data for the UI
  const transformedFactors = Array.from(factorMap.values()).map((factor) => ({
    id: factor.id,
    name: factor.name,
    type: factor.type,
    subType: factor.subType || "",
    unit: factor.unit,
    factor: factor.factor,
    factorSource: factor.orgId ? 1 : 0, // 0 = Central, 1 = Organization
    isCustom: factor.isCustom || false,
    isOverride: !!factor.originalFactorId, // True if this overrides a central factor
    originalFactorId: factor.originalFactorId,
  }));

  // Sort the final result
  transformedFactors.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return a.name.localeCompare(b.name);
  });

  return { availableFactors: transformedFactors };
}

export async function action(args: Route.ActionArgs) {
  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const auth = await getAuth(args);
  const orgId = auth.orgId;

  if (!orgId) {
    return { success: false, message: "Organization ID is required" };
  }

  if (intent === "add") {
    const name = formData.get("name")?.toString() || "";
    const type = formData.get("type")?.toString() || "";
    const subType = formData.get("subType")?.toString() || "";
    const unit = formData.get("unit")?.toString() || "";
    const factor = Number(formData.get("factor"));
    const originalFactorId = formData.get("originalFactorId")?.toString();

    // If this is an override, check if it already exists
    if (originalFactorId) {
      const existingOverride = await db
        .select()
        .from(factors)
        .where(
          and(
            eq(factors.originalFactorId, Number(originalFactorId)),
            eq(factors.orgId, orgId),
          ),
        )
        .limit(1);

      if (existingOverride.length > 0) {
        return {
          success: false,
          message:
            "An override for this factor already exists. Please edit the existing override.",
        };
      }
    }

    const result = await db
      .insert(factors)
      .values({
        orgId,
        originalFactorId: originalFactorId ? Number(originalFactorId) : null,
        name,
        type,
        subType: subType || null,
        unit,
        factor,
        isCustom: !originalFactorId, // Custom if not overriding a central factor
      })
      .returning();

    return {
      success: true,
      intent: "add",
      updatedRecord: result[0],
      message: originalFactorId
        ? "Factor override created successfully"
        : "Custom factor added successfully",
    };
  }

  if (intent === "edit") {
    const id = formData.get("id")?.toString();
    if (!id) {
      return { success: false, message: "Factor ID is required" };
    }

    const name = formData.get("name")?.toString() || "";
    const type = formData.get("type")?.toString() || "";
    const subType = formData.get("subType")?.toString() || "";
    const unit = formData.get("unit")?.toString() || "";
    const factor = Number(formData.get("factor"));

    // Check if this is a central factor (orgId is null)
    const existingFactor = await db
      .select()
      .from(factors)
      .where(eq(factors.id, Number(id)))
      .limit(1);

    if (existingFactor.length === 0) {
      return { success: false, message: "Factor not found" };
    }

    const isEditingCentralFactor = !existingFactor[0].orgId;

    if (isEditingCentralFactor) {
      // Editing a central factor - create an override instead
      // Check if an override already exists
      const existingOverride = await db
        .select()
        .from(factors)
        .where(
          and(
            eq(factors.originalFactorId, Number(id)),
            eq(factors.orgId, orgId),
          ),
        )
        .limit(1);

      if (existingOverride.length > 0) {
        // Override exists, update it
        const result = await db
          .update(factors)
          .set({ name, type, subType: subType || null, unit, factor })
          .where(eq(factors.id, existingOverride[0].id))
          .returning();

        return {
          success: true,
          intent: "edit",
          updatedRecord: result[0],
          message: "Factor override updated successfully",
        };
      } else {
        // No override exists, create one
        const result = await db
          .insert(factors)
          .values({
            orgId,
            originalFactorId: Number(id),
            name,
            type,
            subType: subType || null,
            unit,
            factor,
            isCustom: false,
          })
          .returning();

        return {
          success: true,
          intent: "edit",
          updatedRecord: result[0],
          message: "Factor override created successfully",
        };
      }
    } else {
      // Editing an org-specific factor
      if (existingFactor[0].orgId !== orgId) {
        return {
          success: false,
          message: "Not authorized to edit this factor",
        };
      }

      const result = await db
        .update(factors)
        .set({ name, type, subType: subType || null, unit, factor })
        .where(eq(factors.id, Number(id)))
        .returning();

      return {
        success: true,
        intent: "edit",
        updatedRecord: result[0],
        message: "Factor updated successfully",
      };
    }
  }

  if (intent === "delete") {
    const id = formData.get("id")?.toString();
    if (!id) {
      return { success: false, message: "Factor ID is required" };
    }

    // Get the factor to be deleted
    const factorToDelete = await db
      .select()
      .from(factors)
      .where(
        and(
          eq(factors.id, Number(id)),
          eq(factors.orgId, orgId), // Ensure it's an org-specific factor
        ),
      )
      .limit(1);

    if (factorToDelete.length === 0) {
      return {
        success: false,
        message:
          "Factor not found or cannot be deleted (central factors cannot be deleted)",
      };
    }

    // Delete the organization factor
    const result = await db
      .delete(factors)
      .where(and(eq(factors.id, Number(id)), eq(factors.orgId, orgId)))
      .returning();

    const deletedFactor = factorToDelete[0];
    let message = "Factor deleted successfully";

    // If this was an override, mention that the central factor is now visible again
    if (deletedFactor.originalFactorId) {
      message = "Override deleted successfully. Central factor is now active.";
    }

    return {
      success: true,
      intent: "delete",
      updatedRecord: result[0],
      message: message,
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
    setFactorData(availableFactors);
  }, [availableFactors]);

  useEffect(() => {
    if (navigation.state === "idle" && actionData?.success) {
      if (actionData.message) {
        toast.success(actionData.message);
      }

      // Force a reload to get the latest data
      window.location.reload();
      setEditingFactor(null);
    } else if (
      navigation.state === "idle" &&
      actionData &&
      !actionData.success
    ) {
      if (actionData.message) {
        toast.error(actionData.message);
      }
    }
  }, [navigation.state, actionData]);

  const handleSubmit = (data: {
    name: string;
    type: string;
    subType: string;
    orgId: string;
    unit: string;
    factor: number;
  }) => {
    const formData = new FormData();
    formData.append("intent", "add");
    formData.append("name", data.name);
    formData.append("type", data.type);
    formData.append("subType", data.subType || "");
    formData.append("unit", data.unit);
    formData.append("factor", data.factor.toString());
    submit(formData, { method: "post" });
  };

  const handleEdit = (
    id: number,
    data: {
      name: string;
      type: string;
      subType: string;
      unit: string;
      factor: number;
    },
  ) => {
    const formData = new FormData();
    formData.append("intent", "edit");
    formData.append("id", id.toString());
    formData.append("name", data.name);
    formData.append("type", data.type);
    formData.append("subType", data.subType || "");
    formData.append("unit", data.unit);
    formData.append("factor", data.factor.toString());
    submit(formData, { method: "post" });
  };

  const handleDelete = (itemToDelete) => {
    // Only allow deletion of org-specific factors
    if (itemToDelete.factorSource === 0) {
      toast.error("Cannot delete central factors");
      return;
    }

    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", itemToDelete.id.toString());
    submit(formData, { method: "post" });
  };

  const columns: Column[] = [
    { key: "name", title: "Name", type: "string" },
    { key: "type", title: "Type", type: "string" },
    { key: "subType", title: "Sub Type", type: "string" },
    { key: "unit", title: "Unit", type: "string" },
    { key: "factor", title: "Factor", type: "number" },
    {
      key: "factorSource",
      title: "Source",
      type: "string",
      render: (value, item) => {
        if (value === 0) {
          return "Central";
        }
        return item.isOverride ? "Override" : "Custom";
      },
    },
  ];

  const handleEditStart = (item) => {
    if (!item.subType) item.subType = "";
    setEditingFactor(item);
  };

  const handleCancelEdit = () => {
    setEditingFactor(null);
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
        Custom Factors Configuration
      </span>
      <FactorForm
        onSubmit={handleSubmit}
        onEdit={handleEdit}
        onCancel={handleCancelEdit} // Add this prop
        editingFactor={editingFactor}
      />
      <Table
        columns={columns}
        data={factorData}
        onEditStart={handleEditStart}
        onDelete={(item) => {
          // Only allow deletion of organization factors, not central ones
          if (item.factorSource === 0) {
            toast.error("Cannot delete central factors");
            return;
          }

          let confirmMessage = "Are you sure you want to delete this factor?";
          if (item.isOverride) {
            confirmMessage =
              "Are you sure you want to delete this override? The original central factor will become active again.";
          }

          if (confirm(confirmMessage)) {
            handleDelete(item);
          }
        }}
      />
    </div>
  );
}
