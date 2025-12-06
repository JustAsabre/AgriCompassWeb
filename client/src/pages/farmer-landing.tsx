import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  cardHover
} from "@/lib/animations";
import {
  Sprout,
  Plus,
  Package,
  Wallet,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Clock,
  DollarSign,
  Eye,
  BarChart3,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  walletBalance: number;
  pendingBalance: number;
  isVerified: boolean;
}

export default function FarmerLanding() {
  const { user } = useAuth();
  
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/farmer/stats"],
    enabled: !!user,
  });

  const quickActions = [
    {
      title: "Create Listing",
      description: "Add new products to your store",
      icon: Plus,
      href: "/farmer/create-listing",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      primary: true
    },
    {
      title: "View Orders",
      description: "Manage pending and active orders",
      icon: Package,
      href: "/farmer/dashboard",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      badge: stats?.pendingOrders
    },
    {
      title: "My Wallet",
      description: "Check earnings and withdrawals",
      icon: Wallet,
      href: "/farmer/wallet",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    },
    {
      title: "Analytics",
      description: "View performance insights",
      icon: BarChart3,
      href: "/farmer/analytics",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
    }
  ];

  const statCards = [
    {
      title: "Active Listings",
      value: stats?.activeListings || 0,
      icon: Sprout,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      isAmount: true
    },
    {
      title: "Wallet Balance",
      value: formatCurrency(stats?.walletBalance || 0),
      icon: Wallet,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      isAmount: true
    }
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
                Welcome back, {user?.fullName?.split(' ')[0]}! 🌾
              </motion.h1>
              <motion.p 
                className="text-muted-foreground mt-2"
                variants={slideInFromLeft}
              >
                Manage your farm listings and track your sales
              </motion.p>
            </div>
            
            {/* Verification Status */}
            <motion.div variants={slideInFromRight}>
              {user?.verified ? (
                <Badge variant="secondary" className="px-4 py-2 text-sm gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Farmer
                </Badge>
              ) : (
                <Link href="/farmer/verification">
                  <Button variant="outline" className="gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Get Verified
                    <ArrowRight className="h-4 w-4" />
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
                      className={`text-2xl font-bold ${stat.isAmount ? '' : 'text-foreground'}`}
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

        {/* Illustration Section */}
        <motion.div 
          className="mt-12"
          variants={scaleIn}
        >
          <Card className="overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <motion.div 
                  className="flex-shrink-0"
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, 0, -5, 0]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl">
                    <Sprout className="h-16 w-16 md:h-24 md:w-24 text-white" />
                  </div>
                </motion.div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Grow Your Farm Business
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    List your products, connect with buyers, and grow your agricultural business 
                    with Agricompass's verified marketplace.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/farmer/create-listing">
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          {stats?.activeListings && stats.activeListings > 0 
                            ? "Create Another Listing" 
                            : "Create Your First Listing"}
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/farmer/dashboard">
                        <Button variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Dashboard
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tips Section */}
        <motion.div 
          className="mt-8 grid md:grid-cols-3 gap-4"
          variants={staggerContainer}
        >
          {[
            { icon: CheckCircle2, title: "Complete Profile", desc: "Add farm details for better visibility" },
            { icon: TrendingUp, title: "Quality Photos", desc: "Better images = more sales" },
            { icon: ShieldCheck, title: "Get Verified", desc: "Build trust with buyers" }
          ].map((tip, index) => (
            <motion.div
              key={tip.title}
              variants={staggerItem}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <tip.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{tip.title}</h4>
                    <p className="text-sm text-muted-foreground">{tip.desc}</p>
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
