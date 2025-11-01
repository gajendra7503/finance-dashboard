import { useEffect, useState } from "react";
import { getTransactions, deleteTransaction, updateTransaction, type Transaction } from "../../services/financeService";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";

interface Props {
  transactions?: Transaction[];
}

export default function TransactionTable({ transactions: initialTransactions = [] }: Props) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const limit = 5;
  const debouncedType = useDebounce(typeFilter, 400);
  const debouncedCategory = useDebounce(category, 400);

  const incomeCategories  = ["Salary", "Business", "Investments", "Freelance", "Other Income"];
  const expenseCategories  = ["Food", "Travel", "Bills", "Shopping", "Health", "Education", "Entertainment", "Other Expenses"];

  const fetchTransactions = async () => {
    if (!user?.$id) return;
    setLoading(true);
    setError("");

    try {
      const { transactions, total } = await getTransactions(user.$id, {
        search: debouncedType,
        category: debouncedCategory,
        page,
        limit,
      });
      setTransactions(transactions);
      setTotal(total);
    } catch (err: any) {
      console.error("Failed to fetch transactions:", err);
      setError(err.message || "Failed to fetch transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, debouncedType, debouncedCategory, page]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      fetchTransactions();
    } catch (err: any) {
      console.error("Failed to delete transaction:", err);
      setError(err.message || "Failed to delete transaction.");
    }
  };

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingTransaction) return;
    const { name, value } = e.target;
    setEditingTransaction({
    ...editingTransaction,
    [name]: name === "amount" ? parseFloat(value) : value,
  });
  };

  const handleUpdate = async () => {
    if (!editingTransaction || !user?.$id) return;
    try {
      await updateTransaction(editingTransaction.$id, editingTransaction);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (err: any) {
      console.error("Failed to update transaction:", err);
      setError(err.message || "Failed to update transaction.");
    }
  };

  if (loading) return <div>Loading transactions...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const categoriesToShow =
    typeFilter === "income"
      ? incomeCategories
      : typeFilter === "expense"
      ? expenseCategories
      : [...incomeCategories, ...expenseCategories]; 

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
            setCategory("");
          }}
          className="border px-3 py-2 rounded-md"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="border px-3 py-2 rounded-md"
        >
          <option value="">All Categories</option>
          {categoriesToShow.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <div>No transactions found.</div>
      ) : (
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Type</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Category</th>
              {/* <th className="border p-2">Date</th> */}
              <th className="border p-2">Note</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.$id}>
                <td className="border p-2">{t.type}</td>
                <td className="border p-2">{t.amount}</td>
                <td className="border p-2">{t.category}</td>
                {/* <td className="border p-2">{t.date}</td> */}
                <td className="border p-2">{t.note || "-"}</td>
                <td className="border p-2 space-x-2">
                  <button className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600" onClick={() => handleEditClick(t)}>Edit</button>
                  <button className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" onClick={() => handleDelete(t.$id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit Form Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
          <div className="bg-white p-6 rounded-md w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Transaction</h3>
            <select
              name="type"
              value={editingTransaction.type}
              onChange={handleEditChange}
              className="border p-2 rounded w-full mb-2"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <input
              type="number"
              name="amount"
              value={editingTransaction.amount}
              onChange={handleEditChange}
              className="border p-2 rounded w-full mb-2"
            />

            <select
              name="category"
              value={editingTransaction.category}
              onChange={handleEditChange}
              className="border p-2 rounded w-full mb-2"
            >
              {(editingTransaction.type === "income" ? incomeCategories : expenseCategories).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* <input
              type="date"
              name="date"
              value={editingTransaction.date}
              onChange={handleEditChange}
              className="border p-2 rounded w-full mb-2"
            /> */}

            <input
              type="text"
              name="note"
              value={editingTransaction.note || ""}
              onChange={handleEditChange}
              placeholder="Note"
              className="border p-2 rounded w-full mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {page} of {Math.ceil(total / limit) || 1}
        </span>
        <button
          onClick={() => setPage((p) => (p < Math.ceil(total / limit) ? p + 1 : p))}
          disabled={page >= Math.ceil(total / limit)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
