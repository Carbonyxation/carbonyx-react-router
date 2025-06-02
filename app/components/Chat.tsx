import { css } from "carbonyxation/css";
import { flex, hstack } from "carbonyxation/patterns";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "~/components/messagebubble";
import { micromark } from "micromark";
import type { Notebook } from "~/db/schema";
import type { Message } from "ai";
import { useChat } from "@ai-sdk/react";
import { button } from "./button";
import {
  arrow,
  FloatingArrow,
  autoUpdate,
  FloatingFocusManager,
  useFloating,
  useDismiss,
  useClick,
  useRole,
  useInteractions,
} from "@floating-ui/react";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { ArrowUp, Clock, Trash, PencilLine, Share } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React from "react";

interface Props {
  initialMessagesCurrentNotebook: Message[] | null;
  currentNotebook: Notebook | null;
  initialMessage?: string | null;
  currentUserId?: string;
}

export default function Chat({
  initialMessagesCurrentNotebook,
  currentNotebook,
  initialMessage,
  currentUserId,
}: Props) {
  const isNotebookOwner = currentNotebook?.userId === currentUserId;

  const micromarkOpts = {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  };
  const [emptyConvo, setEmptyConvo] = useState(true);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef(null);
  const [isActionToolTipOpen, setIsActionToolTipOpen] = useState(false);
  const arrowRef = useRef(null);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);

  // New state for rename functionality
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentNotebook?.name || "");

  // Safely initialize with empty array if initialMessagesCurrentNotebook is null
  const initialMessages = initialMessagesCurrentNotebook?.messages || [];

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: aiHandleSubmit,
    append,
    isLoading,
  } = currentNotebook
    ? useChat({
        id: currentNotebook.id,
        initialMessages: initialMessages,
        sendExtraMessageFields: true,
        onFinish: () => {
          // Force the UI to update after receiving a response
          setEmptyConvo(false);
        },
      })
    : {
        messages: [],
        input: "",
        handleInputChange: () => {},
        handleSubmit: () => {},
        append: () => {},
        isLoading: false,
      };

  const {
    refs: actionToolTipRefs,
    floatingStyles,
    context,
    middlewareData,
  } = useFloating({
    open: isActionToolTipOpen,
    onOpenChange: setIsActionToolTipOpen,
    middleware: [
      arrow({
        element: arrowRef,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, {
    role: "tooltip",
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // Handler for delete button
  const handleDelete = () => {
    if (!isNotebookOwner) return;
    if (confirm("Are you sure you want to delete this notebook?")) {
      // Submit a form to the server
      const form = document.createElement("form");
      form.method = "POST";

      const actionInput = document.createElement("input");
      actionInput.type = "hidden";
      actionInput.name = "action";
      actionInput.value = "delete";
      form.appendChild(actionInput);

      const notebookIdInput = document.createElement("input");
      notebookIdInput.type = "hidden";
      notebookIdInput.name = "notebookId";
      notebookIdInput.value = currentNotebook?.id || "";
      form.appendChild(notebookIdInput);

      document.body.appendChild(form);
      form.submit();
      form.remove();
    }
  };

  // Handler for rename button click
  const handleRenameClick = () => {
    if (currentNotebook && isNotebookOwner) {
      setNewName(currentNotebook.name);
      setIsRenaming(true);
      setIsActionToolTipOpen(false); // Close the action tooltip
    }
  };

  // Handler for rename form submission
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentNotebook && newName.trim()) {
      // Submit a form to the server
      const form = document.createElement("form");
      form.method = "POST";

      const actionInput = document.createElement("input");
      actionInput.type = "hidden";
      actionInput.name = "action";
      actionInput.value = "rename";
      form.appendChild(actionInput);

      const notebookIdInput = document.createElement("input");
      notebookIdInput.type = "hidden";
      notebookIdInput.name = "notebookId";
      notebookIdInput.value = currentNotebook.id;
      form.appendChild(notebookIdInput);

      const newNameInput = document.createElement("input");
      newNameInput.type = "hidden";
      newNameInput.name = "newName";
      newNameInput.value = newName;
      form.appendChild(newNameInput);

      document.body.appendChild(form);
      form.submit();
      form.remove();

      setIsRenaming(false);
    }
  };

  // Scroll to the bottom of the messages container whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    // Check if we have either:
    // 1. Messages from the database (initialMessagesCurrentNotebook)
    // 2. Messages from the useChat state (messages)
    // 3. An initial message being processed
    const hasInitialMessages =
      initialMessagesCurrentNotebook?.messages?.length > 0;
    const hasCurrentMessages = messages.length > 0;
    const hasInitialMessageParameter = Boolean(
      currentNotebook && initialMessage && !initialMessageProcessed,
    );
    const conversationIsEmpty =
      !hasInitialMessages && !hasCurrentMessages && !hasInitialMessageParameter;
    // Set the state based on our comprehensive check
    setEmptyConvo(conversationIsEmpty);
    // Log for debugging
    console.log("Conversation state:", {
      hasInitialMessages,
      hasCurrentMessages,
      hasInitialMessageParameter,
      conversationIsEmpty,
    });
  }, [
    initialMessagesCurrentNotebook,
    messages,
    currentNotebook,
    initialMessage,
    initialMessageProcessed,
  ]);

  const hasInitialMessageBeenProcessed = useRef(false);

  // In Chat.tsx
  useEffect(() => {
    // Use a ref to ensure we don't trigger this multiple times
    const processInitialMessage = async () => {
      // Only process if we have a currentNotebook, initialMessage exists,
      // and we haven't processed it yet (both in state and ref)
      if (
        currentNotebook &&
        initialMessage &&
        !initialMessageProcessed &&
        !hasInitialMessageBeenProcessed.current
      ) {
        // Set the ref immediately to prevent duplicate processing
        hasInitialMessageBeenProcessed.current = true;
        // Set the state
        setInitialMessageProcessed(true);
        // Clean up URL first to avoid further triggering
        if (window.history.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete("initialMessage");
          window.history.replaceState({}, document.title, url.toString());
        }
        // Then append the message (this will trigger the AI)
        await append({
          role: "user",
          content: initialMessage,
        });
        // Force UI update
        setEmptyConvo(false);
      }
    };
    processInitialMessage();
    // Remove `append` from the dependencies to avoid re-triggering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNotebook, initialMessage, initialMessageProcessed]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputValue = messageInputRef.current?.value || "";
    if (inputValue.trim() === "") return;
    console.log(inputValue);
    console.log(currentNotebook);
    if (currentNotebook) {
      // For existing notebook - use AI chat
      aiHandleSubmit(e);
    } else {
      // For new notebook creation, use a form with method POST
      const form = document.createElement("form");
      form.method = "POST";
      // Add the message as hidden input
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = "message";
      hiddenInput.value = inputValue;
      form.appendChild(hiddenInput);
      document.body.appendChild(form);
      form.submit();
      form.remove();
    }
    if (messageInputRef.current) {
      messageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    messageInputRef.current?.focus();
  }, []);

  // Add these state variables to your Chat component
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCurrentlyShared, setIsCurrentlyShared] = useState(
    currentNotebook?.shared || false,
  );

  useEffect(() => {
    if (currentNotebook) {
      setIsCurrentlyShared(currentNotebook.shared || false);
    }
  }, [currentNotebook]);

  // Add this handler function to your Chat component
  const handleShareClick = () => {
    if (currentNotebook && isNotebookOwner) {
      setIsShareModalOpen(true);
      setIsActionToolTipOpen(false); // Close the action tooltip
    }
  };

  // Add this submit handler function to your Chat component
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentNotebook) {
      // Submit a form to the server
      const form = document.createElement("form");
      form.method = "POST";

      const actionInput = document.createElement("input");
      actionInput.type = "hidden";
      actionInput.name = "action";
      actionInput.value = "toggleShare";
      form.appendChild(actionInput);

      const notebookIdInput = document.createElement("input");
      notebookIdInput.type = "hidden";
      notebookIdInput.name = "notebookId";
      notebookIdInput.value = currentNotebook.id;
      form.appendChild(notebookIdInput);

      const currentSharedStatusInput = document.createElement("input");
      currentSharedStatusInput.type = "hidden";
      currentSharedStatusInput.name = "currentSharedStatus";
      currentSharedStatusInput.value = isCurrentlyShared.toString();
      form.appendChild(currentSharedStatusInput);

      document.body.appendChild(form);
      form.submit();
      form.remove();

      setIsShareModalOpen(false);
    }
  };

  return (
    <div
      className={css({
        height: "100%",
        width: "100%",
        padding: 4,
      })}
    >
      <div
        className={flex({
          flexDir: "column",
          justifyContent: "space-between",
          height: "100%",
          width: "100%",
          gap: 4,
        })}
      >
        {currentNotebook && !emptyConvo && (
          <div
            className={hstack({
              justifyContent: "space-between",
            })}
          >
            <div
              className={flex({
                flexDir: "column",
              })}
            >
              <span
                className={css({
                  fontSize: 24,
                  fontWeight: "semibold",
                })}
              >
                {currentNotebook.name}
              </span>
              <span className={flex({ gap: 2, alignItems: "center" })}>
                <Clock size={18} /> Created:{" "}
                {new Date(currentNotebook.timestamp).toLocaleString()}
              </span>
            </div>
            {isNotebookOwner ? (
              <button
                className={button({
                  variant: "solid",
                  color: "accent",
                })}
                aria-describedby="action-tooltip"
                ref={actionToolTipRefs.setReference}
                {...getReferenceProps()}
              >
                Action
              </button>
            ) : (
              <div
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  bg: "gray.100",
                  color: "gray.600",
                  rounded: "md",
                  fontSize: "sm",
                })}
              >
                <Share size={14} /> Shared with you
              </div>
            )}
            <AnimatePresence>
              {isActionToolTipOpen && isNotebookOwner && (
                <FloatingFocusManager context={context} modal={false}>
                  <motion.div
                    id="action-tooltip"
                    className={css({
                      bg: "neutral.200",
                      p: 1,
                      zIndex: 10,
                      mt: 2,
                      rounded: "md",
                    })}
                    role="tooltip"
                    ref={actionToolTipRefs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={hstack({
                        gap: 1,
                        px: 4,
                        py: 2,
                        rounded: "md",
                        cursor: "pointer",
                        color: "red.700",
                        _hover: {
                          bg: "red.200",
                        },
                      })}
                      onClick={handleDelete}
                    >
                      <Trash size={18} /> Delete
                    </div>
                    <div
                      className={hstack({
                        gap: 1,
                        px: 4,
                        py: 2,
                        rounded: "md",
                        cursor: "pointer",
                        _hover: {
                          bg: "accent.50",
                        },
                      })}
                      onClick={handleRenameClick}
                    >
                      <PencilLine size={18} /> Rename
                    </div>

                    <div
                      className={hstack({
                        gap: 1,
                        px: 4,
                        py: 2,
                        rounded: "md",
                        cursor: "pointer",
                        _hover: {
                          bg: "accent.50",
                        },
                      })}
                      onClick={handleShareClick}
                    >
                      <Share size={18} />{" "}
                      {isCurrentlyShared
                        ? "Unshare Notebook"
                        : "Share Notebook"}
                    </div>

                    <FloatingArrow
                      fill="#e5e5e5"
                      ref={arrowRef}
                      context={context}
                    />
                  </motion.div>
                </FloatingFocusManager>
              )}
            </AnimatePresence>
          </div>
        )}
        <div
          className={flex({
            flexDir: "column",
            position: "relative",
            bg: "white",
            height: "100%",
            width: "100%",
            rounded: "2xl",
            border: "solid",
            borderWidth: "1",
            borderColor: "black",
            overflowY: "auto",
            maxWidth: "100%",
          })}
        >
          {emptyConvo ? (
            <div
              className={flex({
                margin: 12,
                marginTop: 32,
                flexDirection: "column",
                height: "full",
              })}
            >
              <div
                className={flex({
                  flexDir: "column",
                })}
              >
                <span
                  className={css({
                    fontSize: "xl",
                    fontWeight: "semibold",
                    color: "darkgreen",
                  })}
                >
                  Pluem AI is your AI Carbon Consultant.
                </span>
                <span
                  className={css({
                    fontSize: "md",
                    color: "neutral.500",
                  })}
                >
                  What are you curious about?
                </span>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <React.Fragment key={message.id}>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <MessageBubble
                            key={`${message.id}-${i}`}
                            message={micromark(part.text, micromarkOpts)}
                            messageType="plain"
                            date={new Date(message.createdAt!).toLocaleString()}
                            author={message.role}
                          />
                        );
                      case "tool-invocation":
                        return (
                          <MessageBubble
                            key={`${message.id}-${i}`}
                            message={part.toolInvocation.result?.query}
                            messageType={
                              part.toolInvocation.result?.type === "sql"
                                ? "sql"
                                : "plain"
                            }
                            date={message.createdAt!.toLocaleString()}
                            author="tool"
                          />
                        );
                      default:
                        return null;
                    }
                  })}
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          <div
            className={css({
              width: "full",
              p: 4,
              position: "sticky",
              bottom: 0,
              backgroundColor: "white",
              zIndex: 10,
              borderTop: "1px solid rgba(0, 0, 0, 0.1)",
              marginTop: "auto",
            })}
          >
            <div
              className={css({
                position: "relative",
              })}
            >
              <form onSubmit={handleFormSubmit}>
                <input
                  onChange={currentNotebook ? handleInputChange : undefined}
                  ref={messageInputRef}
                  className={css({
                    borderColor: "darkgreen",
                    borderWidth: 2,
                    p: 2,
                    pr: 12,
                    border: "solid",
                    boxShadow: "md",
                    shadowColor: "darkgreen",
                    rounded: "md",
                    width: "full",
                    ring: "none",
                    _placeholder: {
                      fontStyle: "italic",
                    },
                  })}
                  placeholder="Ask Pluem..."
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={flex({
                    position: "absolute",
                    w: 7,
                    h: 7,
                    justifyContent: "center",
                    alignItems: "center",
                    bg: "darkgreen",
                    rounded: "full",
                    color: "white",
                    top: "14%",
                    right: 3,
                    cursor: "pointer",
                    opacity: isLoading ? 0.5 : 1,
                  })}
                  disabled={isLoading}
                >
                  <ArrowUp size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      {isRenaming && (
        <div
          className={css({
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bg: "rgba(0, 0, 0, 0.5)",
            zIndex: 50,
          })}
        >
          <div
            className={css({
              bg: "white",
              p: 4,
              rounded: "md",
              maxWidth: "80%",
              width: "400px",
            })}
          >
            <form onSubmit={handleRenameSubmit}>
              <h2 className={css({ fontSize: "xl", mb: 2 })}>
                Rename Notebook
              </h2>
              <input
                className={css({
                  borderColor: "gray.300",
                  borderWidth: 1,
                  p: 2,
                  border: "solid",
                  rounded: "md",
                  width: "full",
                  mb: 4,
                })}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className={hstack({ gap: 2, justifyContent: "flex-end" })}>
                <button
                  type="button"
                  className={button({ variant: "outline" })}
                  onClick={() => setIsRenaming(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={button({ variant: "solid", color: "accent" })}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isShareModalOpen && (
        <div
          className={css({
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bg: "rgba(0, 0, 0, 0.5)",
            zIndex: 50,
          })}
        >
          <div
            className={css({
              bg: "white",
              p: 4,
              rounded: "md",
              maxWidth: "80%",
              width: "400px",
            })}
          >
            <form onSubmit={handleShareSubmit}>
              <h2 className={css({ fontSize: "xl", mb: 2 })}>
                {isCurrentlyShared ? "Unshare Notebook" : "Share Notebook"}
              </h2>
              <p className={css({ mb: 4 })}>
                {isCurrentlyShared
                  ? "This notebook will no longer be accessible to other members of your organization."
                  : "This notebook will be accessible to all members of your organization."}
              </p>
              <div className={hstack({ gap: 2, justifyContent: "flex-end" })}>
                <button
                  type="button"
                  className={button({ variant: "outline" })}
                  onClick={() => setIsShareModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={button({ variant: "solid", color: "accent" })}
                >
                  {isCurrentlyShared ? "Unshare" : "Share"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
