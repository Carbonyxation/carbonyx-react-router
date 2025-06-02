import { css } from "carbonyxation/css";
import { flex, hstack, vstack } from "carbonyxation/patterns";
import ProfilePicture from "~/assets/logo_64x.png";

import { format } from "sql-formatter";

// Define the available message types and author roles
type MessageType = "plain" | "sql"; // Can be expanded late r
type AuthorRole = "user" | "assistant" | "tool" | "dataviz";

interface MessageBubbleProps {
  message: string;
  messageType: MessageType;
  author: AuthorRole;
  // Date string to display in the footer
  date?: string;
}

export function MessageBubble({
  message,
  messageType,
  author,
  date,
}: MessageBubbleProps) {
  // Render different message content based on the type
  const renderMessageContent = () => {
    switch (messageType) {
      case "plain":
        return (
          <div
            className={css({
              fontSize: "sm",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              width: "100%",
            })}
            dangerouslySetInnerHTML={{ __html: message }}
          />
        );
      case "sql":
        return (
          <div
            className={css({
              fontSize: "sm",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              width: "100%",
            })}
          >
            {format(message, { language: "sqlite", keywordCase: "upper" })}
          </div>
        );
      // Additional message types can be added here
      default:
        return (
          <div
            className={css({
              fontSize: "sm",
              lineHeight: "1.5",
              width: "100%",
            })}
          >
            {message}
          </div>
        );
    }
  };

  // Render date footer if date is provided
  const renderDateFooter = () => {
    if (!date) return null;

    return (
      <div
        className={css({
          fontSize: "xs",
          color: "neutral.500",
          marginTop: 1,
        })}
      >
        {date}
      </div>
    );
  };

  // Apply different styles based on the author
  const getMessageStyles = () => {
    const baseStyles = {
      width: "100%",
      padding: 4,
      paddingLeft: author === "user" ? 12 : 4, // Additional padding for user messages
      borderBottom: "1px solid",
      borderBottomColor: "neutral.200",
    };

    switch (author) {
      case "user":
        return css({
          ...baseStyles,
          bg: "neutral.50",
        });
      case "assistant":
        return css({
          ...baseStyles,
          bg: "white",
        });
      case "tool":
        return css({
          ...baseStyles,
          bg: "neutral.50",
          borderLeft: "2px solid",
          borderLeftColor: "neutral.300",
        });
      case "dataviz":
        return css({
          ...baseStyles,
          bg: "white",
          borderLeft: "2px solid",
          borderLeftColor: "accent.300",
        });
      default:
        return css(baseStyles);
    }
  };

  // Render the message container based on author role
  const renderMessage = () => {
    // For assistant messages with profile picture
    if (author === "assistant") {
      return (
        <div
          className={hstack({
            width: "100%",
            gap: 3,
            alignItems: "flex-start",
          })}
        >
          {/* Profile picture */}
          <div
            className={css({
              width: 8,
              height: 8,
              borderRadius: "full",
              overflow: "hidden",
              flexShrink: 0,
              border: "1px solid",
              borderColor: "neutral.200",
            })}
          >
            <img
              src={ProfilePicture}
              alt="Assistant"
              className={css({
                width: "100%",
                height: "100%",
                objectFit: "cover",
              })}
            />
          </div>

          {/* Message content and date */}
          <div
            className={vstack({
              alignItems: "flex-start",
              flex: 1,
              width: "80%",
            })}
          >
            {renderMessageContent()}
            {renderDateFooter()}
          </div>
        </div>
      );
    }

    // For tool messages with icon
    if (author === "tool") {
      return (
        <div
          className={hstack({
            width: "100%",
            gap: 3,
            alignItems: "flex-start",
          })}
        >
          {/* Tool icon */}
          <div
            className={flex({
              w: 8,
              h: 8,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "full",
              bg: "neutral.100",
              flexShrink: 0,
            })}
          >
            <i className="fa-duotone fa-tools"></i>
          </div>

          {/* Message content and date */}
          <div
            className={vstack({
              alignItems: "flex-start",
              spacing: 0.5,
              flex: 1,
              color: "neutral.600",
              fontFamily: "monospace",
            })}
          >
            {renderMessageContent()}
            {renderDateFooter()}
          </div>
        </div>
      );
    }

    // For dataviz messages with icon
    if (author === "dataviz") {
      return (
        <div
          className={hstack({
            width: "100%",
            gap: 3,
            alignItems: "flex-start",
          })}
        >
          {/* Dataviz icon */}
          <div
            className={flex({
              w: 8,
              h: 8,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "full",
              bg: "accent.100",
              flexShrink: 0,
            })}
          >
            <i className="fa-duotone fa-chart-simple"></i>
          </div>

          {/* Message content and date */}
          <div
            className={vstack({
              alignItems: "flex-start",
              spacing: 0.5,
              flex: 1,
            })}
          >
            {renderMessageContent()}
            {renderDateFooter()}
          </div>
        </div>
      );
    }

    // For user messages (and default case)
    return (
      <div
        className={vstack({
          alignItems: "flex-start",
          spacing: 0.5,
          width: "100%",
        })}
      >
        {renderMessageContent()}
        {renderDateFooter()}
      </div>
    );
  };

  return <div className={getMessageStyles()}>{renderMessage()}</div>;
}
