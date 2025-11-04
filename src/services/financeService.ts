import type { Key } from "react";
import { databases, DB_ID, COLLECTION_TRANSACTIONS, COLLECTION_GOALS, COLLECTION_BUDGETS } from "./appwriteConfig";
import { Query, ID } from "appwrite";
import { v4 as uuidv4 } from "uuid";

/* ------------------------- INTERFACES ------------------------- */

export interface Transaction {
  id: Key | null | undefined;
  $id: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface Goal {
  $id?: string;
  userId: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  description?: string;
  completed?: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface Budget {
  $id?: string;
  userId: string;
  category: string;
  month: string; // format: "YYYY-MM"
  budgetAmount: number;
  spentAmount?: number; // actual spending
  notes?: string;
  alertThreshold: number; // e.g., 80 means 80%
  createdAt?: string;
  updatedAt?: string;
}

/* ------------------------- TRANSACTIONS ------------------------- */

// ✅ Add Transaction
export const addTransaction = async (transaction: Omit<Transaction, "$id">) => {
  try {
    const docId = uuidv4();
    const newTx = await databases.createDocument(DB_ID, COLLECTION_TRANSACTIONS, docId, transaction);

    // Sync budget: add spentAmount to matching budget for the transaction's month/category
    const month = transaction.date.slice(0, 7);
    const budgetList = await databases.listDocuments(DB_ID, COLLECTION_BUDGETS, [
      Query.equal("userId", transaction.userId),
      Query.equal("category", transaction.category),
      Query.equal("month", month),
    ]);

    if (budgetList.documents.length > 0) {
      const budget = budgetList.documents[0];
      const updatedSpent = (budget.spentAmount || 0) + (transaction.type === "expense" ? transaction.amount : 0);

      await databases.updateDocument(DB_ID, COLLECTION_BUDGETS, budget.$id, {
        spentAmount: updatedSpent,
      });
    } else {
      // Create a new budget record when none exists yet for this category/month
      await databases.createDocument(DB_ID, COLLECTION_BUDGETS, ID.unique(), {
        userId: transaction.userId,
        category: transaction.category,
        month,
        budgetAmount: 0,
        spentAmount: transaction.type === "expense" ? transaction.amount : 0,
        notes: "Auto-created from transaction",
        alertThreshold: 80,
      });
    }

    return newTx;
  } catch (error) {
    console.error("Add transaction failed:", error);
    throw error;
  }
};

// ✅ Get Transactions (supports search, filter, pagination)
export const getTransactions = async (
  userId: string,
  {
    search = "",
    category = "",
    startDate = "",
    endDate = "",
    page = 1,
    limit = 10,
  }: {
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ transactions: Transaction[]; total: number }> => {
  try {
    const filters: any[] = [Query.equal("userId", userId)];

    if (search) filters.push(Query.equal("type", search));
    if (category) filters.push(Query.equal("category", category));
    if (startDate && endDate) filters.push(Query.between("date", startDate, endDate));

    filters.push(Query.limit(limit));
    filters.push(Query.offset((page - 1) * limit));

    const res = await databases.listDocuments(DB_ID, COLLECTION_TRANSACTIONS, filters);

    return {
      transactions: res.documents.map((doc: any) => ({
        $id: doc.$id,
        userId: doc.userId,
        type: doc.type,
        amount: doc.amount,
        category: doc.category,
        date: doc.date,
        note: doc.note,
      })) as Transaction[],
      total: res.total ?? res.documents.length,
    };
  } catch (error) {
    console.error("Fetch transactions failed:", error);
    throw error;
  }
};

// ✅ Update Transaction
export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  try {
    // Fetch existing transaction to compute deltas
    const oldTx = await databases.getDocument(DB_ID, COLLECTION_TRANSACTIONS, id);
    const updatedTx = await databases.updateDocument(DB_ID, COLLECTION_TRANSACTIONS, id, data);

    // Determine old and new month/category/type/amount
    const oldMonth = (oldTx.date || "").slice(0, 7);
    const newMonth = (data.date ?? oldTx.date).slice(0, 7);
    const oldCategory = data.category ? oldTx.category : oldTx.category;
    const newCategory = data.category ?? oldTx.category;
    const oldType = oldTx.type;
    const newType = data.type ?? oldTx.type;
    const oldAmount = oldTx.amount || 0;
    const newAmount = data.amount ?? oldAmount;

    // If the transaction was an expense before, subtract from its old budget
    if (oldType === "expense") {
      const budgetsOld = await databases.listDocuments(DB_ID, COLLECTION_BUDGETS, [
        Query.equal("userId", oldTx.userId),
        Query.equal("category", oldCategory),
        Query.equal("month", oldMonth),
      ]);

      if (budgetsOld.documents.length > 0) {
        const b = budgetsOld.documents[0];
        const updated = Math.max((b.spentAmount || 0) - oldAmount, 0);
        await databases.updateDocument(DB_ID, COLLECTION_BUDGETS, b.$id, { spentAmount: updated });
      }
    }

    // If the transaction is an expense now, add to the new budget (may be same or different)
    if (newType === "expense") {
      const budgetsNew = await databases.listDocuments(DB_ID, COLLECTION_BUDGETS, [
        Query.equal("userId", oldTx.userId),
        Query.equal("category", newCategory),
        Query.equal("month", newMonth),
      ]);

      if (budgetsNew.documents.length > 0) {
        const b = budgetsNew.documents[0];
        const updated = (b.spentAmount || 0) + newAmount;
        await databases.updateDocument(DB_ID, COLLECTION_BUDGETS, b.$id, { spentAmount: updated });
      } else {
        // create new budget if none exists
        await databases.createDocument(DB_ID, COLLECTION_BUDGETS, ID.unique(), {
          userId: oldTx.userId,
          category: newCategory,
          month: newMonth,
          budgetAmount: 0,
          spentAmount: newAmount,
          notes: "Auto-created from transaction",
          alertThreshold: 80,
        });
      }
    }

    return updatedTx;
  } catch (error) {
    console.error("Update transaction failed:", error);
    throw error;
  }
};

// ✅ Delete Transaction
export const deleteTransaction = async (transactionId: string) => {
  try {
    const tx = await databases.getDocument(DB_ID, COLLECTION_TRANSACTIONS, transactionId);
    const month = tx.date.slice(0, 7);

    await databases.deleteDocument(DB_ID, COLLECTION_TRANSACTIONS, transactionId);

    // If it was an expense, decrement the related budget's spentAmount
    if (tx.type === "expense") {
      const budgets = await databases.listDocuments(DB_ID, COLLECTION_BUDGETS, [
        Query.equal("userId", tx.userId),
        Query.equal("category", tx.category),
        Query.equal("month", month),
      ]);

      if (budgets.documents.length > 0) {
        const budget = budgets.documents[0];
        const updated = Math.max((budget.spentAmount || 0) - tx.amount, 0);
        await databases.updateDocument(DB_ID, COLLECTION_BUDGETS, budget.$id, { spentAmount: updated });
      }
    }

    return true;
  } catch (error) {
    console.error("Delete transaction failed:", error);
    throw error;
  }
};

/* ------------------------- GOALS ------------------------- */

// ✅ Add Goal
export const addGoal = async (goal: Omit<Goal, "$id" | "savedAmount">) => {
  try {
    return await databases.createDocument(DB_ID, COLLECTION_GOALS, ID.unique(), {
      userId: goal.userId,
      title: goal.title,
      targetAmount: goal.targetAmount,
      savedAmount: 0,
      deadline: goal.deadline,
      description: goal.description ?? "",
      completed: goal.completed ?? false,
    });
  } catch (error) {
    console.error("Add goal failed:", error);
    throw error;
  }
};

// ✅ Get Goals
export const getGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTION_GOALS, [
      Query.equal("userId", userId),
    ]);

    return res.documents.map((doc: any) => ({
      $id: doc.$id,
      userId: doc.userId,
      title: doc.title,
      targetAmount: doc.targetAmount,
      savedAmount: doc.savedAmount ?? 0,
      deadline: doc.deadline,
      description: doc.description ?? "",
      completed: doc.completed ?? false,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
    }));
  } catch (error) {
    console.error("Fetch goals failed:", error);
    throw error;
  }
};

// ✅ Update Goal
export const updateGoal = async (goalId: string, data: Partial<Goal>) => {
  try {
    return await databases.updateDocument(DB_ID, COLLECTION_GOALS, goalId, data);
  } catch (error) {
    console.error("Update goal failed:", error);
    throw error;
  }
};

// ✅ Delete Goal
export const deleteGoal = async (goalId: string) => {
  try {
    await databases.deleteDocument(DB_ID, COLLECTION_GOALS, goalId);
  } catch (error) {
    console.error("Delete goal failed:", error);
    throw error;
  }
};

/* ------------------------- BUDGETS ------------------------- */

// ✅ Create Budget
export async function createBudget(budget: Budget) {
  try {
    // If a budget exists for this user/category/month, merge amounts
    const existing = await databases.listDocuments(DB_ID, COLLECTION_BUDGETS, [
      Query.equal("userId", budget.userId),
      Query.equal("category", budget.category),
      Query.equal("month", budget.month),
    ]);

    if (existing.documents.length > 0) {
      const doc = existing.documents[0];
      const updatedBudgetAmount = (doc.budgetAmount || 0) + (budget.budgetAmount || 0);
      const updatedSpentAmount = (doc.spentAmount || 0) + (budget.spentAmount || 0);

      await databases.updateDocument(DB_ID, COLLECTION_BUDGETS, doc.$id, {
        budgetAmount: updatedBudgetAmount,
        spentAmount: updatedSpentAmount,
        notes: budget.notes ?? doc.notes ?? "",
        alertThreshold: budget.alertThreshold ?? doc.alertThreshold ?? 80,
      });

      // If incoming budget included spentAmount, create a transaction for that expense
      if (budget.spentAmount && budget.spentAmount > 0) {
        await databases.createDocument(DB_ID, COLLECTION_TRANSACTIONS, ID.unique(), {
          userId: budget.userId,
          type: "expense",
          amount: budget.spentAmount,
          category: budget.category,
          date: `${budget.month}-01`,
          note: budget.notes || "Auto-created from budget",
        });
      }

      return doc.$id;
    }

    const newBudget = await databases.createDocument(DB_ID, COLLECTION_BUDGETS, ID.unique(), {
      userId: budget.userId,
      category: budget.category,
      month: budget.month,
      budgetAmount: budget.budgetAmount,
      spentAmount: budget.spentAmount || 0,
      notes: budget.notes || "",
      alertThreshold: budget.alertThreshold || 80,
    });

    if (budget.spentAmount && budget.spentAmount > 0) {
      await databases.createDocument(DB_ID, COLLECTION_TRANSACTIONS, ID.unique(), {
        userId: budget.userId,
        type: "expense",
        amount: budget.spentAmount,
        category: budget.category,
        date: `${budget.month}-01`,
        note: budget.notes || "Auto-created from budget",
      });
    }

    return newBudget;
  } catch (error) {
    console.error("Error creating budget:", error);
    throw new Error("Failed to create budget");
  }
}

// ✅ Get Budgets for User
export async function getBudgets(userId: string, month?: string) {
  try {
    const queries = [Query.equal("userId", userId)];
    if (month) queries.push(Query.equal("month", month));

    const res = await databases.listDocuments(DB_ID, COLLECTION_BUDGETS, queries);
    return res.documents.map((doc: any) => ({
      $id: doc.$id,
      userId: doc.userId,
      category: doc.category,
      month: doc.month,
      budgetAmount: doc.budgetAmount,
      spentAmount: doc.spentAmount || 0,
      notes: doc.notes || "",
      alertThreshold: doc.alertThreshold || 80,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    })) as Budget[];
  } catch (error) {
    console.error("Error fetching budgets:", error);
    throw new Error("Failed to fetch budgets");
  }
}

// ✅ Update Budget
export async function updateBudget(id: string, updates: Partial<Budget>) {
  try {
    return await databases.updateDocument(DB_ID, COLLECTION_BUDGETS, id, updates);
  } catch (error) {
    console.error("Error updating budget:", error);
    throw new Error("Failed to update budget");
  }
}

// ✅ Delete Budget
export async function deleteBudget(id: string) {
  try {
    await databases.deleteDocument(DB_ID, COLLECTION_BUDGETS, id);
    return true;
  } catch (error) {
    console.error("Error deleting budget:", error);
    throw new Error("Failed to delete budget");
  }
}

// ✅ Calculate Monthly Spend by Category
// ✅ Calculate Monthly Spend by Category
export async function getMonthlySpend(userId: string, month: string) {
  try {
    // Convert month string "YYYY-MM" to start/end dates
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // assuming max 31 days

    const res = await databases.listDocuments(DB_ID, COLLECTION_TRANSACTIONS, [
      Query.equal("userId", userId),
      Query.equal("type", "expense"),            // only expenses
      Query.between("date", startDate, endDate)  // filter by month
    ]);

    const spendByCategory: Record<string, number> = {};

    res.documents.forEach((tx: any) => {
      spendByCategory[tx.category] = (spendByCategory[tx.category] || 0) + tx.amount;
    });

    return spendByCategory;
  } catch (error) {
    console.error("Error calculating monthly spend:", error);
    throw new Error("Failed to calculate monthly spend");
  }
}

