import { Client, Databases, Storage, Account,ID  } from "appwrite";

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT!)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client); // <-- add this


export const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
export const COLLECTION_PROFILES = import.meta.env.VITE_APPWRITE_COLLECTION_ID_PROFILES!;
export const COLLECTION_TRANSACTIONS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_TRANSACTIONS!;
export const COLLECTION_GOALS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_GOALS!;
export const COLLECTION_BUDGETS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_BUDGETS!;
export const BUCKET_AVATARS = import.meta.env.VITE_APPWRITE_BUCKET_AVATARS!;

export { ID };