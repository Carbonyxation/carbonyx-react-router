// page.tsx (modified)
import { css } from "carbonyxation/css";
import { flex, hstack, vstack } from "carbonyxation/patterns";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Plus } from "lucide-react";
import { button } from "~/components/button";
import React, { useEffect, useRef, useState } from "react";
import { NotebookItem } from "~/components/notebookitem";
import type { Route } from "./+types/pluem-ai";
import { db, pluem_messages, dbc } from "~/db/db";
import { notebook, type Notebook } from "~/db/schema";
import { eq, and, or } from "drizzle-orm";
import { redirect, Await } from "react-router";
import type { DocumentGetResponse } from "nano";
import Chat from "~/components/Chat";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, appendResponseMessages } from "ai";
import { Link } from "react-router";
import { getAuth } from "~/utils/auth-helper";
import { env } from "~/env.server";

export async function loader(args: Route.LoaderArgs) {
  const notebookId = args.params.notebookId;
  const auth = await getAuth(args);
  const orgId = auth.orgId!;
  const userId = auth.userId;

  const allAccessibleNotebooks = (
    await db
      .select()
      .from(notebook)
      .where(
        and(
          eq(notebook.orgId, orgId),
          or(
            eq(notebook.userId, userId), // notebooks owned by the user
            eq(notebook.shared, true), // shared notebooks
          ),
        ),
      )
  ).reverse();

  // Filter in JavaScript to separate into owned vs shared
  const myNotebooks = allAccessibleNotebooks.filter(
    (nb) => nb.userId === userId,
  );
  const sharedNotebooks = allAccessibleNotebooks.filter(
    (nb) => nb.userId !== userId,
  );

  let messages: Promise<DocumentGetResponse> | null = null;
  let currentNotebook: Notebook | null = null;
  let initialMessage = null;

  // Check for the initialMessage in URL params
  const url = new URL(args.request.url);
  initialMessage = url.searchParams.get("initialMessage");

  if (notebookId) {
    // if user does not have access to this specific notebook in the first place, deny them
    if (
      allAccessibleNotebooks.filter((notebook) => notebook.id === notebookId)
        .length === 0
    ) {
      throw redirect("/dashboard/notebook");
    }
    currentNotebook = allAccessibleNotebooks.filter(
      (notebook) => notebook.id === notebookId,
    )[0];

    // Check if messages document exists, if not create it with empty messages array
    try {
      await dbc.auth(env.COUCH_USERNAME, env.COUCH_PASSWORD);
      messages = pluem_messages.get(notebookId);
    } catch (ex) {
      // Document doesn't exist, let's initialize it
      try {
        await pluem_messages.insert({ messages: [] }, notebookId);
        messages = pluem_messages.get(notebookId); // Try getting it again
      } catch (insertError) {
        console.error("Failed to initialize messages document:", insertError);
      }
    }
  }

  return {
    myNotebooks,
    sharedNotebooks,
    currentNotebook,
    messagesAsync: messages,
    initialMessage,
    currentUserId: userId,
  };
}

export async function action(args: Route.ActionArgs) {
  const formData = await args.request.formData();
  const action = formData.get("action") as string;

  const auth = await getAuth(args);
  const orgId = auth.orgId;
  const userId = auth.userId;

  if (!orgId || !userId) throw redirect("/");

  // Create a new notebook (default action if no action specified)
  if (!action || action === "create") {
    const initialMessage = (formData.get("message") as string) || "";
    const newId = crypto.randomUUID();

    // Create the notebook
    await db.insert(notebook).values({
      id: newId,
      userId,
      orgId,
      timestamp: new Date().getTime(),
      name: `New Notebook`,
    });

    // Initialize the messages document as empty
    try {
      await pluem_messages.insert({ messages: [] }, newId);
    } catch (err) {
      console.error("Failed to initialize messages document:", err);
    }

    // Pass the initial message as a URL parameter
    return redirect(
      `/dashboard/notebook/${newId}${initialMessage ? `?initialMessage=${encodeURIComponent(initialMessage)}` : ""}`,
    );
  }

  // Delete a notebook
  if (action === "delete") {
    const notebookId = formData.get("notebookId") as string;

    if (!notebookId) {
      return { error: "Notebook ID is required" };
    }

    // Check if user has access to this notebook (only owner can delete)
    const userNotebooks = await db
      .select()
      .from(notebook)
      .where(
        and(
          eq(notebook.orgId, orgId),
          eq(notebook.userId, userId),
          eq(notebook.id, notebookId),
        ),
      );

    if (userNotebooks.length === 0) {
      return {
        error: "Notebook not found or you do not have permission to delete it",
      };
    }

    // Delete from the database
    await db.delete(notebook).where(eq(notebook.id, notebookId));

    // Delete messages
    try {
      const doc = await pluem_messages.get(notebookId);
      await pluem_messages.destroy(notebookId, doc._rev);
    } catch (err) {
      console.error("Failed to delete messages document:", err);
    }

    return redirect("/dashboard/notebook");
  }

  // Rename a notebook
  if (action === "rename") {
    const notebookId = formData.get("notebookId") as string;
    const newName = formData.get("newName") as string;

    if (!notebookId || !newName) {
      return { error: "Notebook ID and new name are required" };
    }

    // Check if user has access to this notebook
    const userNotebooks = await db
      .select()
      .from(notebook)
      .where(
        and(
          eq(notebook.orgId, orgId),
          eq(notebook.userId, userId),
          eq(notebook.id, notebookId),
        ),
      );

    if (userNotebooks.length === 0) {
      return {
        error: "Notebook not found or you do not have permission to rename it",
      };
    }

    // Update the name
    await db
      .update(notebook)
      .set({ name: newName })
      .where(eq(notebook.id, notebookId));

    return redirect(`/dashboard/notebook/${notebookId}`);
  }

  // Add this inside your action function in page.tsx
  if (action === "toggleShare") {
    const notebookId = formData.get("notebookId") as string;
    const currentSharedStatus = formData.get("currentSharedStatus") === "true";

    if (!notebookId) {
      return { error: "Notebook ID is required" };
    }

    // Check if user has access to this notebook (only owner can share/unshare)
    const userNotebooks = await db
      .select()
      .from(notebook)
      .where(
        and(
          eq(notebook.orgId, orgId),
          eq(notebook.userId, userId),
          eq(notebook.id, notebookId),
        ),
      );

    if (userNotebooks.length === 0) {
      return {
        error:
          "Notebook not found or you do not have permission to share/unshare it",
      };
    }

    // Toggle the shared status
    await db
      .update(notebook)
      .set({ shared: !currentSharedStatus })
      .where(eq(notebook.id, notebookId));

    return redirect(`/dashboard/notebook/${notebookId}`);
  }

  return { error: "Invalid action" };
}

export default function PluemAI({ loaderData }: Route.ComponentProps) {
  return (
    <PanelGroup direction="horizontal">
      <Panel minSize={30} defaultSize={30} maxSize={50}>
        {/* Nested vertical PanelGroup */}
        <PanelGroup direction="vertical">
          {/* Top panel (notebook list) */}
          <Panel defaultSize={70} minSize={30}>
            <div
              className={vstack({
                p: 4,
                pt: 3,
                height: "full",
              })}
            >
              <div
                className={hstack({
                  gap: 2,
                  width: "100%",
                })}
              >
                <span
                  className={css({
                    fontSize: 16,
                    fontWeight: "semibold",
                  })}
                >
                  My Notebooks
                </span>
                <Link
                  to="/dashboard/notebook"
                  className={flex({
                    alignItems: "center",
                    justifyContent: "center",
                    bgColor: "primary.400",
                    color: "white",
                    h: 6,
                    w: 6,
                    rounded: "full",
                    cursor: "pointer",
                  })}
                >
                  <Plus size={18} />
                </Link>
              </div>
              <div
                className={css({
                  bgColor: "white",
                  borderColor: "black",
                  border: "solid",
                  borderWidth: 1,
                  rounded: "2xl",
                  height: "full",
                  width: "full",
                  overflowY: "auto",
                })}
              >
                {loaderData.myNotebooks.map((notebook) => (
                  <NotebookItem
                    key={notebook.id}
                    title={notebook.name}
                    date={new Date(notebook.timestamp).toLocaleString()}
                    notebookId={notebook.id}
                  />
                ))}
              </div>
            </div>
          </Panel>
          {/* Rest of the panel code remains the same */}
          <PanelResizeHandle
            className={css({
              borderColor: "black",
              borderWidth: 0.5,
              backgroundColor: "#f0f0f0",
              cursor: "row-resize",
            })}
          />
          <Panel defaultSize={30} minSize={20}>
            <div
              className={vstack({
                p: 4,
                height: "full",
                width: "full",
              })}
            >
              <div
                className={hstack({
                  gap: 2,
                  width: "100%",
                })}
              >
                <span
                  className={css({
                    fontSize: 16,
                    fontWeight: "semibold",
                  })}
                >
                  Shared Notebooks
                </span>
              </div>
              <div
                className={css({
                  bgColor: "white",
                  borderColor: "black",
                  border: "solid",
                  borderWidth: 1,
                  rounded: "2xl",
                  height: "full",
                  width: "full",
                  overflowY: "auto",
                })}
              >
                {loaderData.sharedNotebooks.map((notebook) => (
                  <NotebookItem
                    key={notebook.id}
                    title={notebook.name}
                    date={new Date(notebook.timestamp).toLocaleString()}
                    notebookId={notebook.id}
                  />
                ))}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </Panel>
      <PanelResizeHandle
        className={css({
          borderColor: "black",
          borderWidth: 0.5,
        })}
      />
      <Panel defaultSize={70}>
        <React.Suspense
          fallback={
            <div
              className={flex({
                fontSize: 18,
                fontWeight: "semibold",
                height: "full",
                width: "full",
                padding: 4,
              })}
            >
              <div>Loading Notebook...</div>
            </div>
          }
        >
          {loaderData.messagesAsync ? (
            <Await
              resolve={loaderData.messagesAsync}
              errorElement={
                <div
                  className={css({
                    color: "red.500",
                    p: 4,
                  })}
                >
                  Error loading messages
                </div>
              }
            >
              {(resolvedInitialMessages) => (
                <Chat
                  initialMessagesCurrentNotebook={resolvedInitialMessages}
                  currentNotebook={loaderData.currentNotebook}
                  initialMessage={loaderData.initialMessage}
                  currentUserId={loaderData.currentUserId}
                />
              )}
            </Await>
          ) : (
            <Chat
              initialMessagesCurrentNotebook={[]}
              currentNotebook={loaderData.currentNotebook}
              initialMessage={loaderData.initialMessage}
            />
          )}
        </React.Suspense>
      </Panel>
    </PanelGroup>
  );
}
