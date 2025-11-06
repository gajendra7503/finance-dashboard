import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, getGoals, type Transaction, type Goal } from "../../services/financeService";
import { useAuth } from "../../context/AuthContext";
import { PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

// ================== Dashboard ==================
export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.$id ?? "";

  const { data: transactions, isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["transactions", userId],
    queryFn: async () => {
      const res = await getTransactions(userId);
       console.log("Dashboard Fetched transactions:", res.transactions);
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

  // -------------------- Month Filter --------------------
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Generate months dynamically from transactions
  const availableMonths = useMemo(() => {
    if (!transactions) return [];
    const months = new Set(
      transactions.map((t) => {
        const date = new Date(t.date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      })
    );
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // -------------------- Derived Calculations --------------------
  const {
    monthlyIncome,
    monthlyExpense,
    netBalance,
    balanceOverTime,
    transactionsByCategory,
    upcomingPayments,
    totalIncomeAllTime,
  } = useMemo(() => {
    if (!transactions)
      return {
        monthlyIncome: 0,
        monthlyExpense: 0,
        netBalance: 0,
        balanceOverTime: [],
        transactionsByCategory: [],
        upcomingPayments: [],
        totalIncomeAllTime: 0,
      };

    // Filter by month if selected
    let filteredTx = transactions;
 if (selectedMonth !== "all") {
  const [year, month] = selectedMonth.split("-").map(Number);
  filteredTx = transactions.filter((t) => {
    const d = new Date(t.date);

    // Normalize both to local timezone (Appwrite stores UTC by default)
    const localYear = d.getFullYear();
    const localMonth = d.getMonth() + 1;

    return localYear === year && localMonth === month;
  });
}


    // --- Monthly Income ---
    const monthlyIncome = filteredTx
      .filter((t) => t.type?.toLowerCase() === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // --- Monthly Expense ---
    const monthlyExpense = filteredTx
      .filter((t) => t.type?.toLowerCase() === "expense")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const netBalance = monthlyIncome - monthlyExpense;

    // --- FIXED: All Time Income Calculation ---
    const totalIncomeAllTime = transactions
      .filter((t) => t.type?.toLowerCase() === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // --- Expenses by Category ---
    const expensesByCategory = Object.entries(
      filteredTx
        .filter((t) => t.type?.toLowerCase() === "expense")
        .reduce((acc: Record<string, number>, t) => {
          acc[t.category] = (acc[t.category] || 0) + (Number(t.amount) || 0);
          return acc;
        }, {})
    ).map(([category, value]) => ({ name: category, value }));

    // --- Income for Pie Chart ---
    const totalIncome = filteredTx
      .filter((t) => t.type?.toLowerCase() === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const transactionsByCategory = [
      { name: "Income", value: totalIncome },
      ...expensesByCategory,
    ].filter((t) => t.value > 0);

    // --- Balance Over Time ---
    const balanceOverTime = filteredTx
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce((acc: { date: string; balance: number }[], t) => {
        const last = acc.length ? acc[acc.length - 1].balance : 0;
        const newBalance =
          t.type?.toLowerCase() === "income" ? last + (Number(t.amount) || 0) : last - (Number(t.amount) || 0);
        acc.push({ date: t.date, balance: newBalance });
        return acc;
      }, []);

    // --- Upcoming Payments ---
    const upcomingPayments = filteredTx.filter(
      (t) => t.type?.toLowerCase() === "expense" && new Date(t.date) > new Date()
    );

    return {
      monthlyIncome,
      monthlyExpense,
      netBalance,
      balanceOverTime,
      transactionsByCategory,
      upcomingPayments,
      totalIncomeAllTime,
    };
  }, [transactions, selectedMonth]);

  // -------------------- Accordion State --------------------
  const [showSummary, setShowSummary] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  if (isLoading) return <DashboardSkeleton />;

  // -------------------- UI --------------------
  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 text-gray-900">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <h2 className="text-lg text-gray-500">
            Welcome back, {user?.firstName || "User"} 👋
          </h2>
        </div>

        {/* Month Filter */}
        <select
          className="border rounded-lg p-2 shadow-sm text-gray-700 bg-white"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="all">All Months</option>
          {availableMonths.map((m) => {
            const [year, month] = m.split("-");
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long" });
            return (
              <option key={m} value={m}>
                {monthName} {year}
              </option>
            );
          })}
        </select>
      </div>

      {/* ---------------- Summary Accordion ---------------- */}
      <AccordionSection title="Summary" isOpen={showSummary} setIsOpen={setShowSummary}>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
          <SummaryCard title={`Total Income (${selectedMonth === "all" ? "All Time" : "Selected Month"})`} value={`₹${monthlyIncome.toLocaleString()}`} color="green" />
          <SummaryCard title="Total Expense" value={`₹${monthlyExpense.toLocaleString()}`} color="red" />
          <SummaryCard title="Net Balance" value={`₹${netBalance.toLocaleString()}`} color="blue" />
          <SummaryCard title="Active Goals" value={`${goals?.length ?? 0}`} color="purple" />
          <SummaryCard title="Total Income (All Time)" value={`₹${totalIncomeAllTime.toLocaleString()}`} color="green" />
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
        {upcomingPayments.length === 0 ? (
          <p className="text-gray-500">No upcoming payments.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingPayments
              .slice()
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((payment) => {
                const paymentDate = new Date(payment.date);
                const today = new Date();
                const diffDays = Math.ceil(
                  (paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = diffDays < 0;
                const isDueSoon = diffDays >= 0 && diffDays <= 7;

                return (
                  <li
                    key={payment.$id}
                    className={`flex justify-between items-center p-2 border rounded
                      ${isOverdue
                        ? "bg-red-500 text-white border-red-700"
                        : isDueSoon
                        ? "bg-red-100 border-red-400"
                        : "bg-white border-gray-200"
                      }`}
                  >
                    <span>{payment.category}</span>
                    <span>
                      ₹{payment.amount.toLocaleString()}
                      {isOverdue && <span className="font-bold ml-2">❌ Overdue</span>}
                      {isDueSoon && !isOverdue && (
                        <span className="text-red-600 font-semibold ml-2">
                          ⚠️ Due Soon
                        </span>
                      )}
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

// -------------------- Reusable Components --------------------
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

function SpendingPieChart({ data }: { data: { name: string; value: number }[] }) {
  const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948"];
  if (data.length === 0)
    return <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">No expense data to display.</div>;

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
  if (data.length === 0)
    return <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">No balance trend data available.</div>;

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
            <p className="text-sm text-gray-500 mt-1">
              ₹{goal.savedAmount} / ₹{goal.targetAmount} ({progress.toFixed(1)}%)
            </p>
          </div>
        );
      })}
    </div>
  );
}

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
