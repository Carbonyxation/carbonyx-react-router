import React, { useState, useEffect, useRef } from "react";
import { css } from "carbonyxation/css";
import type { FactorData } from "./data-input";

export interface FactorFormProps {
  editingFactor?: {
    id: number;
    name: string;
    type: string;
    subType: string;
    unit: string;
    factor: number;
  } | null;
  onSubmit: (data: {
    orgId: string;
    name: string;
    type: string;
    subType: string;
    unit: string;
    factor: number;
    isCustom?: boolean;
  }) => Promise<void>;
  onEdit: (id: number, data: Partial<FactorData>) => Promise<void>;
  orgId: string;
}

export const FactorForm = ({ editingFactor, onSubmit, onEdit, orgId }: FactorFormProps) => {
  const isEditing = !!editingFactor;
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [subType, setSubType] = useState("");
  const [unit, setUnit] = useState("");
  const [factor, setFactor] = useState("");

  // Replace hasEditingDataApplied with this effect that runs whenever editingFactor changes
  useEffect(() => {
    if (editingFactor) {
      // Update form fields when a new factor is being edited
      setName(editingFactor.name);
      setType(editingFactor.type);
      setSubType(editingFactor.subType || "");
      setUnit(editingFactor.unit);
      setFactor(editingFactor.factor.toString());
    } else {
      // Reset form when not editing
      setName("");
      setType("");
      setSubType("");
      setUnit("");
      setFactor("");
    }
  }, [editingFactor]); // This dependency ensures the effect runs when editingFactor changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericFactor = parseFloat(factor);
    if (isNaN(numericFactor)) return alert("Invalid factor value");

    if (isEditing && editingFactor) {
      // Optional: Add confirmation before saving changes
      if (confirm("Are you sure you want to save these changes?")) {
        await onEdit(editingFactor.id, {
          name,
          type,
          subType,
          unit,
          factor: numericFactor,
        });
      } else {
        return; // User canceled the edit
      }
    } else {
      await onSubmit({
        name,
        type,
        subType,
        unit,
        factor: numericFactor,
        isCustom: true,
      });
    }

    // Optionally reset form after submit
    if (!isEditing) {
      setName("");
      setType("");
      setSubType("");
      setUnit("");
      setFactor("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={css({ display: "grid", gap: 4, border: "1px solid", borderColor: "neutral.400", bg: "white", borderRadius: "md", p: 4 })}>
      <label>
        Factor Name:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputStyle}
          required
        />
      </label>
      <label>
        Type:
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputStyle}
          required
        />
      </label>
      <label>
        Sub Type:
        <input
          type="text"
          value={subType}
          onChange={(e) => setSubType(e.target.value)}
          className={inputStyle}
        />
      </label>
      <label>
        Unit:
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={inputStyle}
          required
        />
      </label>
      <label>
        Factor Value:
        <input
          type="number"
          step="0.0001"
          value={factor}
          onChange={(e) => setFactor(e.target.value)}
          className={inputStyle}
          required
        />
      </label>
      <button type="submit" className={css({ mt: 4, p: 2, bg: "blue.600", color: "white", borderRadius: "md" })}>
        {isEditing ? "Update Factor" : "Add Factor"}
      </button>
    </form>
  );
};

const inputStyle = css({
  display: "block",
  width: "100%",
  p: 2,
  border: "1px solid",
  borderColor: "gray.300",
  borderRadius: "md",
  mt: 1,
});
