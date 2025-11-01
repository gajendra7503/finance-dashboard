// import { useState, type FormEvent } from "react";
// import { useFinance } from "../../context/FinanceContext";

// export default function GoalForm() {
//   const { addGoal } = useFinance();
//   const [title, setTitle] = useState("");
//   const [targetAmount, setTargetAmount] = useState("");
//   const [deadline, setDeadline] = useState("");

//   const handleSubmit = (e: FormEvent) => {
//     e.preventDefault();
//     if (!title || !targetAmount || !deadline) return;
//     addGoal({
//       title,
//       targetAmount: Number(targetAmount),
//       deadline,
//     });
//     setTitle("");
//     setTargetAmount("");
//     setDeadline("");
//   };

//   return (
//     <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
//       <h2 className="text-lg font-semibold mb-3">Add Goal</h2>
//       <input
//         type="text"
//         placeholder="Goal Title"
//         value={title}
//         onChange={(e) => setTitle(e.target.value)}
//         className="border p-2 rounded w-full mb-2"
//       />
//       <input
//         type="number"
//         placeholder="Target Amount"
//         value={targetAmount}
//         onChange={(e) => setTargetAmount(e.target.value)}
//         className="border p-2 rounded w-full mb-2"
//       />
//       <input
//         type="date"
//         value={deadline}
//         onChange={(e) => setDeadline(e.target.value)}
//         className="border p-2 rounded w-full mb-3"
//       />
//       <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
//         Add Goal
//       </button>
//     </form>
//   );
// }

import { useState, type FormEvent } from "react";
import { useFinance } from "../../context/FinanceContext";

export default function GoalForm() {
  const { addGoal } = useFinance();
  const [form, setForm] = useState({
    title: "",
    targetAmount: "",
    deadline: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const { title, targetAmount, deadline, description } = form;
    if (!title || !targetAmount || !deadline) return;

    addGoal({
      title,
      targetAmount: Number(targetAmount),
      deadline,
      description,
      completed: false, // default new goals to incomplete
    });

    setForm({
      title: "",
      targetAmount: "",
      deadline: "",
      description: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
      <h2 className="text-lg font-semibold mb-3">Add Goal</h2>

      <input
        type="text"
        name="title"
        placeholder="Goal Title"
        value={form.title}
        onChange={handleChange}
        className="border p-2 rounded w-full mb-2"
        required
      />

      <input
        type="number"
        name="targetAmount"
        placeholder="Target Amount (₹)"
        value={form.targetAmount}
        onChange={handleChange}
        className="border p-2 rounded w-full mb-2"
        required
      />

      <input
        type="date"
        name="deadline"
        value={form.deadline}
        onChange={handleChange}
        className="border p-2 rounded w-full mb-2"
        required
      />

      <textarea
        name="description"
        placeholder="Description (optional)"
        value={form.description}
        onChange={handleChange}
        className="border p-2 rounded w-full mb-3"
        rows={3}
      />

      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
        Add Goal
      </button>
    </form>
  );
}
