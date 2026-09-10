"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Square, TrashIcon, X } from "lucide-react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClearPresentationChat } from "@/hooks/presentation/useClearPresentationChat";
import { usePresentationState } from "@/states/presentation-state";
import { executeToolCall } from "@/hooks/presentation/agentTools";
import {
  getToolInputArgs,
  getToolName,
  isToolPart,
} from "@/lib/ai/uiMessageParts";
import AIMessageComponent from "./AIMessage";
import HumanMessageComponent from "./HumanMessage";

const PRESENTATION_TOOLS = new Set([
  "edit_slide_properties",
  "replace_image",
  "change_theme",
  "create_custom_theme",
  "update_custom_theme",
  "regenerate_slide",
  "create_slide",
  "delete_slide",
]);

export function PresentationAgentPanel() {
  const setActiveRightPanel = usePresentationState(
    (state) => state.setActiveRightPanel,
  );
  const currentPresentationId = usePresentationState(
    (state) => state.currentPresentationId,
  );

  const {
    messages,
    sendMessage,
    stop,
    status,
    addToolResult,
    setMessages,
  } = useChat<UIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/agent/presentation",
      prepareSendMessagesRequest: async ({
        api,
        body,
        headers,
        messages,
      }) => {
        return {
          api,
          body: { ...body, id: currentPresentationId, messages },
          headers,
        };
      },
    }),
  });

  const { clearChat, isPending: isClearing } = useClearPresentationChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processedToolCalls = useRef<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState("");

  const isStreaming = status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (isStreaming) return;

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        if (!isToolPart(part)) continue;

        const toolName = getToolName(part);
        if (!PRESENTATION_TOOLS.has(toolName)) continue;
        if (part.state !== "input-streaming") continue;

        const toolCallId = part.toolCallId;
        if (!toolCallId || processedToolCalls.current.has(toolCallId)) continue;

        processedToolCalls.current.add(toolCallId);

        const args = getToolInputArgs(part);
        executeToolCall({ name: toolName, args })
          .then((result) => {
            addToolResult({
              state: "output-available",
              tool: toolName,
              toolCallId,
              output: result,
            });
          })
          .catch((error) => {
            console.error("Tool execution failed:", toolName, error);
            processedToolCalls.current.delete(toolCallId);
          });
      }
    }
  }, [messages, isStreaming, addToolResult]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0 || isStreaming || isClearing) return;
    const confirmed = window.confirm(
      "Clear the agent chat for this presentation? This cannot be undone.",
    );
    if (!confirmed) return;
    if (currentPresentationId) {
      clearChat(currentPresentationId, {
        onSuccess: () => setMessages([]),
      });
    } else {
      // No active presentation id — clear local state directly.
      setMessages([]);
    }
  };

  return (
    <div className="flex h-full w-[26rem] flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <h2 className="text-sm font-semibold tracking-wide">Agent</h2>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              disabled={isStreaming || isClearing}
              aria-label="Clear chat"
              title="Clear chat"
              className="h-8 w-8 hover:bg-muted"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveRightPanel(null)}
            className="h-8 w-8 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Ask the agent to edit, restyle, or create slides.
          </div>
        ) : (
          <>
            {messages.map((m, index) => {
              if (m.role === "assistant") {
                return (
                  <AIMessageComponent
                    key={m.id}
                    message={m}
                    isStreaming={isStreaming}
                    isLastMessage={index === messages.length - 1}
                  />
                );
              }
              if (m.role === "user") {
                return (
                  <HumanMessageComponent key={m.id} message={m} />
                );
              }
              return null;
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t p-3">
        {isStreaming ? (
          <Button
            variant="secondary"
            size="icon"
            onClick={stop}
            className="h-9 w-9"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              id="agent-prompt-textarea"
              placeholder="Ask the agent..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="max-h-32 min-h-[40px] resize-none"
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isStreaming || !inputValue.trim()}
              className="h-9 w-9 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
