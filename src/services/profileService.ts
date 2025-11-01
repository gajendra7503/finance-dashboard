// src/services/profileService.ts
import { account, databases, storage, DB_ID, COLLECTION_PROFILES,BUCKET_AVATARS } from "./appwriteConfig";
import { ID, Query } from "appwrite";
import type { Profile } from "../types";

// ----------------- Get Current User Profile -----------------
export async function getProfile(): Promise<Profile> {
  try {
    const session = await account.get();
    const userId = session.$id;

    const res = await databases.listDocuments<Profile>(
      DB_ID,
      COLLECTION_PROFILES,
      [Query.equal("$id", userId), Query.limit(1)]
    );

    if (res.documents.length === 0) throw new Error("Profile not found");

    return res.documents[0];
  } catch (err) {
    console.error("Error fetching profile:", err);
    throw err;
  }
}

// ----------------- Update Profile (Email Immutable) -----------------
export async function updateProfile(data: Partial<Profile>): Promise<Profile> {
  try {
    const profile = await getProfile();
    const docId = profile.$id;

    const updatedDoc = await databases.updateDocument<Profile>(
      DB_ID,
      COLLECTION_PROFILES,
      docId,
      {
        ...data,
        email: profile.email, // email cannot be changed
      }
    );

    return updatedDoc;
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
}

// ----------------- Upload Avatar -----------------
export async function uploadAvatar(file: File): Promise<string> {
  try {
    const fileId = ID.unique();

    const uploadedFile = await storage.createFile(
      BUCKET_AVATARS, // bucket ID
      fileId,
      file
    );

    return uploadedFile.$id;
  } catch (err) {
    console.error("Error uploading avatar:", err);
    throw err;
  }
}

// ----------------- Get Avatar View URL (works on free plan) -----------------
export function getAvatarUrl(fileId: string): string {
  return `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_AVATARS}/files/${fileId}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
}

