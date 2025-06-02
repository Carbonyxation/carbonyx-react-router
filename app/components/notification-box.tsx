import { css } from "carbonyxation/css";
import { flex, hstack } from "carbonyxation/patterns";
import { button } from "./button";

import { Link } from "react-router";

interface Props {
  title: string;
  content: string;
  buttonText: string;
  actionLink: string;
  color: "primary" | "accent";
}

export default function PlanBox({
  title,
  content,
  buttonText,
  actionLink,
  color,
}: Props) {
  return (
    <div
      className={flex({
        maxWidth: "full",
        flexDir: "column",
        paddingY: 3,
        paddingX: 4,
        margin: 2,
        borderColor: "black",
        borderStyle: "solid",
        borderWidth: 1,
        rounded: "xl",
      })}
    >
      <span
        className={css({
          fontSize: 18,
          fontWeight: "semibold",
        })}
      >
        {title}
      </span>

      <span
        className={css({
          color: "neutral.600",
          marginBottom: 2,
        })}
      >
        {content}
      </span>

      <Link
        to={actionLink}
        className={flex({
          flexDir: "column",
          maxWidth: "full",
        })}
      >
        <button
          className={button({
            color: color,
          })}
        >
          {buttonText}
        </button>
      </Link>
    </div>
  );
}
