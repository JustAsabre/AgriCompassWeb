import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import type { Conversation, MessageWithUsers } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { user } = useAuth();
  const { socket } = useNotifications();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Check for user parameter in URL and set selected conversation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    if (userId) {
      setSelectedConversation(userId);
      // Store user info from URL params if provided
      const userName = urlParams.get('name');
      const userRole = urlParams.get('role');
      if (userName && userRole) {
        // Store in session storage for this user
        sessionStorage.setItem(`user_${userId}`, JSON.stringify({
          id: userId,
          fullName: decodeURIComponent(userName),
          role: userRole
        }));
      }
      // Clean up URL
      window.history.replaceState({}, '', '/messages');
    }
  }, []); // Run only once on mount

  // Fetch conversations list
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations", user?.id],
    enabled: !!user?.id,
  });

  // Get user data from conversations or session storage
  const getUserData = () => {
    if (!selectedConversation) return null;

    // Try to find in conversations first
    const fromConversations = conversations?.find(c => c.otherUser.id === selectedConversation)?.otherUser;
    if (fromConversations) return fromConversations;

    // Try to get from session storage
    const stored = sessionStorage.getItem(`user_${selectedConversation}`);
    if (stored) {
      return JSON.parse(stored);
    }

    return null;
  };

  const selectedUserData = getUserData();

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery<MessageWithUsers[]>({
    queryKey: [`/api/messages/${selectedConversation}`, user?.id],
    enabled: !!selectedConversation && !!user?.id,
  });

  // Mark conversation as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      return apiRequest("PATCH", `/api/messages/${otherUserId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread/count"] });
    },
  });

  // Handle new messages via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: MessageWithUsers) => {
      // Update messages list if conversation is open with either sender or receiver
      const isRelevantConversation =
        selectedConversation === message.senderId ||
        selectedConversation === message.receiverId;

      if (isRelevantConversation && selectedConversation) {
        queryClient.setQueryData<MessageWithUsers[]>(
          ["/api/messages", selectedConversation],
          (old = []) => [...old, message]
        );
        // Mark as read if message is from the other person
        if (message.senderId === selectedConversation) {
          socket.emit("mark_conversation_read", message.senderId);
        }
      }

      // Always update conversations list and unread counts
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread/count"] });
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      // Show typing indicator if the typing user is the selected conversation partner
      if (data.userId === selectedConversation) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTyping);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTyping);
    };
  }, [socket, selectedConversation, queryClient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle conversation selection
  const handleSelectConversation = (otherUserId: string) => {
    setSelectedConversation(otherUserId);
    setIsTyping(false); // Reset typing indicator when switching conversations
    markReadMutation.mutate(otherUserId);
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Send message
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation || !socket) return;

    socket.emit("send_message", {
      receiverId: selectedConversation,
      content: messageInput.trim(),
    }, (response: any) => {
      if (response.success) {
        // Message will be added via socket event handler, just clear input
        setMessageInput("");
        // Invalidate conversations to update last message
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      }
    });

    // Stop typing indicator
    socket.emit("typing", { receiverId: selectedConversation, isTyping: false });
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !selectedConversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing event
    socket.emit("typing", { receiverId: selectedConversation, isTyping: true });

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { receiverId: selectedConversation, isTyping: false });
    }, 2000);
  };

  const selectedConversationData = conversations?.find(
    c => c.otherUser.id === selectedConversation
  );

  // If no conversation exists but we have a selected user, create a temporary conversation object
  const effectiveConversationData = selectedConversationData || (selectedUserData && selectedConversation ? {
    otherUser: selectedUserData,
    lastMessage: null,
    unreadCount: 0
  } : null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Chat with buyers and farmers
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-full">
              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : conversations && conversations.length > 0 ? (
                  <div className="divide-y">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.otherUser.id}
                        onClick={() => handleSelectConversation(conversation.otherUser.id)}
                        className={`w-full p-4 text-left hover:bg-accent transition-colors ${selectedConversation === conversation.otherUser.id
                          ? "bg-accent"
                          : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {conversation.otherUser.fullName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold truncate">
                                {conversation.otherUser.fullName}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="shrink-0">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(conversation.lastMessage.createdAt!), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedConversation && effectiveConversationData ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {effectiveConversationData.otherUser.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{effectiveConversationData.otherUser.fullName}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {effectiveConversationData.otherUser.role}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-3/4" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(messages && messages.length > 0) ? messages.map((message) => {
                          const isOwn = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                                  }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p
                                  className={`text-xs mt-1 ${isOwn
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                    }`}
                                >
                                  {formatDistanceToNow(new Date(message.createdAt!), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center text-muted-foreground py-8">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No messages yet</p>
                            <p className="text-sm">Start the conversation below</p>
                          </div>
                        )}
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">typing...</p>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          handleTyping();
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No conversation selected</p>
                  <p className="text-sm">Choose a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
