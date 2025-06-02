import { css } from "carbonyxation/css";
import { flex, hstack } from "carbonyxation/patterns";
import { useLocation } from "react-router";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MenuItemProps {
  icon?:
    | "home"
    | "information"
    | "history"
    | "circle"
    | "question"
    | "gear"
    | "emissions"
    | "assets"
    | "integration"
    | "custom_factor"
    | "location"
    | "comment"
    | "none"
    | "money";
  text: string;
  route?: string;
  children?: React.ReactNode;
  level?: number;
  exact?: boolean;
  pad?: 1 | 2 | 4;
}

function getIcon(icon: MenuItemProps["icon"]) {
  switch (icon) {
    case "home":
      return <i className="fa-solid fa-house"></i>;
    case "information":
      return <i className="fa-solid fa-circle-info" />;
    case "history":
      return <i className="fa-solid fa-clock-rotate-left" />;
    case "circle":
      return <i className="fa-light fa-circle" />;
    case "question":
      return <i className="fa-solid fa-circle-question" />;
    case "gear":
      return <i className="fa-solid fa-gear" />;
    case "emissions":
      return <i className="fa-solid fa-smog" />;
    case "assets":
      return <i className="fa-solid fa-building" />;
    case "integration":
      return <i className="fa-solid fa-puzzle" />;
    case "custom_factor":
      return <i className="fa-solid fa-pencil" />;
    case "location":
      return <i className="fa-solid fa-location-dot" />;
    case "comment":
      return <i className="fa-solid fa-comment" />;
    case "money":
      return <i className="fa-solid fa-bank" />;
    default:
      return <i className="fa-solid fa-angle-right" />;
  }
}

export function MenuItem({
  icon,
  text,
  route,
  children,
  level = 0,
  exact = false,
  pad = 1,
}: MenuItemProps) {
  const location = useLocation();
  const currentRoute = location.pathname;
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = Boolean(children);

  // Check if this item or any of its children is active
  const isActive =
    route &&
    (exact
      ? currentRoute === route
      : currentRoute.startsWith(route) &&
        // Check that the next character is a slash or the end of the string
        (currentRoute.length === route.length ||
          currentRoute.charAt(route.length) === "/"));

  // Automatically open submenu if a child is active
  const isChildActive =
    currentRoute.startsWith(route || "") && currentRoute !== route;

  useEffect(() => {
    if (isChildActive) {
      setIsOpen(true);
    }
  }, [isChildActive, location]);

  const menuItemContent = (
    <>
      <div
        className={flex({
          w: 6,
          zIndex: 1,
          justifyContent: "center",
          alignItems: "center",
          fontSize: "sm",
          p: pad,
        })}
      >
        {getIcon(icon)}
      </div>
      <div
        className={css({
          zIndex: 1,
          fontSize: "sm",
          fontWeight: isActive ? "bold" : "medium",
          flex: 1,
        })}
      >
        {text}
      </div>
      {hasChildren && (
        <div
          className={css({
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform 0.3s",
          })}
        >
          <i className="fa-solid fa-angle-right" />
        </div>
      )}
    </>
  );

  // Wrapper for menu item content
  const MenuItem = ({ children }: { children: React.ReactNode }) => (
    <div
      className={hstack({
        gap: 2,
        padding: 2,
        paddingLeft: `${level * 4 + 2}`, // Increase indentation for submenu items
        cursor: hasChildren || route ? "pointer" : "default",
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
      onClick={() => hasChildren && setIsOpen(!isOpen)}
    >
      {children}
    </div>
  );

  return (
    <>
      {route && !hasChildren ? (
        <Link
          to={route}
          prefetch="intent"
          className={css({ display: "block" })}
        >
          <MenuItem>{menuItemContent}</MenuItem>
        </Link>
      ) : (
        <MenuItem>{menuItemContent}</MenuItem>
      )}

      {hasChildren && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={css({ overflow: "hidden" })}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

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
