import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { addTransaction, type Transaction } from "../../services/financeService";

interface Props {
  onTransactionAdded: (transaction: Transaction) => void;
}

export default function TransactionForm({ onTransactionAdded }: Props) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: "income",
    amount: "",
    category: "",
    date: "",
    note: "",
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
        id: undefined
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
      setFormData({ type: "income", amount: "", category: "", date: "", note: "" });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = formData.type === "income" ? incomeSources : expenseCategories;

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-4 border rounded-md">
      <select
        name="type"
        value={formData.type}
        onChange={handleChange}
        className="border p-2 rounded w-full"
      >
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>

      <input
        type="number"
        name="amount"
        placeholder="Amount"
        value={formData.amount}
        onChange={handleChange}
        required
        className="border p-2 rounded w-full"
      />

      <select
        name="category"
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

      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
        className="border p-2 rounded w-full"
      />

      <input
        type="text"
        name="note"
        placeholder="Note (optional)"
        value={formData.note}
        onChange={handleChange}
        className="border p-2 rounded w-full"
      />

      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded w-full"
        disabled={loading}
      >
        {loading ? "Adding..." : "Add Transaction"}
      </button>
    </form>
  );
}
