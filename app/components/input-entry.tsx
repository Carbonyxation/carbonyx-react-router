import React from "react";
import { css } from "carbonyxation/css";
import type { Styles } from "carbonyxation/css";

export interface TextInputProps {
  id: string;
  label: string;
  value?: string;
  name: string;
  onChange: (name: string, value: string) => void;
  onBlur?: () => void;
  type?: "text" | "number";
  placeholder?: string;
  pattern?: string;
  unit?: string;
  required?: boolean;
  disabled?: boolean;
  className?: Styles | Styles[];
}

const TextInput: React.FC<TextInputProps> = ({
  id,
  label,
  name,
  value = "",
  onChange,
  onBlur,
  type = "text",
  placeholder = "",
  pattern,
  unit = "",
  required = false,
  disabled = false,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(name, e.target.value);
  };

  return (
    <label
      htmlFor={id}
      className={css({
        display: "block",
        width: "full",
        fontWeight: "semibold",
      })}
    >
      {label}
      {unit ? ` (${unit})` : ""}:
      <input
        type={type === "number" ? "text" : type} // Using text for numeric values for better control
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={type === "number" ? "numeric" : "text"}
        pattern={
          pattern || (type === "number" ? "-?[0-9]*\\.?[0-9]*" : undefined)
        }
        required={required}
        disabled={disabled}
        name={name}
        className={css(
          {
            display: "block",
            width: "full",
            p: 2,
            my: 2,
            border: "1px solid",
            borderColor: "neutral.300",
            borderRadius: "md",
            fontWeight: "normal",
          },
          className,
        )}
      />
    </label>
  );
};

export default TextInput;
