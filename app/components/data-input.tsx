import { useAuth } from "@clerk/react-router";
import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import React, { useCallback, useMemo, useState } from "react";

export interface FactorData {
  id: number;
  name: string;
  unit: string;
  type: string;
  subType: string;
  factor: number;
}

export interface AssetData {
  id: string;
  name: string;
  factor: number;
  unit: string;
  factor_unit?: string;
  factor_name?: string;
  conversion_rate: number;
}

export interface DataInputProps {
  inputType: "factor" | "asset" | "both";
  availableFactors?: FactorData[];
  availableAssets?: AssetData[];
  factorType?: string;
  allowEmptyValues?: boolean;
  editingData?: {
    id: string;
    factorId?: number;
    value?: number;
    assetId?: string;
    asset_id?: string;
    recordedFactor?: number;
  } | null;
  onSubmit: (data: any) => Promise<void>;
  onEdit: (id: string, data: any) => Promise<void>;
}

const DataInput: React.FC<DataInputProps> = ({
  inputType,
  availableFactors = [],
  availableAssets = [],
  factorType,
  allowEmptyValues = false,
  editingData,
  onSubmit,
  onEdit,
}) => {
  const { orgId = "1" } = useAuth();

  // Process available options
  const factors = useMemo(() => {
    return factorType
      ? availableFactors.filter((f) => f.type === factorType)
      : availableFactors;
  }, [availableFactors, factorType]);

  // Determine what mode to use
  const determineMode = useCallback(() => {
    if (editingData?.assetId || editingData?.asset_id) return "asset";
    if (editingData?.factorId) return "factor";

    switch (inputType) {
      case "asset":
        return "asset";
      case "factor":
        return "factor";
      case "both":
        return factors.length > 0 ? "factor" : "asset";
      default:
        return "factor";
    }
  }, [editingData, inputType, factors]);

  // State management
  const [currentMode, setCurrentMode] = useState(determineMode);
  const [selectedFactorId, setSelectedFactorId] = useState(() => {
    return editingData?.factorId || factors[0]?.id || 0;
  });
  const [selectedAssetId, setSelectedAssetId] = useState(() => {
    return (
      editingData?.assetId ||
      editingData?.asset_id ||
      availableAssets[0]?.id ||
      ""
    );
  });
  const [numericValue, setNumericValue] = useState(() => {
    return editingData?.value?.toString() || "";
  });

  // Get current selections
  const currentFactor = useMemo(
    () => factors.find((f) => f.id === selectedFactorId),
    [factors, selectedFactorId],
  );

  const currentAsset = useMemo(
    () => availableAssets.find((a) => a.id === selectedAssetId),
    [availableAssets, selectedAssetId],
  );

  // Calculate emissions
  const emissions = useMemo(() => {
    const value = parseFloat(numericValue) || 0;

    if (currentMode === "factor" && currentFactor) {
      return (value * currentFactor.factor).toFixed(2);
    }

    if (currentMode === "asset" && currentAsset) {
      return (
        value *
        currentAsset.factor *
        currentAsset.conversion_rate
      ).toFixed(2);
    }

    return "0";
  }, [currentMode, currentFactor, currentAsset, numericValue]);

  // Handlers
  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;

      // Allow empty for typing
      if (input === "") {
        setNumericValue("");
        return;
      }

      // Handle decimal point at start
      if (input === ".") {
        setNumericValue("0.");
        return;
      }

      // Validate numeric input with optional decimal
      if (/^\d*\.?\d*$/.test(input)) {
        // Remove leading zeros unless it's "0." or just "0"
        const cleaned = input.replace(/^0+(?=\d)/, "");
        setNumericValue(cleaned);
      }
    },
    [],
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const value = parseFloat(numericValue) || 0;

      if (!allowEmptyValues && value === 0) {
        alert("Please enter a value greater than 0");
        return;
      }

      if (editingData) {
        const confirmEdit = window.confirm("Save changes?");
        if (!confirmEdit) return;
      }

      const payload =
        currentMode === "factor"
          ? {
              factorId: selectedFactorId,
              value,
              ...(editingData
                ? {}
                : { orgId, factorValue: currentFactor?.factor }),
            }
          : {
              asset_id: selectedAssetId,
              value,
              recordedFactor: currentAsset?.factor,
              ...(editingData ? {} : { orgId }),
            };

      try {
        if (editingData) {
          await onEdit(editingData.id, payload);
        } else {
          await onSubmit(payload);
          setNumericValue("");
        }
      } catch (error) {
        console.error("Submission error:", error);
      }
    },
    [
      numericValue,
      allowEmptyValues,
      editingData,
      currentMode,
      selectedFactorId,
      selectedAssetId,
      currentFactor,
      currentAsset,
      orgId,
      onEdit,
      onSubmit,
    ],
  );

  // Check data availability
  const hasValidOptions =
    currentMode === "factor" ? factors.length > 0 : availableAssets.length > 0;

  if (!hasValidOptions) {
    return (
      <div
        className={css({
          p: 4,
          border: "1px solid",
          borderColor: "neutral.400",
          bg: "white",
          borderRadius: "md",
          textAlign: "center",
          color: "gray.600",
        })}
      >
        No {currentMode === "factor" ? "factors" : "assets"} available
      </div>
    );
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className={css({
        p: 4,
        border: "1px solid",
        borderColor: "neutral.400",
        bg: "white",
        borderRadius: "md",
      })}
    >
      <div className={flex({ flexDirection: "column", gap: 4 })}>
        {/* Mode selector for "both" type */}
        {inputType === "both" &&
          factors.length > 0 &&
          availableAssets.length > 0 && (
            <div className={flex({ gap: 2 })}>
              {["factor", "asset"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setCurrentMode(mode as "factor" | "asset");
                    setNumericValue("");
                  }}
                  className={css({
                    flex: 1,
                    p: 2,
                    borderRadius: "md",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                    bg: currentMode === mode ? "blue.500" : "gray.100",
                    color: currentMode === mode ? "white" : "gray.700",
                    "&:hover": {
                      bg: currentMode === mode ? "blue.600" : "gray.200",
                    },
                  })}
                >
                  {mode} Input
                </button>
              ))}
            </div>
          )}

        {/* Factor selection */}
        {currentMode === "factor" && (
          <>
            <div>
              <label
                className={css({
                  display: "block",
                  mb: 1,
                  fontSize: "sm",
                  fontWeight: "medium",
                })}
              >
                Select Factor
              </label>
              <select
                value={selectedFactorId}
                onChange={(e) => setSelectedFactorId(Number(e.target.value))}
                className={css({
                  width: "full",
                  p: 2,
                  border: "1px solid",
                  borderColor: "neutral.300",
                  borderRadius: "md",
                  bg: "white",
                  "&:focus": {
                    outline: "2px solid",
                    outlineColor: "blue.400",
                    outlineOffset: "1px",
                  },
                })}
              >
                {factors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.name} ({factor.subType}) - {factor.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={css({
                  display: "block",
                  mb: 1,
                  fontSize: "sm",
                  fontWeight: "medium",
                })}
              >
                Value {currentFactor && `(${currentFactor.unit})`}
              </label>
              <input
                type="text"
                value={numericValue}
                onChange={handleValueChange}
                placeholder="0"
                className={css({
                  width: "full",
                  p: 2,
                  border: "1px solid",
                  borderColor: "neutral.300",
                  borderRadius: "md",
                  "&:focus": {
                    outline: "2px solid",
                    outlineColor: "blue.400",
                    outlineOffset: "1px",
                  },
                })}
              />
            </div>
          </>
        )}

        {/* Asset selection */}
        {currentMode === "asset" && (
          <>
            <div>
              <label
                className={css({
                  display: "block",
                  mb: 1,
                  fontSize: "sm",
                  fontWeight: "medium",
                })}
              >
                Select Asset
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className={css({
                  width: "full",
                  p: 2,
                  border: "1px solid",
                  borderColor: "neutral.300",
                  borderRadius: "md",
                  bg: "white",
                  "&:focus": {
                    outline: "2px solid",
                    outlineColor: "blue.400",
                    outlineOffset: "1px",
                  },
                })}
              >
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} - {asset.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={css({
                  display: "block",
                  mb: 1,
                  fontSize: "sm",
                  fontWeight: "medium",
                })}
              >
                Quantity {currentAsset && `(${currentAsset.unit})`}
              </label>
              <input
                type="text"
                value={numericValue}
                onChange={handleValueChange}
                placeholder="0"
                className={css({
                  width: "full",
                  p: 2,
                  border: "1px solid",
                  borderColor: "neutral.300",
                  borderRadius: "md",
                  "&:focus": {
                    outline: "2px solid",
                    outlineColor: "blue.400",
                    outlineOffset: "1px",
                  },
                })}
              />
            </div>
          </>
        )}

        {/* Emissions display */}
        {parseFloat(numericValue) > 0 && (
          <div
            className={css({
              p: 3,
              bg: "gray.50",
              borderRadius: "md",
              fontSize: "sm",
              color: "gray.700",
            })}
          >
            <div className={css({ fontWeight: "medium", mb: 1 })}>
              Estimated Emissions
            </div>
            <div
              className={css({
                fontSize: "lg",
                fontWeight: "bold",
                color: "blue.600",
              })}
            >
              {emissions} Kg CO₂e
            </div>
            {currentMode === "asset" && currentAsset && (
              <div
                className={css({ mt: 2, fontSize: "xs", color: "gray.600" })}
              >
                Energy:{" "}
                {(parseFloat(numericValue) * currentAsset.factor).toFixed(2)}{" "}
                {currentAsset.factor_unit || "kWh"}
              </div>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!numericValue || parseFloat(numericValue) === 0}
          className={css({
            p: 2.5,
            bg: "blue.500",
            color: "white",
            borderRadius: "md",
            fontWeight: "medium",
            transition: "all 0.2s",
            "&:hover:not(:disabled)": {
              bg: "blue.600",
            },
            "&:disabled": {
              opacity: 0.5,
              cursor: "not-allowed",
            },
          })}
        >
          {editingData ? "Update" : "Submit"}
        </button>
      </div>
    </form>
  );
};

export default DataInput;
