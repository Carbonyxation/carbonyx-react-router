import React, { useState, useEffect } from "react";
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
    factorSource?: number;
    isOverride?: boolean;
    originalFactorId?: number;
  } | null;
  onSubmit: (data: {
    orgId: string;
    name: string;
    type: string;
    subType: string;
    unit: string;
    factor: number;
    isCustom?: boolean;
  }) => void;
  onEdit: (
    id: number,
    data: {
      name: string;
      type: string;
      subType: string;
      unit: string;
      factor: number;
    },
  ) => void;
  onCancel: () => void; // Add this prop
}

export const FactorForm = ({
  editingFactor,
  onSubmit,
  onEdit,
  onCancel,
}: FactorFormProps) => {
  const auth = useAuth();
  const orgId = auth.orgId || "1";
  const isEditing = !!editingFactor;
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [subType, setSubType] = useState("");
  const [unit, setUnit] = useState("");
  const [factor, setFactor] = useState("");

  // Update form fields when editingFactor changes
  useEffect(() => {
    if (editingFactor) {
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
  }, [editingFactor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericFactor = parseFloat(factor);
    if (isNaN(numericFactor)) {
      alert("Invalid factor value");
      return;
    }

    if (isEditing && editingFactor) {
      // Editing existing factor
      onEdit(editingFactor.id, {
        name,
        type,
        subType,
        unit,
        factor: numericFactor,
      });
    } else {
      // Adding new factor
      onSubmit({
        orgId,
        name,
        type,
        subType,
        unit,
        factor: numericFactor,
        isCustom: true,
      });
    }

    // Reset form after submit (only for new factors)
    if (!isEditing) {
      setName("");
      setType("");
      setSubType("");
      setUnit("");
      setFactor("");
    }
  };

  const getFormTitle = () => {
    if (!isEditing) return "Add New Factor";

    if (editingFactor?.factorSource === 0) {
      return editingFactor.isOverride
        ? "Edit Factor Override"
        : "Create Factor Override";
    }

    return "Edit Custom Factor";
  };

  const getSubmitButtonText = () => {
    if (!isEditing) return "Add Factor";

    if (editingFactor?.factorSource === 0 && !editingFactor.isOverride) {
      return "Create Override";
    }

    return "Update Factor";
  };

  const handleCancel = () => {
    setName("");
    setType("");
    setSubType("");
    setUnit("");
    setFactor("");
    onCancel(); // Call the parent's cancel handler
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={css({
        display: "grid",
        gap: 4,
        border: "1px solid",
        borderColor: "neutral.400",
        bg: "white",
        borderRadius: "md",
        p: 4,
      })}
    >
      <h3 className={css({ fontSize: "lg", fontWeight: "bold", mb: 2 })}>
        {getFormTitle()}
      </h3>

      {isEditing &&
        editingFactor?.factorSource === 0 &&
        !editingFactor.isOverride && (
          <div
            className={css({
              p: 3,
              bg: "yellow.50",
              border: "1px solid",
              borderColor: "yellow.200",
              borderRadius: "md",
              mb: 2,
            })}
          >
            <p className={css({ fontSize: "sm", color: "yellow.800" })}>
              You're editing a central factor. This will create an
              organization-specific override.
            </p>
          </div>
        )}

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
          placeholder="Optional"
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

      <div className={css({ display: "flex", gap: 2, mt: 4 })}>
        <button
          type="submit"
          className={css({
            flex: 1,
            p: 2,
            bg: "blue.600",
            color: "white",
            borderRadius: "md",
            _hover: { bg: "blue.700" },
          })}
        >
          {getSubmitButtonText()}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className={css({
              px: 4,
              py: 2,
              bg: "gray.200",
              color: "gray.700",
              borderRadius: "md",
              _hover: { bg: "gray.300" },
            })}
          >
            Cancel
          </button>
        )}
      </div>
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
  _focus: {
    outline: "none",
    borderColor: "blue.500",
    boxShadow: "0 0 0 1px token(colors.blue.500)",
  },
});
