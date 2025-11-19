"use client";

import remarkBreaks from "remark-breaks";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Send, AlertCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/client/trpc";

// Message interface
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "tool" | "system";
  timestamp: number;
}

// Chat component props
interface ChatProps {
  id?: string;
  onUpdateConversationId?: (conversationId: string) => void;
}

// This wrapper component handles re-mounting the chat when the conversation ID changes.
function ChatComponentWithStaticId({ id, onUpdateConversationId }: ChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // tRPC mutations and queries
  const createConversation = trpc.chat.createConversation.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();
  const getConversation = trpc.chat.getConversation.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  );

  // Handle query results - only update if we don't have local messages or if we're loading an existing conversation
  useEffect(() => {
    if (getConversation.data && !isLoading && !isSendingMessage) {
      // Only update messages if we don't have any local messages (loading existing conversation)
      // or if the conversation has more messages than we currently have (someone else added messages)
      if (
        messages.length === 0 ||
        getConversation.data.messages.length > messages.length
      ) {
        setMessages(getConversation.data.messages);
      }
      if (onUpdateConversationId) {
        onUpdateConversationId(getConversation.data.id);
      }
    }
  }, [
    getConversation.data,
    onUpdateConversationId,
    messages.length,
    isLoading,
    isSendingMessage,
  ]);

  useEffect(() => {
    if (getConversation.error) {
      setError(getConversation.error.message);
    }
  }, [getConversation.error]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setIsSendingMessage(true);
    setError(null);

    // Add user message immediately to the UI
    const tempUserMessage: Message = {
      id: `temp_${Date.now()}`,
      content: userMessage,
      role: "user",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Create conversation if we don't have one
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const newConversation = await createConversation.mutateAsync({
          title:
            userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
        });
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);
        if (onUpdateConversationId) {
          onUpdateConversationId(currentConversationId);
        }
      }

      // Send message and get AI response
      const result = await sendMessage.mutateAsync({
        conversationId: currentConversationId,
        content: userMessage,
      });

      // Replace the temporary user message with the real one and add AI response
      setMessages((prev) => {
        const filteredMessages = prev.filter(
          (msg) => msg.id !== tempUserMessage.id,
        );
        console.log(result.aiMessage);
        return [...filteredMessages, result.userMessage, result.aiMessage];
      });
    } catch (error) {
      // Remove the temporary user message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== tempUserMessage.id),
      );

      // Store the failed message for retry
      setLastFailedMessage(userMessage);

      // Set appropriate error message
      let errorMessage = "Failed to send message";
      if (error instanceof Error) {
        if (error.message.includes("Gemini API")) {
          errorMessage =
            "AI service is temporarily unavailable. Please try again.";
        } else if (error.message.includes("conversation")) {
          errorMessage =
            "Unable to create or access conversation. Please refresh and try again.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsSendingMessage(false);
    }
  };

  const retryLastMessage = () => {
    if (lastFailedMessage) {
      setInput(lastFailedMessage);
      setError(null);
      setLastFailedMessage(null);
      // Focus the textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const clearError = () => {
    setError(null);
    setLastFailedMessage(null);
  };

  const adjustTextareaHeight = () => {
    const element = textareaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  useEffect(adjustTextareaHeight, [input]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[94vh] max-h-[94vh] w-full pt-4">
      <div className="mb-6 px-4">
        <h1 className="text-3xl font-bold text-left">Chat</h1>
        <p className="text-muted-foreground">
          Ask questions about your inventory
        </p>
      </div>

      <div className="flex justify-center items-center flex-1 min-h-0">
        <Card className="w-full h-full flex flex-col">
          <CardContent className="flex-1 min-h-0 h-[calc(100%-72px)]">
            <ScrollArea className="h-full pr-4">
              <div className="flex flex-col gap-4 py-4">
                {error ? (
                  <div className="flex flex-col items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Message failed to send
                      </span>
                    </div>
                    <p className="text-sm text-destructive/80 text-center max-w-md">
                      {error}
                    </p>
                    <div className="flex gap-2">
                      {lastFailedMessage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryLastMessage}
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearError}
                        className="text-destructive/60 hover:text-destructive"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "mb-4 flex",
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] p-3 rounded-lg",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground ml-4"
                              : "bg-muted text-foreground mr-4",
                          )}
                        >
                          <pre className="whitespace-pre-wrap font-sans text-base">
                            <p>
                              <Markdown
                                remarkPlugins={[remarkBreaks]}
                                components={{
                                  br: () => (
                                    <span
                                      style={{ margin: "0.1em", padding: "0" }}
                                    />
                                  ),
                                  li: ({ children }) => (
                                    <li
                                      style={{ margin: "0.1em", padding: "0" }}
                                    >
                                      {children}
                                    </li>
                                  ),
                                  ul: ({ children }) => (
                                    <ul
                                      style={{ margin: "0.1em", padding: "0" }}
                                    >
                                      {children}
                                    </ul>
                                  ),
                                }}
                              >
                                {message.content}
                              </Markdown>
                            </p>
                          </pre>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-foreground p-3 rounded-lg mr-4">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-4 h-[72px]">
            <form
              onSubmit={handleSubmit}
              className="flex w-full items-center space-x-2"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="min-h-[45px] max-h-[40px] resize-none flex-1"
                style={{ fontSize: "18px" }}
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-[40px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Main Chat component that handles conversation ID changes
export default function Chat({ id, onUpdateConversationId }: ChatProps) {
  const [currentId, setCurrentId] = useState(id);

  useEffect(() => {
    setCurrentId(id);
  }, [id]);

  return (
    <ChatComponentWithStaticId
      key={currentId}
      id={currentId}
      onUpdateConversationId={onUpdateConversationId}
    />
  );
}
