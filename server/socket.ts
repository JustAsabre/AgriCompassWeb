import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { storage } from "./storage";
import { Notification, InsertNotification, Message } from "@shared/schema";

// Map to track connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId

// Socket.IO instance - initialized by initializeSocket
export let io: Server;

export function initializeSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate user on connection
    socket.on("authenticate", (userId: string) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.join(`user:${userId}`);
        console.log(`User ${userId} authenticated with socket ${socket.id}`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      // Remove user from connected users map
      const entries = Array.from(connectedUsers.entries());
      for (const [userId, socketId] of entries) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });

    // Mark notification as read
    socket.on("mark_notification_read", async (notificationId: string) => {
      try {
        await storage.markNotificationRead(notificationId);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    });

    // Mark all notifications as read
    socket.on("mark_all_notifications_read", async (userId: string) => {
      try {
        await storage.markAllNotificationsRead(userId);
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    });

    // Send a message
    socket.on("send_message", async (data: { receiverId: string; content: string; listingId?: string }, callback) => {
      try {
        const entries = Array.from(connectedUsers.entries());
        const senderEntry = entries.find(([_, socketId]) => socketId === socket.id);
        
        if (!senderEntry) {
          callback?.({ error: "User not authenticated" });
          return;
        }

        const [senderId] = senderEntry;
        const message = await storage.createMessage({
          senderId,
          receiverId: data.receiverId,
          content: data.content,
          listingId: data.listingId,
        });

        // Get sender details for the message
        const sender = await storage.getUser(senderId);
        const receiver = await storage.getUser(data.receiverId);

        if (sender && receiver) {
          const messageWithUsers = {
            ...message,
            sender,
            receiver,
          };

          // Send to receiver if they're online
          io.to(`user:${data.receiverId}`).emit("new_message", messageWithUsers);
          
          // Send confirmation to sender
          callback?.({ success: true, message: messageWithUsers });

          // Also send a notification to the receiver
          await sendNotificationToUser(io, data.receiverId, {
            userId: data.receiverId,
            type: "message",
            title: "New Message",
            message: `${sender.fullName} sent you a message`,
            relatedId: message.id,
            relatedType: "message",
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        callback?.({ error: "Failed to send message" });
      }
    });

    // Mark conversation as read
    socket.on("mark_conversation_read", async (otherUserId: string) => {
      try {
        const entries = Array.from(connectedUsers.entries());
        const userEntry = entries.find(([_, socketId]) => socketId === socket.id);
        
        if (userEntry) {
          const [userId] = userEntry;
          await storage.markConversationRead(userId, otherUserId);
        }
      } catch (error) {
        console.error("Error marking conversation as read:", error);
      }
    });

    // Typing indicator
    socket.on("typing", (data: { receiverId: string; isTyping: boolean }) => {
      io.to(`user:${data.receiverId}`).emit("user_typing", {
        userId: Array.from(connectedUsers.entries())
          .find(([_, socketId]) => socketId === socket.id)?.[0],
        isTyping: data.isTyping,
      });
    });
  });

  return io;
}

// Helper function to send notification to a specific user
export async function sendNotificationToUser(
  io: Server,
  userId: string,
  notificationData: InsertNotification
) {
  const notification = await storage.createNotification(notificationData);
  io.to(`user:${userId}`).emit("new_notification", notification);
  return notification;
}

// Helper function to broadcast new listing to all users and create notifications
export async function broadcastNewListing(
  io: Server,
  listing: any
) {
  io.emit("new_listing", listing);
  
  // Create notifications for all buyers in the same region
  const buyers = await storage.getUsersByRole("buyer");
  const buyersInRegion = buyers.filter((u: any) => 
    !listing.farmer.region || u.region === listing.farmer.region
  );
  
  for (const buyer of buyersInRegion) {
    await sendNotificationToUser(io, buyer.id, {
      userId: buyer.id,
      type: "new_listing",
      title: "New Product Available",
      message: `${listing.farmer.fullName} listed ${listing.productName} in your region`,
      relatedId: listing.id,
      relatedType: "listing",
    });
  }
}

// Helper function to notify about price change
export function notifyPriceChange(
  io: Server,
  userId: string,
  listing: any
) {
  io.to(`user:${userId}`).emit("price_change", listing);
}
