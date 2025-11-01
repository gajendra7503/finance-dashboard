import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useFinance } from "../../context/FinanceContext";

export default function IncomeChart() {
  const { transactions } = useFinance();

  const data = useMemo(() => {
    const incomeData = transactions.filter((t) => t.type === "income");
    const grouped: Record<string, number> = {};

    incomeData.forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [transactions]);

  if (data.length === 0)
    return <div className="text-gray-400 text-sm">No income data yet.</div>;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-4">Income by Category</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#4ade80" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
