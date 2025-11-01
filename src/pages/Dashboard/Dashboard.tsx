import {  useMemo} from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, getGoals, type Transaction, type Goal } from "../../services/financeService";
import { useAuth } from "../../context/AuthContext";
import { PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

// ================== Dashboard ==================
export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.$id ?? "";

  const { data: transactions,
     isLoading: loadingTransactions,
   } = useQuery<Transaction[]>({
  queryKey: ["transactions", userId],
  queryFn: async () => {
    const res = await getTransactions(userId);
    return Array.isArray(res) ? res : res.transactions; // unwrap if necessary
  },
  enabled: !!userId,
});

  const {
  data: goals,
  isLoading: loadingGoals, // <-- this defines loadingGoals
} = useQuery<Goal[]>({
  queryKey: ["goals", userId],
  queryFn: () => getGoals(userId),
  enabled: !!userId,
});
  const isLoading = loadingTransactions || loadingGoals;

  // ----------------- Derived Calculations -----------------
  const { balance, balanceOverTime, transactionsByCategory } = useMemo(() => {
    if (!transactions) return { balance: 0, expensesByCategory: [], balanceOverTime: [], transactionsByCategory: []  };

    const txs = transactions as Transaction[];

   const income = (transactions ?? []).filter((t: Transaction) => t.type === "income")
  .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

const expenses = (transactions ?? []).filter((t: Transaction) => t.type === "expense")
  .reduce((sum: number, t: Transaction) => sum + t.amount, 0);


    const balance = income - expenses;

    const expensesByCategory = Object.entries(
      txs
        .filter((t) => t.type === "expense")
        .reduce((acc: Record<string, number>, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>)
    ).map(([category, amount]) => ({ name: category, value: amount as number }));

     // Income by category (optional: just label as "Income")
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const transactionsByCategory = [
    { name: "Income", value: totalIncome },
    ...expensesByCategory
  ].filter((t) => t.value > 0);

    const balanceOverTime = txs
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce(
        (acc: { date: string; balance: number }[], t: Transaction) => {
          const last = acc.length ? acc[acc.length - 1].balance : 0;
          const newBalance = t.type === "income" ? last + t.amount : last - t.amount;
          acc.push({ date: typeof t.date === "string" ? t.date : new Date(t.date).toISOString(), balance: newBalance });
          return acc;
        },
        [] as { date: string; balance: number }[]
      );

    return { balance, expensesByCategory, balanceOverTime, transactionsByCategory };
  }, [transactions]);

  // ----------------- Loading State -----------------
  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <h2 className="text-xl text-gray-600 mb-6">Welcome back, {user?.username || "User"} 👋</h2>

      {/* Header Cards */}
      <DashboardHeader balance={balance} goalCount={Array.isArray(goals) ? goals.length : 0} />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SpendingPieChart data={transactionsByCategory} />
        <BalanceLineChart data={balanceOverTime} />
      </div>

      {/* Goals */}
      <GoalProgressList goals={(goals ?? []) as Goal[]} />
    </div>
  );
}

//
// ──────────────────────────────────────────────
// COMPONENTS BELOW
// ──────────────────────────────────────────────
//

function DashboardHeader({ balance, goalCount }: { balance: number; goalCount: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      <div className="bg-green-100 rounded-xl p-4 shadow">
        <h3 className="text-lg font-semibold text-gray-700">Current Balance</h3>
        <p className="text-2xl font-bold text-green-700">₹{balance.toLocaleString()}</p>
      </div>
      <div className="bg-blue-100 rounded-xl p-4 shadow">
        <h3 className="text-lg font-semibold text-gray-700">Active Goals</h3>
        <p className="text-2xl font-bold text-blue-700">{goalCount}</p>
      </div>
    </div>
  );
}

function SpendingPieChart({ data }: { data: { name: string; value: number }[] }) {
  const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948"];

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">
        No expense data to display.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <PieChart width={320} height={300}>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100}>
          {data.map((_entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}

function BalanceLineChart({ data }: { data: { date: string; balance: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">
        No balance trend data available.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Balance Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(date) => date.split("T")[0]} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GoalProgressList({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">
        No active goals yet.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Your Goals</h3>
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
          return (
            <div key={goal.$id} className="pb-2 border-b last:border-0">
              <p className="font-medium text-gray-700">{goal.title}</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                ₹{goal.savedAmount} / ₹{goal.targetAmount} ({progress.toFixed(1)}%)
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="h-8 w-1/3 bg-gray-300 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="h-24 bg-gray-300 rounded-xl" />
        <div className="h-24 bg-gray-300 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-80 bg-gray-300 rounded-xl" />
        <div className="h-80 bg-gray-300 rounded-xl" />
      </div>
      <div className="h-48 bg-gray-300 rounded-xl" />
    </div>
  );
}
