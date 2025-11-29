import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    CreditCard,
    Loader2,
    AlertCircle,
    Banknote,
    Building2,
    Smartphone
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types
interface WalletTransaction {
    id: string;
    amount: string;
    type: "credit" | "debit";
    description: string;
    createdAt: string;
    referenceType: string;
}

interface Withdrawal {
    id: string;
    amount: string;
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: string;
    mobileNumber?: string;
    mobileNetwork?: string;
}

const withdrawalSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
    }),
    mobileNumber: z.string().min(10, "Valid mobile number required"),
    mobileNetwork: z.enum(["mtn", "vodafone", "airteltigo"], {
        required_error: "Please select a network",
    }),
});

export default function FarmerWallet() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    // Queries
    const { data: balanceData, isLoading: isBalanceLoading } = useQuery<{ balance: string }>({
        queryKey: ["/api/wallet/balance"],
    });

    const { data: transactions, isLoading: isTransactionsLoading } = useQuery<WalletTransaction[]>({
        queryKey: ["/api/wallet/transactions"],
    });

    const { data: withdrawals, isLoading: isWithdrawalsLoading } = useQuery<Withdrawal[]>({
        queryKey: ["/api/wallet/withdrawals"],
    });

    // Mutations
    const withdrawMutation = useMutation({
        mutationFn: async (data: z.infer<typeof withdrawalSchema>) => {
            const res = await apiRequest("POST", "/api/wallet/withdraw", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/withdrawals"] });
            setIsWithdrawOpen(false);
            toast({
                title: "Withdrawal Requested",
                description: "Your withdrawal request has been submitted successfully.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Withdrawal Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Form
    const form = useForm<z.infer<typeof withdrawalSchema>>({
        resolver: zodResolver(withdrawalSchema),
        defaultValues: {
            amount: "",
            mobileNumber: "",
        },
    });

    const onSubmit = (data: z.infer<typeof withdrawalSchema>) => {
        withdrawMutation.mutate(data);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    My Wallet
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage your earnings, transactions, and withdrawals
                </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* Balance Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="md:col-span-1"
                >
                    <Card className="bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-xl border-none h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wallet size={120} />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-green-100 font-medium text-sm uppercase tracking-wider">
                                Available Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isBalanceLoading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-4xl font-bold">
                                        GHS {Number(balanceData?.balance || 0).toFixed(2)}
                                    </div>
                                    <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="secondary"
                                                className="w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                                            >
                                                <Banknote className="mr-2 h-4 w-4" />
                                                Withdraw Funds
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Withdraw Funds</DialogTitle>
                                                <DialogDescription>
                                                    Enter the amount you wish to withdraw to your mobile money wallet.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <Form {...form}>
                                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="amount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Amount (GHS)</FormLabel>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-2.5 text-muted-foreground">GHS</span>
                                                                        <Input className="pl-12" placeholder="0.00" {...field} />
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="mobileNetwork"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Mobile Network</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select network" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                                                                        <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                                                                        <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="mobileNumber"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Mobile Number</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="024XXXXXXX" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <Button
                                                        type="submit"
                                                        className="w-full bg-green-600 hover:bg-green-700"
                                                        disabled={withdrawMutation.isPending}
                                                    >
                                                        {withdrawMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Confirm Withdrawal
                                                    </Button>
                                                </form>
                                            </Form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Stats Cards */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    GHS {transactions
                                        ?.filter((t: WalletTransaction) => t.type === 'credit')
                                        .reduce((acc: number, t: WalletTransaction) => acc + Number(t.amount), 0)
                                        .toFixed(2) || "0.00"}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lifetime earnings from sales
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                                <History className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    GHS {withdrawals
                                        ?.filter((w: Withdrawal) => w.status === 'pending' || w.status === 'processing')
                                        .reduce((acc: number, w: Withdrawal) => acc + Number(w.amount), 0)
                                        .toFixed(2) || "0.00"}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Currently being processed
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>

            <Tabs defaultValue="transactions" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>
                                Recent activity on your wallet
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isTransactionsLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : transactions?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                    <p>No transactions yet</p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={container}
                                    initial="hidden"
                                    animate="show"
                                    className="space-y-4"
                                >
                                    {transactions?.map((transaction: WalletTransaction) => (
                                        <motion.div
                                            key={transaction.id}
                                            variants={item}
                                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${transaction.type === 'credit'
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    {transaction.type === 'credit' ? (
                                                        <ArrowDownLeft className="h-5 w-5" />
                                                    ) : (
                                                        <ArrowUpRight className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{transaction.description}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(new Date(transaction.createdAt), "MMM d, yyyy • h:mm a")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {transaction.type === 'credit' ? '+' : '-'}
                                                GHS {Number(transaction.amount).toFixed(2)}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawals" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Withdrawal History</CardTitle>
                            <CardDescription>
                                Status of your withdrawal requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isWithdrawalsLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : withdrawals?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Banknote className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                    <p>No withdrawals yet</p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={container}
                                    initial="hidden"
                                    animate="show"
                                    className="space-y-4"
                                >
                                    {withdrawals?.map((withdrawal: Withdrawal) => (
                                        <motion.div
                                            key={withdrawal.id}
                                            variants={item}
                                            className="flex items-center justify-between p-4 rounded-lg border bg-card"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                                                    <Smartphone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Mobile Money Withdrawal</p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{format(new Date(withdrawal.createdAt), "MMM d, yyyy")}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{withdrawal.mobileNetwork}</span>
                                                        <span>•</span>
                                                        <span>{withdrawal.mobileNumber}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">
                                                    GHS {Number(withdrawal.amount).toFixed(2)}
                                                </div>
                                                <div className={`text-xs font-medium uppercase mt-1 ${withdrawal.status === 'completed' ? 'text-green-600' :
                                                    withdrawal.status === 'failed' ? 'text-red-600' :
                                                        'text-orange-600'
                                                    }`}>
                                                    {withdrawal.status}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
