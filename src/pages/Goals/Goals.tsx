// import { useFinance } from "../../context/FinanceContext";
// import GoalForm from "../../components/forms/GoalForm";

// export default function Goals() {
//   const { goals, updateGoalProgress } = useFinance();

//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-4">Goals</h1>
//       <GoalForm />

//       <div className="grid md:grid-cols-2 gap-4">
//         {goals.map((g) => {
//           const progress = Math.min(
//             (g.savedAmount / g.targetAmount) * 100,
//             100
//           ).toFixed(1);
//           return (
//             <div key={g.id} className="bg-white p-4 rounded shadow">
//               <h3 className="font-semibold mb-2">{g.title}</h3>
//               <div className="h-3 bg-gray-200 rounded mb-2">
//                 <div
//                   style={{ width: `${progress}%` }}
//                   className="h-3 bg-blue-500 rounded"
//                 />
//               </div>
//               <p className="text-sm text-gray-600 mb-2">
//                 ₹{g.savedAmount} / ₹{g.targetAmount} ({progress}%)
//               </p>
//               <p className="text-sm text-gray-500 mb-2">
//                 Deadline: {new Date(g.deadline).toLocaleDateString()}
//               </p>
//               <button
//                 className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
//                 onClick={() => updateGoalProgress(g.id, 500)}
//               >
//                 Add ₹500
//               </button>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import GoalForm from "../../components/forms/GoalForm";

export default function Goals() {
  const { goals, updateGoalProgress, editGoal } = useFinance();
  const [sortBy, setSortBy] = useState("progress");
  const [editingGoal, setEditingGoal] = useState<any | null>(null);

  const sortedGoals = [...goals].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    } else {
      const progressA = (a.savedAmount / a.targetAmount) * 100;
      const progressB = (b.savedAmount / b.targetAmount) * 100;
      return progressB - progressA;
    }
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    editGoal(editingGoal.id, {
      title: editingGoal.title,
      targetAmount: editingGoal.targetAmount,
      deadline: editingGoal.deadline,
      description: editingGoal.description,
    });
    setEditingGoal(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Goals — Planning & Progress</h1>
      <GoalForm />

      <div className="flex justify-end mb-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="progress">Sort by Progress</option>
          <option value="date">Sort by Due Date</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sortedGoals.map((g) => {
          const progress = Math.min(
            (g.savedAmount / g.targetAmount) * 100,
            100
          );
          const isComplete = progress >= 100;

          return (
            <div
              key={g.id}
              className={`bg-white p-4 rounded shadow border-l-4 ${
                isComplete ? "border-green-600" : "border-blue-500"
              }`}
            >
              <h3 className="font-semibold text-lg mb-1">{g.title}</h3>
              <p className="text-sm text-gray-500 mb-2">
                Target: ₹{g.targetAmount.toLocaleString()} | Saved: ₹
                {g.savedAmount.toLocaleString()}
              </p>

              <div className="h-3 bg-gray-200 rounded mb-2">
                <div
                  style={{ width: `${progress}%` }}
                  className={`h-3 rounded ${
                    isComplete ? "bg-green-500" : "bg-blue-500"
                  }`}
                />
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {progress.toFixed(1)}% complete — Deadline:{" "}
                {new Date(g.deadline).toLocaleDateString()}
              </p>

              {g.description && (
                <p className="text-sm text-gray-700 mb-2 italic">
                  {g.description}
                </p>
              )}

              <div className="flex gap-2">
                {!isComplete && (
                  <>
                    <button
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      onClick={() => updateGoalProgress(g.id, 1000)}
                    >
                      Add ₹1000
                    </button>
                    <button
                      className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                      onClick={() => setEditingGoal(g)}
                    >
                      Edit
                    </button>
                  </>
                )}
                {isComplete && (
                  <span className="text-green-700 font-medium text-sm">
                    ✅ Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Edit Modal ---------- */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Edit Goal</h2>

            <form onSubmit={handleEditSubmit}>
              <input
                type="text"
                value={editingGoal.title}
                onChange={(e) =>
                  setEditingGoal({ ...editingGoal, title: e.target.value })
                }
                className="border p-2 rounded w-full mb-2"
                placeholder="Goal title"
                required
              />

              <input
                type="number"
                value={editingGoal.targetAmount}
                onChange={(e) =>
                  setEditingGoal({
                    ...editingGoal,
                    targetAmount: Number(e.target.value),
                  })
                }
                className="border p-2 rounded w-full mb-2"
                placeholder="Target amount"
                required
              />

              <input
                type="date"
                value={editingGoal.deadline}
                onChange={(e) =>
                  setEditingGoal({ ...editingGoal, deadline: e.target.value })
                }
                className="border p-2 rounded w-full mb-2"
                required
              />

              <textarea
                value={editingGoal.description || ""}
                onChange={(e) =>
                  setEditingGoal({
                    ...editingGoal,
                    description: e.target.value,
                  })
                }
                className="border p-2 rounded w-full mb-3"
                rows={3}
                placeholder="Description (optional)"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
