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
  slideInFromRight
} from "@/lib/animations";
import {
  ClipboardCheck,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Eye,
  FileSearch,
  Shield,
  Target,
  ArrowRight,
  Clipboard,
  UserCheck
} from "lucide-react";

interface OfficerStats {
  pendingVerifications: number;
  completedVerifications: number;
  totalFarmersVerified: number;
  regionsAssigned: number;
  thisWeekVerifications: number;
  averageVerificationTime: string;
}

export default function OfficerLanding() {
  const { user } = useAuth();
  
  // Fetch officer stats
  const { data: stats, isLoading } = useQuery<OfficerStats>({
    queryKey: ["/api/officer/stats"],
    enabled: !!user,
  });

  // Fetch pending verifications count
  const { data: verificationsData } = useQuery<{ verifications: any[] }>({
    queryKey: ["/api/verifications/pending"],
    enabled: !!user,
  });

  const pendingCount = verificationsData?.verifications?.length || stats?.pendingVerifications || 0;

  const quickActions = [
    {
      title: "Pending Verifications",
      description: "Review farmer verification requests",
      icon: ClipboardCheck,
      href: "/officer/verifications",
      color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      badge: pendingCount,
      primary: true
    },
    {
      title: "View Dashboard",
      description: "Overview of your verification activities",
      icon: Eye,
      href: "/officer/dashboard",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    },
    {
      title: "Analytics",
      description: "Track your performance metrics",
      icon: BarChart3,
      href: "/officer/analytics",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    },
    {
      title: "Review Disputes",
      description: "Handle flagged reviews and disputes",
      icon: AlertTriangle,
      href: "/officer/reviews",
      color: "bg-red-500/10 text-red-600 dark:text-red-400"
    }
  ];

  const statCards = [
    {
      title: "Pending",
      value: pendingCount,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: "Completed",
      value: stats?.completedVerifications || 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Farmers Verified",
      value: stats?.totalFarmersVerified || 0,
      icon: UserCheck,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "This Week",
      value: stats?.thisWeekVerifications || 0,
      icon: Target,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10"
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
                Welcome back, {user?.fullName?.split(' ')[0]}! 🔍
              </motion.h1>
              <motion.p 
                className="text-muted-foreground mt-2"
                variants={slideInFromLeft}
              >
                Verify farmers and maintain marketplace quality
              </motion.p>
            </div>
            
            <motion.div variants={slideInFromRight}>
              <Badge variant="secondary" className="px-4 py-2 text-sm gap-2">
                <Shield className="h-4 w-4" />
                Field Officer
              </Badge>
            </motion.div>
          </div>
        </motion.div>

        {/* Urgent Alert */}
        {pendingCount > 0 && (
          <motion.div 
            className="mb-6"
            variants={scaleIn}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {pendingCount} Verification{pendingCount > 1 ? 's' : ''} Pending
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Farmers are waiting for their verification review
                    </p>
                  </div>
                </div>
                <Link href="/officer/verifications">
                  <Button variant="outline" className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-950">
                    Review Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

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

        {/* Illustration Section */}
        <motion.div 
          className="mt-8"
          variants={scaleIn}
        >
          <Card className="overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-900">
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
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-2xl">
                    <FileSearch className="h-16 w-16 md:h-24 md:w-24 text-white" />
                  </div>
                </motion.div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Ensuring Quality & Trust
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    As a Field Officer, you play a crucial role in verifying farmers and 
                    maintaining the quality standards of our marketplace. Your work helps 
                    build trust between farmers and buyers.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/officer/verifications">
                        <Button className="gap-2">
                          <Clipboard className="h-4 w-4" />
                          Start Verifications
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/officer/dashboard">
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

        {/* Verification Tips */}
        <motion.div 
          className="mt-8 grid md:grid-cols-3 gap-4"
          variants={staggerContainer}
        >
          {[
            { icon: FileSearch, title: "Thorough Review", desc: "Check all submitted documents carefully" },
            { icon: MapPin, title: "Location Verify", desc: "Confirm farm location and details" },
            { icon: Users, title: "Farmer Contact", desc: "Reach out for clarifications when needed" }
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
