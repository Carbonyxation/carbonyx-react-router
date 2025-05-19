import { useEffect, useState } from "react";
import { useSubmit, useNavigation, useActionData, useLoaderData } from "react-router";
import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import Table, { type Column } from "~/components/table";
import { toast } from "sonner";
import type { Route } from "./+types/factor";
import { db } from "~/db/db";
import { combinedFactorsView, factors, orgFactors } from "~/db/schema";
import { and, or, eq, isNull, isNotNull } from "drizzle-orm";
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

  // Get all central factors
  const centralFactors = await db.select().from(factors);

  // Get all organization's factors (both overrides and custom)
  const orgFactorsData = await db
    .select()
    .from(orgFactors)
    .where(eq(orgFactors.orgId, auth.orgId));

  // Create a map of overrides by originalFactorId for quick lookup
  const overrideMap = new Map();
  orgFactorsData.forEach(orgFactor => {
    if (orgFactor.originalFactorId) {
      overrideMap.set(orgFactor.originalFactorId, orgFactor);
    }
  });

  // Create the combined list with correct IDs
  const availableFactors = [];

  // Add central factors (with overrides applied if they exist)
  centralFactors.forEach(centralFactor => {
    const override = overrideMap.get(centralFactor.id);

    if (override) {
      // There's an override - use the override data but keep the central ID
      availableFactors.push({
        id: centralFactor.id,  // Keep the central factor ID
        name: override.name,
        type: override.type,
        subType: override.subType,
        unit: override.unit,
        factor: override.factor,
        factorSource: 0,  // Mark as central (even though it's showing override data)
        isOverridden: true,  // Add a flag to indicate it's an override
        orgFactorId: override.id  // Store the org factor ID for edit/delete operations
      });
    } else {
      // No override - use the central factor as is
      availableFactors.push({
        id: centralFactor.id,
        name: centralFactor.name,
        type: centralFactor.type,
        subType: centralFactor.subType,
        unit: centralFactor.unit,
        factor: centralFactor.factor,
        factorSource: 0,
        isOverridden: false
      });
    }
  });

  // Add custom org factors (ones that don't override central factors)
  orgFactorsData
    .filter(orgFactor => !orgFactor.originalFactorId)
    .forEach(customOrgFactor => {
      availableFactors.push({
        id: customOrgFactor.id,
        name: customOrgFactor.name,
        type: customOrgFactor.type,
        subType: customOrgFactor.subType,
        unit: customOrgFactor.unit,
        factor: customOrgFactor.factor,
        factorSource: 1,
        isCustom: true
      });
    });

  return { availableFactors };
}

export async function action(args: Route.ActionArgs) {
  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const auth = await getAuth(args);
  const orgId = auth.orgId

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
    const isCustom = originalFactorId ? false : true;

    // If this is an override, check if it already exists
    if (originalFactorId) {
      const existingOverride = await db
        .select()
        .from(orgFactors)
        .where(
          and(
            eq(orgFactors.originalFactorId, Number(originalFactorId)),
            eq(orgFactors.orgId, orgId)
          )
        )
        .limit(1);

      if (existingOverride.length > 0) {
        return {
          success: false,
          message: "An override for this factor already exists. Please edit the existing override."
        };
      }
    }

    const result = await db
      .insert(orgFactors)
      .values({
        name,
        type,
        subType,
        unit,
        factor,
        orgId,
        originalFactorId: originalFactorId ? Number(originalFactorId) : null,
        isCustom
      })
      .returning();

    return {
      success: true,
      intent: "add",
      updatedRecord: result[0],
      message: isCustom ? "Custom factor added successfully" : "Factor override created successfully",
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

    // Check if this ID exists in the central factors table
    const centralFactor = await db
      .select()
      .from(factors)
      .where(eq(factors.id, Number(id)))
      .limit(1);

    if (centralFactor.length > 0) {
      // This is a central factor, we need to create an override
      // First, check if an override already exists
      const existingOverride = await db
        .select()
        .from(orgFactors)
        .where(
          and(
            eq(orgFactors.originalFactorId, Number(id)),
            eq(orgFactors.orgId, orgId)
          )
        )
        .limit(1);

      if (existingOverride.length > 0) {
        // Override exists, update it
        const result = await db
          .update(orgFactors)
          .set({ name, type, subType, unit, factor })
          .where(eq(orgFactors.id, existingOverride[0].id))
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
          .insert(orgFactors)
          .values({
            orgId,
            originalFactorId: Number(id),
            name: name || centralFactor[0].name,
            type: type || centralFactor[0].type,
            subType: subType || centralFactor[0].subType || "",
            unit: unit || centralFactor[0].unit,
            factor: factor || centralFactor[0].factor,
            isCustom: false
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
      // This is not a central factor, check if it's an org-specific factor
      const result = await db
        .update(orgFactors)
        .set({ name, type, subType, unit, factor })
        .where(
          and(
            eq(orgFactors.id, Number(id)),
            eq(orgFactors.orgId, orgId)
          )
        )
        .returning();

      if (result.length === 0) {
        return { success: false, message: "Factor not found or not authorized" };
      }

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

    const result = await db
      .delete(orgFactors)
      .where(
        and(
          eq(orgFactors.id, Number(id)),
          eq(orgFactors.orgId, orgId)
        )
      )
      .returning();

    if (result.length === 0) {
      return { success: false, message: "Factor not found or not authorized" };
    }

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
    setFactorData(availableFactors);
  }, [availableFactors]);

  useEffect(() => {
    if (navigation.state === "idle" && actionData?.success) {
      if (actionData.message) {
        toast.success(actionData.message);
      }

      // Force a reload instead of client-side state update
      // This ensures we get the latest data from the combinedFactorsView
      window.location.reload();

      setEditingFactor(null);
    } else if (navigation.state === "idle" && actionData && !actionData.success) {
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
    isCentralFactor: boolean
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
    let idToDelete;

    if (itemToDelete.factorSource === 0 && itemToDelete.isOverridden) {
      idToDelete = itemToDelete.orgFactorId;
    } else if (itemToDelete.isCustom) {
      idToDelete = itemToDelete.id;
    } else {
      toast.error("Cannot delete central factors");
      return;
    }

    if (!idToDelete) {
      toast.error("Cannot delete this factor");
      return;
    }
    
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", idToDelete.toString());
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
      render: (value) => value === 0 ? "Central" : "Organization"
    },
  ];

  const handleEditStart = (item) => {
    if (!item.subType) item.subType = ""
    setEditingFactor(item)
  }

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
        onEdit={(id, data) => handleEdit(id, data, editingFactor?.factorSource === 0)}
        editingFactor={editingFactor}
      />
      <Table
        columns={columns}
        data={factorData}
        onEditStart={handleEditStart}
        onDelete={(item) => {
	  console.log("O:", item)
          // Only allow deletion of organization factors, not central ones
          if (item.factorSource === 0 && !item.isOverridden) {
            toast.error("Cannot delete central factors");
            return;
          }
	  if(confirm("Are you sure you want to delete this factor?")) {
            handleDelete(item);
	  }
        }}
      />
    </div>
  );
}
