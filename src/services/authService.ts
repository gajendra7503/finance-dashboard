// import { account, databases, DB_ID, COLLECTION_PROFILES, ID } from "./appwriteConfig";
// import { Query } from 'appwrite';
// import { Permission, Role } from "appwrite";
// // import { v4 as uuidv4 } from "uuid";

// export interface Profile {
//   username: string;
//   email: string;
//   firstName?: string;
//   lastName?: string;
//   createdDate: string;
//   birthDate?: string;
//   avatarUrl?: string;
//   $id?: string;
//   id?: string;
// }

// // ---------------- SIGNUP ----------------
// export const signup = async (
//   username: string,
//   email: string,
//   password: string,
//   firstName?: string,
//   lastName?: string
// ) => {
//   try {

//     //  const userId = uuidv4().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 36);
//      await account.create(ID.unique(), email, password, username);
//      await account.createEmailPasswordSession(email, password);

//     const currentUser = await account.get();
//     console.log(currentUser);


//     // 3️⃣ Create profile document in Profiles collection
//   const profile = {
//       username,
//       email,
//       firstName,
//       lastName,
//       createdDate: new Date().toISOString(),
//     };

//     // ✅ Grant read/write to the current user explicitly
// await databases.createDocument(
//   DB_ID,
//   COLLECTION_PROFILES,
//   ID.unique(),
//   profile,
//   [
//     Permission.read(Role.user(currentUser.$id)),
//     Permission.write(Role.user(currentUser.$id)),
//   ]
// );

//   // await databases.createDocument(
//   //     DB_ID,
//   //     COLLECTION_PROFILES,
//   //     ID.unique(), // ✅ fixed
//   //     profile,
//   //     [`user:${user.$id}`]
//   //   );
    
//     return profile;
//   } catch (error) {
//     console.error("Signup failed:", error);
//     throw error;
//   }
// };

// // ---------------- LOGIN ----------------
// export const login = async (email: string, password: string) => {
//   try {
//     // Create a new session
//    await account.createEmailPasswordSession(email, password);


//     // Get the logged-in user
//     const user = await account.get();

//     // ✅ Fetch profile document using the user.$id (document ID)
//     const res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
//       Query.equal("$id", user.$id)
//     ]);

//     if (res.documents.length === 0) {
//       throw new Error("Profile not found for this user.");
//     }

//     return res.documents[0] as unknown as Profile;
//   } catch (error: any) {
//     console.error("Login failed:", error);

//     if (error?.code === 404) {
//       throw new Error("Profile not found for this user.");
//     }

//     throw error;
//   }
// };

// // ---------------- LOGOUT ----------------
// export const logout = async () => {
//   try {
//     await account.deleteSession("current");
//   } catch (error) {
//     console.error("Logout failed:", error);
//   }
// };

// // ---------------- GET CURRENT USER ----------------
// export const getCurrentUser = async (): Promise<Profile | null> => {
//   try {
//     const user = await account.get();

//     // ✅ Query the profiles collection by the profileId field
//     const res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
//       Query.equal("$id", user.$id)
//     ]);

//     if (res.documents.length === 0) return null;

//     return res.documents[0] as unknown as Profile;
//   } catch (err: any) {
//     if (err?.code === 404 || err?.code === 401) return null;
//     console.error("Error fetching current user:", err);
//     return null;
//   }
// };


// // // ---------------- LOGIN ----------------
// // export const login = async (email: string, password: string) => {
// //   try {
// //     await account.createSession(email, password);

// //     const user = await account.get();

// //     // ✅ Correct query filter
// //     const res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
// //       `equal("profileId", "${user.$id}")`,
// //     ]);

// //     if (res.documents.length === 0) throw new Error("Profile not found");

// //     return res.documents[0];
// //   } catch (error) {
// //     console.error("Login failed:", error);
// //     throw error;
// //   }
// // };

// // // ---------------- LOGOUT ----------------
// // export const logout = async () => {
// //   try {
// //     await account.deleteSession("current");
// //   } catch (error) {
// //     console.error("Logout failed:", error);
// //   }
// // };

// // // ---------------- GET CURRENT USER ----------------
// // export const getCurrentUser = async (): Promise<Profile | null> => {
// //   try {
// //     const user = await account.get();
// //     const res = await databases.getDocument(DB_ID, COLLECTION_PROFILES,user.$id);

// //     return res as unknown as Profile;
// //   } catch (err: any) {
// //      if (err?.code === 404 || err?.code === 401) return null;
// //     console.error("Error fetching current user:", err);
// //     return null;
// //   }
// // };

import { account, databases, DB_ID, COLLECTION_PROFILES, ID } from "./appwriteConfig";
import { Query, Permission, Role } from "appwrite";

export interface Profile {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdDate: string;
  birthDate?: string;
  avatarUrl?: string;
  $id?: string;
  id?: string;
}

// ---------------- SIGNUP ----------------
export const signup = async (
  username: string,
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
) => {
  try {
    // Create user account
     await account.create(ID.unique(), email, password, username);

    // Log them in
    await account.createEmailPasswordSession(email, password);

    // Get current user
    const currentUser = await account.get();

    // Create profile document using user.$id
    const profileData = {
       userId: currentUser.$id,
      username,
      email,
      firstName: firstName || "",
      lastName: lastName || "",
      createdDate: new Date().toISOString(),
      birthDate: "",
      avatarUrl: "",
    };

    await databases.createDocument(
      DB_ID,
      COLLECTION_PROFILES,
      currentUser.$id,
      profileData,
      [
        Permission.read(Role.user(currentUser.$id)),
        Permission.write(Role.user(currentUser.$id)),
      ]
    );

    return { ...profileData, $id: currentUser.$id };
  } catch (error) {
    console.error("Signup failed:", error);
    throw error;
  }
};

// ---------------- LOGIN ----------------
export const login = async (email: string, password: string) => {
  try {
    await account.createEmailPasswordSession(email, password);

    const user = await account.get();

    // Try by user ID first
    let res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
      Query.equal("$id", user.$id),
    ]);

    // If not found, try fallback by email (for old signups)
    if (res.documents.length === 0) {
      res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
        Query.equal("email", user.email),
      ]);
    }

 // If still not found, create a new profile (failsafe)
    if (res.documents.length === 0) {
      const profileData = {
        username: user.name || user.email.split("@")[0],
        email: user.email,
        firstName: "",
        lastName: "",
        createdDate: new Date().toISOString(),
        birthDate: "",
        avatarUrl: "",
      };

      const newProfile = await databases.createDocument(
        DB_ID,
        COLLECTION_PROFILES,
        user.$id,
        profileData,
        [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );

      return newProfile as unknown as Profile;
    }

    return res.documents[0] as unknown as Profile;
  } catch (error: any) {
    console.error("Login failed:", error);
    throw error;
  }
};

// ---------------- LOGOUT ----------------
export const logout = async () => {
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

// ---------------- GET CURRENT USER ----------------
export const getCurrentUser = async (): Promise<Profile | null> => {
  try {
    const user = await account.get();

    let res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
      Query.equal("$id", user.$id),
    ]);

    if (res.documents.length === 0) {
      res = await databases.listDocuments(DB_ID, COLLECTION_PROFILES, [
        Query.equal("email", user.email),
      ]);
    }

    if (res.documents.length === 0) return null;

    return res.documents[0] as unknown as Profile;
  } catch (err: any) {
    if (err?.code === 404 || err?.code === 401) return null;
    console.error("Error fetching current user:", err);
    return null;
  }
};
