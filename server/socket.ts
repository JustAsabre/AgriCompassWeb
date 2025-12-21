import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { storage } from "./storage";
import { Notification, InsertNotification, Message } from "@shared/schema";
import { sessionStore, sessionCookieName } from "./session";

// Simple cookie parser for handshake cookies
function parseCookies(cookieHeader?: string) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

function normalizeSessionId(raw?: string) {
  if (!raw) return undefined;
  try {
    // cookies are often URL encoded
    let v = decodeURIComponent(raw);
    // express-session may prefix signed cookies with 's:'; strip it
    if (v.startsWith('s:')) v = v.slice(2);
    // if there's a dot signature suffix, remove it (best-effort)
    if (v.includes('.')) v = v.split('.')[0];
    return v;
  } catch {
    return raw;
  }
}

// Map to track connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId

// Socket.IO instance - initialized by initializeSocket
export let io: Server;

function getAllowedSocketOrigins() {
  const envList = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const frontendUrl = (process.env.FRONTEND_URL || '').trim();

  const defaults = process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];

  return Array.from(new Set([
    ...defaults,
    ...(frontendUrl ? [frontendUrl] : []),
    ...envList,
  ]));
}

function isAllowedSocketOrigin(origin: string) {
  const allowed = getAllowedSocketOrigins();
  if (allowed.includes(origin)) return true;

  if (process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
    try {
      const u = new URL(origin);
      if (u.hostname.endsWith('.vercel.app')) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

export async function initializeSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (isAllowedSocketOrigin(origin)) return callback(null, origin);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Attempt server-side session-based authentication on connection
    try {
      const cookieHeader = (socket.handshake.headers && (socket.handshake.headers.cookie as string)) || undefined;
      const cookies = parseCookies(cookieHeader);
      const rawSid = cookies[sessionCookieName];
      const sid = normalizeSessionId(rawSid);
      if (sid) {
        sessionStore.get(sid, (err: any, sess: any) => {
          if (!err && sess && sess.user && sess.user.id) {
            const userId = sess.user.id;
            connectedUsers.set(userId, socket.id);
            socket.join(`user:${userId}`);
            (socket as any).data = (socket as any).data || {};
            const alreadyAuth = !!(socket as any).data.isAuthenticated;
            (socket as any).data.isAuthenticated = true;
            if (!alreadyAuth) {
              console.log(`User ${userId} authenticated (session) with socket ${socket.id}`);
            } else {
              // already authenticated - skip duplicate session log
            }
            socket.emit('authenticated', { userId });
          }
        });
      }
    } catch (err) {
      console.error('Error during socket session auth:', err);
    }

    // Authenticate user on connection (fallback - still verified against session)
    socket.on("authenticate", (userId: string) => {
      // verify that the session associated with this socket belongs to the same user
      try {
        // If already authenticated for this socket, skip
        if ((socket as any).data && (socket as any).data.isAuthenticated) return;
        const cookieHeader = (socket.handshake.headers && (socket.handshake.headers.cookie as string)) || undefined;
        const cookies = parseCookies(cookieHeader);
        const rawSid = cookies[sessionCookieName];
        const sid = normalizeSessionId(rawSid);
        if (!sid) {
          socket.emit('unauthorized', { message: 'No session' });
          return;
        }

        sessionStore.get(sid, (err: any, sess: any) => {
          if (err || !sess || !sess.user) {
            socket.emit('unauthorized', { message: 'Invalid session' });
            return;
          }

          if (sess.user.id !== userId) {
            socket.emit('unauthorized', { message: 'Mismatched user id' });
            return;
          }

          connectedUsers.set(userId, socket.id);
          socket.join(`user:${userId}`);
          (socket as any).data = (socket as any).data || {};
          const alreadyAuth2 = !!(socket as any).data.isAuthenticated;
          (socket as any).data.isAuthenticated = true;
          if (!alreadyAuth2) {
            console.log(`User ${userId} authenticated-with-check with socket ${socket.id}`);
          } else {
            // already authenticated - skip logging duplicate authenticate
          }
          socket.emit('authenticated', { userId });
        });
      } catch (e) {
        console.error('Error during authenticate handler:', e);
        socket.emit('unauthorized', { message: 'auth error' });
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
          listingId: data.listingId ?? null,
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

          // Also send to sender so they see their own message
          io.to(`user:${senderId}`).emit("new_message", messageWithUsers);

          // Send confirmation to sender
          callback?.({ success: true, message: messageWithUsers });

          // Also send a notification to the receiver
          await sendNotificationToUser(data.receiverId, {
            userId: data.receiverId,
            type: "message",
            title: "New Message",
            message: `${sender.fullName} sent you a message`,
            relatedId: message.id,
            relatedType: "message",
          }, io);
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

  // If REDIS_URL is configured, wire up a Redis adapter for socket.io to support horizontal scaling
  if (process.env.REDIS_URL) {
    try {
      const redisOptions = {
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('Socket.IO Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      };
      
      const pubClient = createClient(redisOptions);
      const subClient = pubClient.duplicate();
      
      // Add error handlers to prevent "missing 'error' handler" warnings
      pubClient.on('error', (err: Error) => console.error('Socket.IO Redis pub client error:', err.message));
      subClient.on('error', (err: Error) => console.error('Socket.IO Redis sub client error:', err.message));
      pubClient.on('reconnecting', () => console.log('Socket.IO Redis pub client: Reconnecting...'));
      subClient.on('reconnecting', () => console.log('Socket.IO Redis sub client: Reconnecting...'));
      
      // connect both - await ensures the adapter is ready before returning
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter configured');
    } catch (err) {
      console.error('Failed to configure Redis adapter for Socket.IO', err);
    }
  }

  return io;
}

// Helper function to send notification to a specific user
export async function sendNotificationToUser(
  userId: string,
  notificationData: InsertNotification,
  io?: Server
) {
  const notification = await storage.createNotification(notificationData);
  // io may be undefined during tests or if socket server not initialized - guard
  if (typeof io?.to === 'function') {
    io.to(`user:${userId}`).emit("new_notification", notification);
  }
  return notification;
}

// Helper function to broadcast new listing to all users and create notifications
export async function broadcastNewListing(
  listing: any,
  io?: Server
) {
  if (typeof io?.emit === 'function') {
    io.emit("new_listing", listing);
  }

  // Create notifications for all buyers in the same region
  const buyers = await storage.getUsersByRole("buyer");

  // Match based on listing location or farmer's region
  const listingRegion = listing.location || listing.farmer.region;

  const buyersInRegion = buyers.filter((u: any) => {
    if (!u.region || !listingRegion) return false;
    // Check if buyer's region matches listing location or farmer's region
    return u.region.toLowerCase().includes(listingRegion.toLowerCase()) ||
      listingRegion.toLowerCase().includes(u.region.toLowerCase());
  });

  for (const buyer of buyersInRegion) {
    await sendNotificationToUser(buyer.id, {
      userId: buyer.id,
      type: "new_listing",
      title: "New Product Available",
      message: `${listing.farmer.fullName} listed ${listing.productName} near you`,
      relatedId: listing.id,
      relatedType: "listing",
    }, io);
  }
}

// Helper function to notify about price change
export function notifyPriceChange(
  userId: string,
  listing: any,
  io?: Server
) {
  if (typeof io?.to === 'function') {
    io.to(`user:${userId}`).emit("price_change", listing);
  }
}
