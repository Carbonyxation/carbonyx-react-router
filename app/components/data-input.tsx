import { useAuth } from "@clerk/react-router";
import { css } from "carbonyxation/css";
import { flex } from "carbonyxation/patterns";
import React, { useState, useEffect, useRef } from "react";

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
  factor: number; // Updated from kwh_per_asset to factor
  unit: string;
  factor_unit?: string; // Added for the new schema
  factor_name?: string; // Added for the new schema
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
    asset_id?: string; // Support both naming conventions
    recordedFactor?: number;
  } | null;
  onSubmit: (data: any) => Promise<void>;
  onEdit: (id: string, data: any) => Promise<void>;
}

const DataInput = ({
  inputType = "factor",
  availableFactors = [],
  availableAssets = [],
  factorType = "",
  allowEmptyValues = false,
  editingData = null,
  onSubmit,
  onEdit,
}: DataInputProps) => {
  // Determine which mode we're in based on inputType and available data
  const [mode, setMode] = useState<"factor" | "asset">(
    inputType === "asset" ? "asset" : "factor"
  );
  
  // Factor input state
  const [factorId, setFactorId] = useState<number>(0);
  const [value, setValue] = useState<number | "">(0);
  const [inputValue, setInputValue] = useState<string>("0");
  
  // Asset input state
  const [assetId, setAssetId] = useState<string>("");
  const [assetValue, setAssetValue] = useState<number | "">(0);
  const [assetValueInput, setAssetValueInput] = useState<string>("0");
  
  const auth = useAuth();
  const orgId = auth.orgId || "1";
  
  // Get filtered lists based on availability
  const filteredFactors = factorType ?
    availableFactors.filter(factor => factor.type === factorType) :
    availableFactors;
  const hasFactors = filteredFactors.length > 0;
  const hasAssets = availableAssets.length > 0;
  
  // Initialize with first available option or from editingData
  useEffect(() => {
    if (filteredFactors.length > 0 && factorId === 0) {
      setFactorId(filteredFactors[0].id);
    }
    if (availableAssets.length > 0 && assetId === "") {
      setAssetId(availableAssets[0].id);
    }
  }, [filteredFactors, availableAssets]);
  
  // Handle editing data - updated to properly handle changes to editingData
  useEffect(() => {
    if (editingData) {
      // Reset based on mode and what data is available
      if (inputType === "asset" || ((editingData.assetId || editingData.asset_id) && inputType === "both")) {
        setMode("asset");
        if (editingData.assetId) setAssetId(editingData.assetId);
        if (editingData.asset_id) setAssetId(editingData.asset_id);
        if (editingData.value !== undefined) {
          setAssetValue(editingData.value);
          setAssetValueInput(editingData.value.toString());
        }
      } else {
        setMode("factor");
        if (editingData.factorId) setFactorId(editingData.factorId);
        if (editingData.value !== undefined) {
          setValue(editingData.value);
          setInputValue(editingData.value.toString());
        }
      }
    } else {
      // Reset form when not editing
      if (mode === "factor") {
        setValue(0);
        setInputValue("0");
        if (filteredFactors.length > 0) {
          setFactorId(filteredFactors[0].id);
        }
      } else {
        setAssetValue(0);
        setAssetValueInput("0");
        if (availableAssets.length > 0) {
          setAssetId(availableAssets[0].id);
        }
      }
    }
  }, [editingData, inputType, filteredFactors, availableAssets, mode]);
  
  // Get selected item details
  const selectedFactor = filteredFactors.find(factor => factor.id === factorId);
  const selectedAsset = availableAssets.find(asset => asset.id === assetId);
  
  // Calculate emissions for preview (when applicable)
  const selectedFactorValue = selectedFactor?.factor || 0;
  const calculatedFactorEmission = typeof value === 'number' ?
    Math.round(((value * selectedFactorValue) + Number.EPSILON) * 100) / 100 : 0;
  
  const assetFactorValue = selectedAsset?.factor || 0;
  const calculatedAssetEmission = typeof assetValue === 'number' && selectedAsset ?
    Math.round(((assetValue * assetFactorValue * selectedAsset.conversion_rate) + Number.EPSILON) * 100) / 100 : 0;
  
  // Form handling
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Optional: Add confirmation dialog when editing
    if (editingData) {
      if (!confirm("Are you sure you want to save these changes?")) {
        return; // User canceled
      }
    }
    
    if (mode === "factor" && selectedFactor) {
      if (editingData) {
        await onEdit(editingData.id, {
          factorId,
          value: value === "" ? 0 : value,
        });
      } else {
        await onSubmit({
          factorId,
          value: value === "" ? 0 : value,
          orgId,
          factorValue: selectedFactorValue,
        });
      }
      
      // Reset form after submission if not editing
      if (!editingData) {
        setValue(0);
        setInputValue("0");
      }
    } else if (mode === "asset" && selectedAsset) {
      if (editingData) {
        await onEdit(editingData.id, {
          asset_id: assetId,
          value: assetValue === "" ? 0 : assetValue,
          recordedFactor: assetFactorValue,
        });
      } else {
        await onSubmit({
          asset_id: assetId,
          value: assetValue === "" ? 0 : assetValue,
          orgId,
          recordedFactor: assetFactorValue,
        });
      }
      
      // Reset form after submission if not editing
      if (!editingData) {
        setAssetValue(0);
        setAssetValueInput("0");
      }
    }
  };

  // Input handlers
  const handleFactorValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (newValue === "" || newValue === "-") {
      if (allowEmptyValues) {
        setValue(newValue === "" ? "" : 0);
      } else {
        setValue(0);
      }
    } else {
      setValue(Number(newValue));
    }
  };

  const handleAssetValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAssetValueInput(newValue);
    if (newValue === "" || newValue === "-") {
      if (allowEmptyValues) {
        setAssetValue(newValue === "" ? "" : 0);
      } else {
        setAssetValue(0);
      }
    } else {
      setAssetValue(Number(newValue));
    }
  };

  const handleValueBlur = () => {
    if (inputValue === "" || inputValue === "-") {
      setInputValue("0");
      setValue(0);
    }
  };

  const handleAssetValueBlur = () => {
    if (assetValueInput === "" || assetValueInput === "-") {
      setAssetValueInput("0");
      setAssetValue(0);
    }
  };

  // Render factor input form
  const renderFactorForm = () => (
    <>
      <label htmlFor="factor">
        Factor:
        <select
          id="factor"
          value={factorId}
          onChange={(e) => setFactorId(Number(e.target.value))}
          className={css({
            display: "block",
            width: "full",
            p: 2,
            border: "1px solid",
            borderColor: "neutral.300",
            borderRadius: "md",
          })}
        >
          {filteredFactors.map((factor) => (
            <option key={factor.id} value={factor.id}>
              {factor.name} ({factor.subType}) - {factor.unit}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="value">
        Value ({selectedFactor?.unit || ""}):
        <input
          type="text"
          id="value"
          value={inputValue}
          onChange={handleFactorValueChange}
          onBlur={handleValueBlur}
          inputMode="numeric"
          pattern="-?[0-9]*\.?[0-9]*"
          className={css({
            display: "block",
            width: "full",
            p: 2,
            border: "1px solid",
            borderColor: "neutral.300",
            borderRadius: "md",
          })}
        />
      </label>
      {value && selectedFactor && (
        <div className={css({ fontSize: "sm", color: "gray.600" })}>
          Estimated emissions: {calculatedFactorEmission} Kg CO₂e
        </div>
      )}
    </>
  );

  // Render asset input form
  const renderAssetForm = () => (
    <>
      <label htmlFor="asset">
        Asset:
        <select
          id="asset"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className={css({
            display: "block",
            width: "full",
            p: 2,
            border: "1px solid",
            borderColor: "neutral.300",
            borderRadius: "md",
          })}
        >
          {availableAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} - {asset.unit}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="assetValue">
        Quantity ({selectedAsset?.unit || "units"}):
        <input
          type="text"
          id="assetValue"
          value={assetValueInput}
          onChange={handleAssetValueChange}
          onBlur={handleAssetValueBlur}
          inputMode="numeric"
          pattern="-?[0-9]*\.?[0-9]*"
          className={css({
            display: "block",
            width: "full",
            p: 2,
            border: "1px solid",
            borderColor: "neutral.300",
            borderRadius: "md",
          })}
        />
      </label>
      {assetValue && selectedAsset && (
        <div className={css({ fontSize: "sm", color: "gray.600" })}>
          Factor value: {assetFactorValue} {selectedAsset.factor_unit || "kWh"} per {selectedAsset.unit}
          <br />
          Energy equivalent: {(Number(assetValue) * assetFactorValue).toFixed(2)} {selectedAsset.factor_unit || "kWh"}
          <br />
          Estimated emissions: {calculatedAssetEmission} Kg CO₂e
        </div>
      )}
    </>
  );

  // Handle case where no data is available
  if ((inputType === "factor" && !hasFactors) ||
    (inputType === "asset" && !hasAssets) ||
    (inputType === "both" && !hasFactors && !hasAssets)) {
    return (
      <div className={css({
        p: 4,
        border: "1px solid",
        borderColor: "neutral.400",
        bg: "white",
        borderRadius: "md",
      })}>
        No data available for the selected input type.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={css({
        p: 4,
        border: "1px solid",
        borderColor: "neutral.400",
        bg: "white",
        borderRadius: "md",
      })}
    >
      <div className={flex({ flexDirection: "column", gap: 4 })}>
        {/* Show input type selector only if both modes are available and supported */}
        {inputType === "both" && hasFactors && hasAssets && (
          <div className={flex({ gap: 4 })}>
            <button
              type="button"
              onClick={() => setMode("factor")}
              className={css({
                p: 2,
                bg: mode === "factor" ? "blue.500" : "gray.200",
                color: mode === "factor" ? "white" : "gray.700",
                borderRadius: "md",
                flex: 1,
              })}
            >
              Factor Input
            </button>
            <button
              type="button"
              onClick={() => setMode("asset")}
              className={css({
                p: 2,
                bg: mode === "asset" ? "blue.500" : "gray.200",
                color: mode === "asset" ? "white" : "gray.700",
                borderRadius: "md",
                flex: 1,
              })}
            >
              Asset Input
            </button>
          </div>
        )}

        {/* Render the appropriate form based on mode and available data */}
        {mode === "factor" && hasFactors && renderFactorForm()}
        {mode === "asset" && hasAssets && renderAssetForm()}

        <button
          type="submit"
          className={css({
            bg: "blue.500",
            color: "white",
            p: 2,
            borderRadius: "md",
            "&:hover": { bg: "blue.600" },
          })}
        >
          {editingData ? "Save Changes" : "Submit"}
        </button>
      </div>
    </form>
  );
};

export default DataInput;
