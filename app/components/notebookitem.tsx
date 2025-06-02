import { css } from "carbonyxation/css";
import { flex, hstack, vstack } from "carbonyxation/patterns";
import { useLocation } from "react-router";
import { Link } from "react-router";

interface NotebookItemProps {
  title: string;
  date: string;
  notebookId: string;
}

export function NotebookItem({ title, date, notebookId }: NotebookItemProps) {
  const location = useLocation();
  const currentRoute = location.pathname;

  // Check if this item is active
  const isActive =
    notebookId && currentRoute === `/dashboard/notebook/${notebookId}`;

  return (
    <Link
      to={`/dashboard/notebook/${notebookId}`}
      prefetch="intent"
      className={css({ display: "block" })}
    >
      <div
        className={hstack({
          gap: 2,
          padding: 2,
          cursor: "pointer",
          borderBottom: "1px solid",
          borderBottomColor: "neutral.400",
          position: "relative",
          overflow: "hidden",
          bg: "white",
          _before: {
            content: "''",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transition: "opacity 0.4s ease-in-out",
            opacity: isActive ? 1 : 0,
            bgGradient: "to-r",
            gradientFrom: "green.50",
            gradientTo: "accent.50",
          },
          _hover: {
            _before: {
              opacity: 1,
              bgGradient: "to-r",
              gradientFrom: "green.50",
              gradientTo: "accent.50",
            },
          },
        })}
      >
        <div
          className={flex({
            w: 6,
            zIndex: 1,
            justifyContent: "center",
            alignItems: "center",
            fontSize: "sm",
          })}
        >
          <i className="fa-duotone fa-message-bot"></i>
        </div>
        <div
          className={vstack({
            alignItems: "flex-start",
            spacing: 0.5,
            zIndex: 1,
            flex: 1,
          })}
        >
          <div
            className={css({
              fontSize: "sm",
              fontWeight: isActive ? "bold" : "medium",
            })}
          >
            {title}
          </div>
          <div
            className={css({
              fontSize: "xs",
              color: "neutral.600",
            })}
          >
            {date}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Keep MenuSection for organization if needed
interface MenuSectionProps {
  children: React.ReactNode;
  title?: string;
}

export function MenuSection({ children, title }: MenuSectionProps) {
  return (
    <div className={css({ marginBottom: 2 })}>
      {title && (
        <div
          className={css({
            fontSize: "xs",
            fontWeight: "semibold",
            textTransform: "uppercase",
            color: "neutral.600",
            padding: "2",
            paddingLeft: "4",
          })}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
