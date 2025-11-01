import type { Key } from "react";
import { databases, DB_ID, COLLECTION_TRANSACTIONS, COLLECTION_GOALS } from "./appwriteConfig";
import { Query, ID } from "appwrite";
import { v4 as uuidv4 } from "uuid";

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
  description?: string; // ✅ added
  completed?: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

// ---------------- ADD TRANSACTION ----------------
export const addTransaction = async (transaction: Omit<Transaction, "$id">) => {
  try {
    const docId = uuidv4();
    const res = await databases.createDocument(DB_ID, COLLECTION_TRANSACTIONS, docId, transaction);
    return res;
  } catch (error) {
    console.error("Add transaction failed:", error);
    throw error;
  }
};

// ---------------- GET TRANSACTIONS ----------------
// export const getTransactions = async (userId: string) => {
//   try {
//     const res = await databases.listDocuments(DB_ID, COLLECTION_TRANSACTIONS, [
//       Query.equal("userId", userId),
//     ]);
//     return res.documents.map((doc: any) => ({
//       $id: doc.$id,
//       userId: doc.userId,
//       type: doc.type,
//       amount: doc.amount,
//       category: doc.category,
//       date: doc.date,
//       note: doc.note,
//     })) as Transaction[];
//   } catch (error) {
//     console.error("Fetch transactions failed:", error);
//     throw error;
//   }
// };
// ---------------- GET TRANSACTIONS (with search, filter, pagination) ----------------
export const getTransactions = async (
  userId: string,
  {
    search = "",       // This will be used for type filter (income/expense)
    category = "",     // Category filter
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

    // Filter by type (income or expense) using exact match
    if (search) filters.push(Query.equal("type", search));

    // Filter by category if selected
    if (category) filters.push(Query.equal("category", category));

    // Filter by date range if both start and end are provided
    if (startDate && endDate) {
      filters.push(Query.between("date", startDate, endDate));
    }

    // Pagination
    filters.push(Query.limit(limit));
    filters.push(Query.offset((page - 1) * limit));

    const res = await databases.listDocuments(
      DB_ID,
      COLLECTION_TRANSACTIONS,
      filters
    );

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

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  return await databases.updateDocument(DB_ID, COLLECTION_TRANSACTIONS, id, data);
};


// ---------------- DELETE TRANSACTION ----------------
export const deleteTransaction = async (transactionId: string) => {
  try {
    await databases.deleteDocument(DB_ID, COLLECTION_TRANSACTIONS, transactionId);
  } catch (error) {
    console.error("Delete transaction failed:", error);
    throw error;
  }
};

// ---------------- ADD GOAL ----------------
export const addGoal = async (goal: Omit<Goal, "$id" | "savedAmount">) => {
  try {
    const doc = await databases.createDocument(DB_ID, COLLECTION_GOALS, ID.unique(), {
      userId: goal.userId,
      title: goal.title,
      targetAmount: goal.targetAmount,
      savedAmount: 0,
      deadline: goal.deadline,
      description: goal.description ?? "", // ✅ added
      completed: goal.completed ?? false, // ✅ added
    });
    return doc;
  } catch (error) {
    console.error("Add goal failed:", error);
    throw error;
  }
};


// ---------------- GET GOALS ----------------
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
      description: doc.description ?? "", // ✅ added
      completed: doc.completed ?? false, // ✅ added
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
    }));
  } catch (error) {
    console.error("Fetch goals failed:", error);
    throw error;
  }
};

// ---------------- UPDATE GOAL ----------------
export const updateGoal = async (goalId: string, data: Partial<Goal>) => {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTION_GOALS, goalId, data);
    return res;
  } catch (error) {
    console.error("Update goal failed:", error);
    throw error;
  }
};


// ---------------- DELETE GOAL ----------------
export const deleteGoal = async (goalId: string) => {
  try {
    await databases.deleteDocument(DB_ID, COLLECTION_GOALS, goalId);
  } catch (error) {
    console.error("Delete goal failed:", error);
    throw error;
  }
};