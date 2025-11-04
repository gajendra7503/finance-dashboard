import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { addTransaction, type Transaction } from "../../services/financeService";

interface Props {
  onTransactionAdded: (transaction: Transaction) => void;
  onClose?: () => void; // optional callback for closing modal
  initialData?: Transaction; // optional for editing
}

export default function TransactionForm({ onTransactionAdded, onClose, initialData }: Props) {
  const { user } = useAuth();

  // Pre-fill form fields; for new transaction, default date is today
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [formData, setFormData] = useState({
    type: initialData?.type || "income",
    amount: initialData?.amount?.toString() || "",
    category: initialData?.category || "",
    date: initialData?.date || today,
    note: initialData?.note || "",
  });

  const [loading, setLoading] = useState(false);

  const incomeSources = ["Salary", "Business", "Investments", "Freelance", "Other Income"];
  const expenseCategories = ["Food", "Travel", "Bills", "Shopping", "Health", "Education", "Entertainment", "Other Expenses"];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const doc = await addTransaction({
        userId: user.$id ?? "",
        type: formData.type as "income" | "expense",
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        note: formData.note || undefined,
        id: initialData?.id
      });

      const transaction: Transaction = {
        userId: user.$id,
        type: formData.type as "income" | "expense",
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        note: formData.note || undefined,
        ...(doc && (doc as any)._id && { id: (doc as any)._id })
      };

      onTransactionAdded(transaction);
      setFormData({ type: "income", amount: "", category: "", date: today, note: "" });
      onClose?.(); // close modal if editing
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = formData.type === "income" ? incomeSources : expenseCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-md shadow-md w-full max-w-md space-y-4 relative"
      >
        <h2 className="text-xl font-bold mb-2">{initialData ? "Edit Transaction" : "Add Transaction"}</h2>

        <div className="flex flex-col">
          <label htmlFor="type" className="mb-1 font-medium">Type</label>
          <select
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="amount" className="mb-1 font-medium">Amount (₹)</label>
          <input
            type="number"
            name="amount"
            id="amount"
            placeholder="Enter transaction amount"
            value={formData.amount}
            onChange={handleChange}
            required
            className="border p-2 rounded w-full"
          />
        </div>

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
            <option value="" disabled>
              Select {formData.type === "income" ? "Income Source" : "Expense Category"}
            </option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="date" className="mb-1 font-medium">Date</label>
          <input
            type="date"
            name="date"
            id="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="note" className="mb-1 font-medium">Note</label>
          <input
            type="text"
            name="note"
            id="note"
            placeholder="Optional note"
            value={formData.note}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex justify-between items-center">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Saving..." : initialData ? "Update Transaction" : "Add Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
