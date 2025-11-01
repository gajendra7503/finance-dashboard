import { useState } from "react";
import { type Transaction } from "../../services/financeService";
import TransactionForm from "../../components/forms/TransactionForm";
import TransactionTable from "../../components/tables/TransactionTable";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);

  const handleTransactionAdded = (t: Transaction) => {
    setTransactions((prev) => [t, ...prev]);
    setShowForm(false); // Close modal after adding transaction
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4 relative">
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>

      {/* Add Transaction Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Transaction
        </button>
      </div>

      {/* Transaction List */}
      <TransactionTable transactions={transactions} />

      {/* Modal with Blurred Background */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-4">Add New Transaction</h2>
            <TransactionForm onTransactionAdded={handleTransactionAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
