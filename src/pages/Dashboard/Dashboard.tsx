import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, getGoals, type Transaction, type Goal } from "../../services/financeService";
import { useAuth } from "../../context/AuthContext";
import { PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

// ================== Dashboard ==================
export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.$id ?? "";

  const { data: transactions, isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["transactions", userId],
    queryFn: async () => {
      const res = await getTransactions(userId);
      return Array.isArray(res) ? res : res.transactions;
    },
    enabled: !!userId,
  });

  const { data: goals, isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const isLoading = loadingTransactions || loadingGoals;

  // -------------------- Derived Calculations --------------------
  const {
    monthlyIncome,
    monthlyExpense,
    netBalance,
    balanceOverTime,
    transactionsByCategory,
    upcomingPayments,
  } = useMemo(() => {
    if (!transactions) return { monthlyIncome: 0, monthlyExpense: 0, netBalance: 0, balanceOverTime: [], transactionsByCategory: [], upcomingPayments: [] };

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const currentMonthTx = transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === month && txDate.getFullYear() === year;
    });

    const monthlyIncome = currentMonthTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = currentMonthTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const netBalance = monthlyIncome - monthlyExpense;

    const expensesByCategory = Object.entries(transactions.filter((t) => t.type === "expense").reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {})).map(([category, value]) => ({ name: category, value }));

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const transactionsByCategory = [{ name: "Income", value: totalIncome }, ...expensesByCategory].filter((t) => t.value > 0);

    const balanceOverTime = transactions.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc: { date: string; balance: number }[], t) => {
      const last = acc.length ? acc[acc.length - 1].balance : 0;
      const newBalance = t.type === "income" ? last + t.amount : last - t.amount;
      acc.push({ date: t.date, balance: newBalance });
      return acc;
    }, []);

    const upcomingPayments = transactions.filter((t) => t.type === "expense" && new Date(t.date) > new Date());

    return { monthlyIncome, monthlyExpense, netBalance, balanceOverTime, transactionsByCategory, upcomingPayments };
  }, [transactions]);

  // -------------------- Accordion State --------------------
  // Default to open
  const [showSummary, setShowSummary] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 text-gray-900">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <h2 className="text-lg text-gray-500 mb-6">Welcome back, {user?.firstName || "User"} 👋</h2>

      {/* ---------------- Summary Accordion ---------------- */}
      <AccordionSection title="Summary" isOpen={showSummary} setIsOpen={setShowSummary}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <SummaryCard title="Total Income (This Month)" value={`₹${monthlyIncome.toLocaleString()}`} color="green" />
          <SummaryCard title="Total Expense (This Month)" value={`₹${monthlyExpense.toLocaleString()}`} color="red" />
          <SummaryCard title="Net Balance" value={`₹${netBalance.toLocaleString()}`} color="blue" />
          <SummaryCard title="Active Goals" value={`${goals?.length ?? 0}`} color="purple" />
        </div>
      </AccordionSection>

      {/* ---------------- Charts Accordion ---------------- */}
      <AccordionSection title="Charts" isOpen={showCharts} setIsOpen={setShowCharts}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SpendingPieChart data={transactionsByCategory} />
          <BalanceLineChart data={balanceOverTime} />
        </div>
      </AccordionSection>

      {/* ---------------- Goals Accordion ---------------- */}
      <AccordionSection title="Goals" isOpen={showGoals} setIsOpen={setShowGoals}>
        <GoalProgressList goals={goals ?? []} />
      </AccordionSection>

   {/* ---------------- Payments Accordion ---------------- */}
      <AccordionSection title="Payments" isOpen={showPayments} setIsOpen={setShowPayments}>
        {/* Payments Summary Cards */}
        {upcomingPayments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-xl shadow text-center">
              <h4 className="text-gray-600 font-medium">Total Payments</h4>
              <p className="text-2xl font-bold">₹{upcomingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-red-500 text-white p-4 rounded-xl shadow text-center">
              <h4 className="font-medium">Overdue Payments</h4>
              <p className="text-2xl font-bold">
                ₹{upcomingPayments.filter((p) => new Date(p.date).getTime() < new Date().getTime())
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="bg-red-100 text-red-700 p-4 rounded-xl shadow text-center">
              <h4 className="font-medium">Due Soon (7 Days)</h4>
              <p className="text-2xl font-bold">
                ₹{upcomingPayments.filter((p) => {
                  const diffDays = Math.ceil((new Date(p.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return diffDays >= 0 && diffDays <= 7;
                }).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Payment List */}
        {upcomingPayments.length === 0 ? (
          <p className="text-gray-500">No upcoming payments.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingPayments.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((payment) => {
              const paymentDate = new Date(payment.date);
              const today = new Date();
              const diffDays = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0;
              const isDueSoon = diffDays >= 0 && diffDays <= 7;

              return (
                <li
                  key={payment.$id}
                  className={`flex justify-between items-center p-2 border rounded
                    ${isOverdue ? "bg-red-500 text-white border-red-700" :
                    isDueSoon ? "bg-red-100 border-red-400" : "bg-white border-gray-200"}`}
                >
                  <span>{payment.category}</span>
                  <span>
                    ₹{payment.amount.toLocaleString()}
                    {isOverdue && <span className="font-bold ml-2">❌ Overdue</span>}
                    {isDueSoon && !isOverdue && <span className="text-red-600 font-semibold ml-2">⚠️ Due Soon</span>}
                  </span>
                  <span>{paymentDate.toLocaleDateString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </AccordionSection>
    </div>
  );
}


// -------------------- Accordion Component --------------------
function AccordionSection({ title, isOpen, setIsOpen, children }: { title: string; isOpen: boolean; setIsOpen: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-4 font-medium flex justify-between items-center border-b">
        {title} <span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

// -------------------- Summary Card --------------------
function SummaryCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <div className={`rounded-xl p-4 shadow text-center font-semibold ${colorClasses[color]}`}>
      <h3 className="text-md">{title}</h3>
      <p className="text-2xl mt-2">{value}</p>
    </div>
  );
}

// -------------------- Charts --------------------
function SpendingPieChart({ data }: { data: { name: string; value: number }[] }) {
  const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948"];
  if (data.length === 0) return <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">No expense data to display.</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <PieChart width={320} height={300}>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100}>
          {data.map((_entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}

function BalanceLineChart({ data }: { data: { date: string; balance: number }[] }) {
  if (data.length === 0) return <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">No balance trend data available.</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Balance Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(d) => d.split("T")[0]} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// -------------------- Goals --------------------
function GoalProgressList({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) return <p className="text-gray-500">No active goals yet.</p>;

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
        return (
          <div key={goal.$id}>
            <p className="font-medium">{goal.title}</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500 mt-1">₹{goal.savedAmount} / ₹{goal.targetAmount} ({progress.toFixed(1)}%)</p>
          </div>
        );
      })}
    </div>
  );
}

// -------------------- Skeleton --------------------
function DashboardSkeleton() {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="h-8 w-1/3 bg-gray-300 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="h-24 bg-gray-300 rounded-xl" />
        <div className="h-24 bg-gray-300 rounded-xl" />
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
