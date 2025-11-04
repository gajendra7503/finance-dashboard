
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import {
  addGoal as addGoalService,
  getGoals as getGoalsService,
  updateGoal as updateGoalService,
  type Goal as DBGoal,
} from "../services/financeService";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note?: string;
}

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  description?: string; // optional
  completed?: boolean; // if goal reached
}

interface FinanceContextType {
  transactions: Transaction[];
  goals: Goal[];
  addTransaction: (t: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "savedAmount">) => Promise<void>;
  updateGoalProgress: (id: string, amount: number) => void;
   editGoal: (id: string, updatedData: Partial<Goal>) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // ---------------- Load and Save Transactions ----------------
  useEffect(() => {
    const storedTx = localStorage.getItem("transactions");
    if (storedTx) setTransactions(JSON.parse(storedTx));
  }, []);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("goals", JSON.stringify(goals));
  }, [goals]);

  // ---------------- Load Goals from DB ----------------
  useEffect(() => {
    if (!user?.$id) return;
    (async () => {
      try {
        const dbGoals = await getGoalsService(user.$id as string);
        const formattedGoals: Goal[] = dbGoals
          .filter((g: DBGoal): g is DBGoal & { $id: string } => Boolean(g.$id))
          .map((g: DBGoal & { $id: string }) => ({
            id: g.$id,
            title: g.title,
            targetAmount: g.targetAmount,
            savedAmount: g.savedAmount ?? 0,
            deadline: g.deadline,
            description: g.description ?? "",
            completed: g.completed ?? false,
          }));
        setGoals(formattedGoals);
      } catch (err) {
        console.error("Error loading goals:", err);
        toast.error("Failed to load goals");
      }
    })();
  }, [user]);

  // ---------------- TRANSACTIONS ----------------
  const addTransaction = (t: Omit<Transaction, "id">) => {
    const newTx = { ...t, id: uuid() };
    setTransactions((prev) => [...prev, newTx]);
    localStorage.setItem("transactions", JSON.stringify([...transactions, newTx]));
    toast.success("Transaction added successfully!");
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.error("Transaction deleted");
  };

  // ---------------- GOALS ----------------
  const addGoal = async (g: Omit<Goal, "id" | "savedAmount">) => {
    if (!user?.$id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      // ✅ Use a relaxed type here to avoid type errors
      const goalData: any = {
        userId: user.$id,
        title: g.title,
        targetAmount: g.targetAmount,
        deadline: g.deadline,
        description: g.description ?? "",
        completed: false,
      };

      const newGoalDoc = await addGoalService(goalData);

      const newGoal: Goal = {
        id: newGoalDoc.$id,
        title: newGoalDoc.title,
        targetAmount: newGoalDoc.targetAmount,
        savedAmount: newGoalDoc.savedAmount ?? 0,
        deadline: newGoalDoc.deadline,
        description: newGoalDoc.description ?? "",
        completed: newGoalDoc.completed ?? false,
      };

      setGoals((prev) => [...prev, newGoal]);
      toast.success("Goal added successfully!");
    } catch (error) {
      console.error("Add goal failed:", error);
      toast.error("Failed to save goal");
    }
  };

  const updateGoalProgress = async (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const newSavedAmount = goal.savedAmount + amount;
    const completed = newSavedAmount >= goal.targetAmount;

    // Optimistic update
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, savedAmount: newSavedAmount, completed } : g
      )
    );

    try {
      // ✅ Use `any` to include optional completed flag
      await updateGoalService(id, {
        savedAmount: newSavedAmount,
        completed,
      } as any);

      toast.success("Goal progress updated!");
    } catch (error) {
      console.error("Update goal failed:", error);
      toast.error("Failed to update goal in database");
    }
  };

  // ---------------- EDIT GOAL FUNCTION ----------------
const editGoal = async (id: string, updatedData: Partial<Goal>) => {
  const goal = goals.find((g) => g.id === id);
  if (!goal) {
    toast.error("Goal not found");
    return;
  }

  // Optimistic update (keep old snapshot for rollback)
  const prevGoals = [...goals];
  const updatedGoal = { ...goal, ...updatedData };

  setGoals((prev) =>
    prev.map((g) => (g.id === id ? updatedGoal : g))
  );

  try {
    // Only send allowed fields to Appwrite
    const payload: Partial<Goal> = {
      title: updatedData.title ?? goal.title,
      targetAmount: updatedData.targetAmount ?? goal.targetAmount,
      deadline: updatedData.deadline ?? goal.deadline,
      description: updatedData.description ?? goal.description ?? "",
      completed: updatedData.completed ?? goal.completed ?? false,
    };

    await updateGoalService(id, payload);
    toast.success("Goal updated successfully!");
  } catch (err: any) {
    console.error("Edit goal failed:", err);
    setGoals(prevGoals); // rollback
    toast.error(err?.message || "Failed to update goal");
  }
};


  return (
    <FinanceContext.Provider
      value={{
        transactions,
        goals,
        addTransaction,
        deleteTransaction,
        addGoal,
        updateGoalProgress,
        editGoal,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be inside FinanceProvider");
  return ctx;
};


// NEW Feature code for phase 2 can go here
// import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
// import toast from "react-hot-toast";
// import { useAuth } from "./AuthContext";
// import {
//   addTransaction as addTransactionService,
//   getTransactions,
//   createBudget as createBudgetService,
//   getBudgets,
//   getGoals as getGoalsService,
//   addGoal as addGoalService,
//   updateGoal as updateGoalService,
//   type Transaction,
//   type Budget,
//   type Goal as DBGoal,
// } from "../services/financeService";

// interface FinanceContextType {
//   transactions: Transaction[];
//   budgets: Budget[];
//   goals: DBGoal[];
//   addTransaction: (t: Omit<Transaction, "$id">) => Promise<void>;
//   addBudget: (b: Budget) => Promise<void>;
//   deleteTransaction: (id: string) => Promise<void>;
// }

// const FinanceContext = createContext<FinanceContextType | null>(null);

// export const FinanceProvider = ({ children }: { children: ReactNode }) => {
//   const { user } = useAuth();
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [budgets, setBudgets] = useState<Budget[]>([]);
//   const [goals, setGoals] = useState<DBGoal[]>([]);

//   // Load initial data
//   useEffect(() => {
//     if (!user?.$id) return;
//     (async () => {
//       try {
//         const [txs, buds, gls] = await Promise.all([
//           getTransactions(user.$id),
//           getBudgets(user.$id),
//           getGoalsService(user.$id),
//         ]);
//         setTransactions(txs);
//         setBudgets(buds);
//         setGoals(gls);
//       } catch (e) {
//         console.error("Failed to load finance data", e);
//       }
//     })();
//   }, [user]);

//   // ➕ Add Transaction
//   const addTransaction = async (t: Omit<Transaction, "$id">) => {
//     try {
//       await addTransactionService(t);
//       setTransactions((prev) => [t as Transaction, ...prev]);
//       toast.success("Transaction added successfully!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to add transaction");
//     }
//   };

//   // ➕ Add / Merge Budget
//   const addBudget = async (b: Budget) => {
//     try {
//       await createBudgetService(b);
//       setBudgets((prev) => [b, ...prev]);
//       toast.success("Budget saved successfully!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save budget");
//     }
//   };

//   // 🗑️ Delete Transaction
//   const deleteTransaction = async (id: string) => {
//     try {
//       // You can wire delete service if needed
//       setTransactions((prev) => prev.filter((tx) => tx.$id !== id));
//       toast.success("Transaction deleted");
//     } catch (err) {
//       toast.error("Failed to delete transaction");
//     }
//   };

//   return (
//     <FinanceContext.Provider
//       value={{
//         transactions,
//         budgets,
//         goals,
//         addTransaction,
//         addBudget,
//         deleteTransaction,
//       }}
//     >
//       {children}
//     </FinanceContext.Provider>
//   );
// };

// export const useFinance = () => {
//   const ctx = useContext(FinanceContext);
//   if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
//   return ctx;
// };

