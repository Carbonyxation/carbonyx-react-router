import { css } from "carbonyxation/css";
import { flex, vstack } from "carbonyxation/patterns";

export default function ComingSoon() {
  return (
    <div
      className={vstack({
        justifyContent: "center",
        alignItems: "center",
        h: "svh",
      })}
    >
      <span
        className={css({
          fontSize: "4xl",
          fontWeight: "semibold",
        })}
      >
        Coming soon 🚀
      </span>
      <span
        className={css({
          fontSize: "xl",
        })}
      >
        We are working hard to get this going!
      </span>
    </div>
  );
}
