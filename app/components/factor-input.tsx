import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react-router";
import { css } from "carbonyxation/css";

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
}

export const FactorForm = ({ editingFactor, onSubmit, onEdit }: FactorFormProps) => {
  const auth = useAuth();
  const orgId = auth.orgId || "1";
  const isEditing = !!editingFactor;

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [subType, setSubType] = useState("");
  const [unit, setUnit] = useState("");
  const [factor, setFactor] = useState("");

  const hasEditingDataApplied = useRef(false);

  useEffect(() => {
    if (editingFactor && !hasEditingDataApplied.current) {
      setName(editingFactor.name);
      setType(editingFactor.type);
      setSubType(editingFactor.subType);
      setUnit(editingFactor.unit);
      setFactor(editingFactor.factor.toString());
      hasEditingDataApplied.current = true;
    }
  }, [editingFactor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericFactor = parseFloat(factor);
    if (isNaN(numericFactor)) return alert("Invalid factor value");

    if (isEditing && editingFactor) {
      await onEdit(editingFactor.id, {
        name,
        type,
        subType,
        unit,
        factor: numericFactor,
      });
    } else {
      await onSubmit({
        orgId,
        name,
        type,
        subType,
        unit,
        factor: numericFactor,
        isCustom: true,
      });
    }

    // Optionally reset form
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
        Sub-Type:
        <input
          type="text"
          value={subType}
          onChange={(e) => setSubType(e.target.value)}
          className={inputStyle}
          required
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
