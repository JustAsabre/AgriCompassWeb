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
  LayoutDashboard,
  Users,
  ShoppingBag,
  DollarSign,
  Activity,
  AlertCircle,
  Shield,
  Settings,
  BarChart3,
  TrendingUp,
  UserCheck,
  Package,
  Eye,
  Database,
  Zap,
  Crown
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface AdminStats {
  totalUsers: number;
  usersByRole: {
    farmer: number;
    buyer: number;
    field_officer: number;
    admin: number;
  };
  totalListings: number;
  registeredFarmers: number;
  verifiedFarmers: number;
  pendingVerifications: number;
  totalReviews: number;
  totalOrders: number;
  totalRevenueFromCompleted: number;
  totalPayments: number;
  totalPayouts: number;
}

export default function AdminLanding() {
  const { user } = useAuth();
  
  // Fetch admin stats
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === "admin",
  });

  const quickActions = [
    {
      title: "Dashboard",
      description: "Full admin control panel",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      primary: true
    },
    {
      title: "User Management",
      description: "Manage all platform users",
      icon: Users,
      href: "/admin/dashboard#users",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    },
    {
      title: "Verifications",
      description: "Review pending verifications",
      icon: UserCheck,
      href: "/officer/verifications",
      color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      badge: stats?.pendingVerifications
    },
    {
      title: "System Settings",
      description: "Configure platform settings",
      icon: Settings,
      href: "/admin/dashboard#settings",
      color: "bg-gray-500/10 text-gray-600 dark:text-gray-400"
    }
  ];

  const platformStats = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      subStats: [
        { label: "Farmers", value: stats?.usersByRole?.farmer || 0 },
        { label: "Buyers", value: stats?.usersByRole?.buyer || 0 }
      ]
    },
    {
      title: "Total Listings",
      value: stats?.totalListings || 0,
      icon: Package,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      subStats: [
        { label: "Payments", value: stats?.totalPayments || 0 }
      ]
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats?.totalRevenueFromCompleted || 0),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      isAmount: true
    }
  ];

  const systemStatus = [
    { label: "Database", status: "operational", icon: Database },
    { label: "API", status: "operational", icon: Zap },
    { label: "Payments", status: "operational", icon: DollarSign }
  ];

  return (
    <motion.div 
      className="min-h-screen bg-gradient-subtle"
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
                Admin Control Center 👑
              </motion.h1>
              <motion.p 
                className="text-muted-foreground mt-2"
                variants={slideInFromLeft}
              >
                Monitor and manage the entire Agricompass platform
              </motion.p>
            </div>
            
            <motion.div variants={slideInFromRight} className="flex items-center gap-3">
              <Badge variant="secondary" className="px-4 py-2 text-sm gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
                <Crown className="h-4 w-4 text-amber-600" />
                Administrator
              </Badge>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge 
                  variant="outline" 
                  className="px-3 py-1 gap-1 border-green-500 text-green-600"
                >
                  <Activity className="h-3 w-3" />
                  System OK
                </Badge>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Alerts Section */}
        {stats?.pendingVerifications && stats.pendingVerifications > 0 && (
          <motion.div 
            className="mb-6"
            variants={staggerContainer}
          >
            {stats?.pendingVerifications > 0 && (
              <motion.div variants={popIn}>
                <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">
                        {stats.pendingVerifications} Pending Verifications
                      </span>
                    </div>
                    <Link href="/officer/verifications">
                      <Button size="sm" variant="outline" className="border-yellow-500">
                        Review
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Platform Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
        >
          {platformStats.map((stat, index) => (
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
                    {stat.subStats && (
                      <div className="text-right text-xs text-muted-foreground">
                        {stat.subStats.map((sub, i) => (
                          <div key={i}>{sub.label}: {sub.value}</div>
                        ))}
                      </div>
                    )}
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

        {/* System Status & Illustration */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* System Status */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  System Status
                </h3>
                <div className="space-y-3">
                  {systemStatus.map((item, index) => (
                    <motion.div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      >
                        <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                          Operational
                        </Badge>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Illustration Card */}
          <motion.div 
            className="lg:col-span-2"
            variants={scaleIn}
          >
            <Card className="h-full overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950/50 dark:to-gray-950/50 border-slate-200 dark:border-slate-800">
              <CardContent className="p-8 h-full">
                <div className="flex flex-col md:flex-row items-center gap-8 h-full">
                  <motion.div 
                    className="flex-shrink-0"
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{ 
                      duration: 6, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-slate-600 to-gray-800 flex items-center justify-center shadow-2xl">
                      <Shield className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </div>
                  </motion.div>
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Platform Overview
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You have full control over the Agricompass platform. Monitor users, 
                      manage listings, review transactions, and ensure smooth operations.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link href="/admin/dashboard">
                          <Button className="gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Open Dashboard
                          </Button>
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link href="/marketplace">
                          <Button variant="outline" className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Marketplace
                          </Button>
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
