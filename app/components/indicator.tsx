import { css } from "carbonyxation/css";
import { hstack, vstack } from "carbonyxation/patterns";

interface Props {
  label: string;
  value: number;
  previous?: number;
  valueTrend?: "positive" | "negative";
  unit: string;
}

export default function Indicator({
  label,
  value,
  unit,
  previous,
  valueTrend = "negative",
}: Props) {
  return (
    <div
      className={hstack({
        bg: "white",
        border: "1px solid",
        minW: 40,
        h: 28,
        rounded: "2xl",
        p: 2,
        justifyContent: "center",
        alignItems: "center",
      })}
    >
      <div>
        <span
          className={css({
            fontSize: 12,
            fontWeight: "thin",
          })}
        >
          {label}
        </span>
        <span
          className={hstack({
            alignItems: "end",
          })}
        >
          <span
            className={css({
              fontWeight: "bold",
              fontSize: 50,
              lineHeight: 0.9,
            })}
          >
            {value.toFixed(1)}
          </span>
          <div
            className={vstack({
              alignItems: "start",
              justifyContent: previous ? "space-between" : "end",
              gap: 1,
              h: "full",
              padding: 0,
              margin: 0,
              border: 0,
              fontSize: 12,
              fontWeight: "thin",
              color: "gray.500",
            })}
          >
            {previous && (
              <span
                className={css({
                  fontSize: 12,
                  color:
                    (value > previous && valueTrend === "negative") ||
                    (value < previous && valueTrend === "positive")
                      ? "red"
                      : "green",
                })}
              >
                {value > previous ? "▲" : "▼"}
                {Math.abs(value - previous).toFixed(1)}
              </span>
            )}
            <span
              className={css({
                fontSize: 12,
              })}
            >
              {unit}
            </span>
          </div>
        </span>
      </div>
    </div>
  );
}
