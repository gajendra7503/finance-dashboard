// src/types/index.ts
import type { Models } from "appwrite";

export interface Profile extends Models.Document {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  avatarUrl?: string;
  createdDate?: string;
}
