import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_update":
        return "📦";
      case "new_listing":
        return "🌾";
      case "price_change":
        return "💰";
      case "verification_update":
        return "✅";
      case "message":
        return "💬";
      case "escrow":
        return "🔐";
      case "transaction":
      case "payment":
        return "💳";
      default:
        return "🔔";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type and relatedType
    if (notification.relatedId && notification.relatedType) {
      switch (notification.relatedType) {
        case "listing":
          setLocation(`/marketplace/${notification.relatedId}`);
          break;
        case "order":
          // Navigate directly to order detail page
          setLocation(`/orders/${notification.relatedId}`);
          break;
        case "escrow":
          // Escrow notifications redirect to the related order
          setLocation(`/orders/${notification.relatedId}`);
          break;
        case "transaction":
        case "payment":
          // Payment/transaction notifications redirect to order detail
          setLocation(`/orders/${notification.relatedId}`);
          break;
        case "verification":
          // Redirect to profile for verification updates
          setLocation('/profile');
          break;
        case "message":
          setLocation('/messages');
          break;
        default:
          // Fallback: use user's role to determine dashboard
          if (user?.role === 'farmer') {
            setLocation('/farmer/dashboard');
          } else if (user?.role === 'buyer') {
            setLocation('/buyer/dashboard');
          } else if (user?.role === 'field_officer') {
            setLocation('/officer/dashboard');
          } else if (user?.role === 'admin') {
            setLocation('/admin/dashboard');
          }
      }
    }
    
    // Close popover after navigation
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-background"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="h-8 text-xs"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-40 text-muted-foreground"
              >
                <Bell className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </motion.div>
            ) : (
              <div className="divide-y">
                <AnimatePresence>
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-accent/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <motion.span 
                          className="text-2xl flex-shrink-0"
                          whileHover={{ scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {getNotificationIcon(notification.type)}
                        </motion.span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" 
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {notification.createdAt
                              ? formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })
                              : "Just now"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
