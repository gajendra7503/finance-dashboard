import { useEffect, useState } from "react";
import {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getMonthlySpend,
  type Budget
} from "../../services/financeService";
import { useAuth } from "../../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import toast from "react-hot-toast";

const BudgetPage = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Omit<Budget, "$id">>({
    userId: user?.$id || "",
    category: "",
    month,
    budgetAmount: 0,
    spentAmount: 0,
    notes: "",
    alertThreshold: 80
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const categories = [
    "Food",
    "Travel",
    "Bills",
    "Shopping",
    "Entertainment",
    "Health",
    "Education",
    "Other"
  ];

  // 🔹 Load Budgets + Actual Spend
  const loadBudgets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [budgetsData, spendData] = await Promise.all([
        getBudgets(user.$id!, month),
        getMonthlySpend(user.$id!, month)
      ]);

      const updated = budgetsData.map((b) => ({
        ...b,
        spentAmount: b.spentAmount ?? spendData[b.category] ?? 0
      }));

      setBudgets(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [user, month]);

  // 🔹 Handle Form Input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "budgetAmount" || name === "alertThreshold" || name === "spentAmount"
          ? parseFloat(value)
          : value
    }));
  };

  // 🔹 Add / Update Budget
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = { ...formData, userId: user.$id!, month };

    try {
      if (editingId) {
        await updateBudget(editingId, payload);
        toast.success("Budget updated successfully");
      } else {
        await createBudget(payload);
        toast.success("Budget added successfully");
      }
      setFormData({
        userId: user.$id!,
        category: "",
        month,
        budgetAmount: 0,
        spentAmount: 0,
        notes: "",
        alertThreshold: 80
      });
      setEditingId(null);
      loadBudgets();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save budget");
    }
  };

  // 🔹 Edit Budget
  const handleEdit = (b: Budget) => {
    setEditingId(b.$id || null);
    setFormData({
      userId: b.userId,
      category: b.category,
      month: b.month,
      budgetAmount: b.budgetAmount,
      spentAmount: b.spentAmount ?? 0,
      notes: b.notes || "",
      alertThreshold: b.alertThreshold
    });
  };

  // 🔹 Delete Budget
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await deleteBudget(id);
      toast.success("Budget deleted");
      loadBudgets();
    } catch (err) {
      toast.error("Failed to delete budget");
    }
  };

  // 🔹 Prepare Chart Data
  const chartData = budgets.map((b) => ({
    category: b.category,
    Budgeted: b.budgetAmount,
    Spent: b.spentAmount
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">💰 Monthly Budget Management</h2>

      {/* Month Selector */}
      <div className="mb-4">
        <label className="font-medium mr-2">Select Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {/* Add/Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 mb-6 border p-4 rounded shadow"
      >
        <div className="flex flex-col">
          <label htmlFor="category" className="mb-1 font-medium">Category</label>
          <select
            name="category"
            id="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="border p-2 rounded w-full"
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="budgetAmount" className="mb-1 font-medium">Budget Amount (₹)</label>
          <input
            type="number"
            name="budgetAmount"
            id="budgetAmount"
            placeholder="Enter budget amount"
            value={formData.budgetAmount}
            onChange={handleChange}
            required
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="spentAmount" className="mb-1 font-medium">Spent Amount (₹)</label>
          <input
            type="number"
            name="spentAmount"
            id="spentAmount"
            placeholder="Enter spent amount (optional)"
            value={formData.spentAmount}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="alertThreshold" className="mb-1 font-medium">Alert Threshold (%)</label>
          <input
            type="number"
            name="alertThreshold"
            id="alertThreshold"
            placeholder="E.g., 80"
            value={formData.alertThreshold}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex flex-col col-span-2">
          <label htmlFor="notes" className="mb-1 font-medium">Notes</label>
          <textarea
            name="notes"
            id="notes"
            placeholder="Optional notes for this budget"
            value={formData.notes}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 col-span-2"
        >
          {editingId ? "Update Budget" : "Add Budget"}
        </button>
      </form>

      {/* Budgets Table */}
      {loading ? (
        <p>Loading budgets...</p>
      ) : (
        <table className="w-full border-collapse border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Category</th>
              <th className="border p-2">Budget</th>
              <th className="border p-2">Spent</th>
              <th className="border p-2">Notes</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const overspent = (b.spentAmount || 0) > b.budgetAmount;
              const thresholdReached =
                (b.spentAmount || 0) >= (b.budgetAmount * b.alertThreshold) / 100;

              return (
                <tr
                  key={b.$id}
                  className={
                    overspent
                      ? "bg-red-100"
                      : thresholdReached
                      ? "bg-yellow-100"
                      : ""
                  }
                >
                  <td className="border p-2">{b.category}</td>
                  <td className="border p-2">₹{b.budgetAmount}</td>
                  <td className="border p-2">₹{b.spentAmount}</td>
                  <td className="border p-2">{b.notes || "-"}</td>
                  <td className="border p-2">
                    {overspent
                      ? "⚠️ Overspent"
                      : thresholdReached
                      ? "⚡ Near Limit"
                      : "✅ OK"}
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleEdit(b)}
                      className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.$id!)}
                      className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Chart */}
      <h3 className="text-xl font-semibold mt-8 mb-2">📊 Budget vs Spending</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Budgeted" fill="#3b82f6" />
          <Bar dataKey="Spent" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetPage;
