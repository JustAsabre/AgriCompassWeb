import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem, 
  scaleIn,
  slideInFromLeft,
  slideInFromRight,
  popIn
} from "@/lib/animations";
import {
  ShoppingBag,
  Package,
  Search,
  Heart,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
  Truck,
  MapPin,
  ArrowRight,
  Star,
  Sparkles
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface BuyerStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
  cartItems: number;
  savedItems: number;
}

export default function BuyerLanding() {
  const { user } = useAuth();
  
  // Fetch buyer stats
  const { data: stats, isLoading } = useQuery<BuyerStats>({
    queryKey: ["/api/buyer/stats"],
    enabled: !!user,
  });

  // Fetch cart count
  const { data: cartData } = useQuery<{ items: any[] }>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const cartCount = cartData?.items?.length || 0;

  const quickActions = [
    {
      title: "Browse Marketplace",
      description: "Discover fresh products from verified farmers",
      icon: Search,
      href: "/marketplace",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      primary: true
    },
    {
      title: "My Cart",
      description: "Review items and checkout",
      icon: ShoppingCart,
      href: "/buyer/cart",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      badge: cartCount
    },
    {
      title: "Track Orders",
      description: "View order status and history",
      icon: Truck,
      href: "/buyer/dashboard",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      badge: stats?.activeOrders
    },
    {
      title: "Analytics",
      description: "View your purchase insights",
      icon: BarChart3,
      href: "/buyer/analytics",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
    }
  ];

  const statCards = [
    {
      title: "Active Orders",
      value: stats?.activeOrders || 0,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Completed",
      value: stats?.completedOrders || 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Total Spent",
      value: formatCurrency(stats?.totalSpent || 0),
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      isAmount: true
    },
    {
      title: "Cart Items",
      value: cartCount,
      icon: ShoppingCart,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10"
    }
  ];

  const categories = [
    { name: "Vegetables", emoji: "🥬", count: 120 },
    { name: "Fruits", emoji: "🍎", count: 85 },
    { name: "Grains", emoji: "🌾", count: 45 },
    { name: "Dairy", emoji: "🥛", count: 30 },
    { name: "Poultry", emoji: "🐔", count: 25 },
    { name: "Livestock", emoji: "🐄", count: 15 }
  ];

  return (
    <motion.div 
      className="min-h-screen bg-background"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header */}
        <motion.div 
          className="mb-8"
          variants={fadeInUp}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <motion.h1 
                className="text-3xl md:text-4xl font-bold text-foreground"
                variants={slideInFromLeft}
              >
                Welcome back, {user?.fullName?.split(' ')[0]}! 🛒
              </motion.h1>
              <motion.p 
                className="text-muted-foreground mt-2"
                variants={slideInFromLeft}
              >
                Discover quality products from verified farmers
              </motion.p>
            </div>
            
            <motion.div variants={slideInFromRight} className="flex gap-2">
              <Link href="/marketplace">
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  Browse Products
                </Button>
              </Link>
              {cartCount > 0 && (
                <Link href="/buyer/cart">
                  <Button variant="outline" className="gap-2 relative">
                    <ShoppingCart className="h-4 w-4" />
                    Cart
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cartCount}
                    </Badge>
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <motion.p 
                      className="text-2xl font-bold text-foreground"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeInUp}>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                variants={staggerItem}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href={action.href}>
                  <Card className={`h-full cursor-pointer transition-all hover:shadow-lg ${action.primary ? 'ring-2 ring-primary/50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${action.color}`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        {action.badge && action.badge > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.3 }}
                          >
                            <Badge variant="destructive" className="rounded-full">
                              {action.badge}
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Categories Section */}
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Browse Categories</h2>
            <Link href="/marketplace">
              <Button variant="ghost" className="gap-1 text-sm">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                variants={popIn}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                custom={index}
              >
                <Link href={`/marketplace?category=${category.name.toLowerCase()}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-all text-center">
                    <CardContent className="p-4">
                      <motion.span 
                        className="text-3xl block mb-2"
                        animate={{ 
                          rotate: [0, -10, 10, 0],
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.2
                        }}
                      >
                        {category.emoji}
                      </motion.span>
                      <p className="font-medium text-sm text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.count}+ items</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Illustration Section */}
        <motion.div 
          className="mt-8"
          variants={scaleIn}
        >
          <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <motion.div 
                  className="flex-shrink-0"
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl relative">
                    <ShoppingBag className="h-16 w-16 md:h-24 md:w-24 text-white" />
                    <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="h-8 w-8 text-yellow-400" />
                    </motion.div>
                  </div>
                </motion.div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Fresh From the Farm to Your Table
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Browse our marketplace filled with quality agricultural products from verified 
                    farmers. Get the best prices and support local agriculture.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/marketplace">
                        <Button className="gap-2">
                          <Search className="h-4 w-4" />
                          Start Shopping
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/buyer/dashboard">
                        <Button variant="outline" className="gap-2">
                          <Package className="h-4 w-4" />
                          View Orders
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits */}
        <motion.div 
          className="mt-8 grid md:grid-cols-3 gap-4"
          variants={staggerContainer}
        >
          {[
            { icon: Star, title: "Verified Farmers", desc: "All sellers are verified for quality" },
            { icon: MapPin, title: "Local Products", desc: "Support farmers in your region" },
            { icon: Truck, title: "Fast Delivery", desc: "Quick fulfillment on all orders" }
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              variants={staggerItem}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{benefit.title}</h4>
                    <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
