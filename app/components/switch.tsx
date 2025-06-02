// Switch.tsx
import React, { useState } from "react";

import { css } from "carbonyxation/css";
import { hstack } from "carbonyxation/patterns";

interface SwitchProps {
  leftLabel: string;
  rightLabel: string;
  defaultChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({
  leftLabel,
  rightLabel,
  defaultChecked = false,
  onChange,
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const newState = !isChecked;
    setIsChecked(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  return (
    <div
      className={hstack({
        gap: 3,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <span
        className={css({
          fontSize: "sm",
          fontWeight: isChecked ? "normal" : "bold",
          color: isChecked ? "gray.500" : "gray.900",
          cursor: "pointer",
        })}
        onClick={handleToggle}
      >
        {leftLabel}
      </span>

      <label
        className={css({
          position: "relative",
          display: "inline-block",
          width: "48px",
          height: "24px",
          cursor: "pointer",
        })}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleToggle}
          className={css({
            opacity: 0,
            width: 0,
            height: 0,
          })}
        />
        <span
          className={css({
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isChecked
              ? "token(colors.switch.track.active)"
              : "token(colors.switch.track.bg)",
            borderRadius: "34px",
            transition: "background-color 0.2s",
            _before: {
              content: '""',
              position: "absolute",
              height: "20px",
              width: "20px",
              left: "2px",
              bottom: "2px",
              backgroundColor: "token(colors.switch.thumb)",
              borderRadius: "50%",
              transition: "transform 0.2s",
              transform: isChecked ? "translateX(24px)" : "translateX(0)",
            },
          })}
        />
      </label>

      <span
        className={css({
          fontSize: "sm",
          fontWeight: isChecked ? "bold" : "normal",
          color: isChecked ? "gray.900" : "gray.500",
          cursor: "pointer",
        })}
        onClick={handleToggle}
      >
        {rightLabel}
      </span>
    </div>
  );
};

export default Switch;
