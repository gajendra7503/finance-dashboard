import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, uploadAvatar, getAvatarUrl } from "../../services/profileService";
import type { Profile } from "../../types";

export default function Profile() {
  const queryClient = useQueryClient();

  // Fetch profile
 const { data: profile, isLoading } = useQuery<Profile>({
  queryKey: ["profile"],
  queryFn: getProfile,
});

  // Form state
  const [formData, setFormData] = useState<Partial<Profile>>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    avatarUrl: "",
  });

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Populate form once profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData(profile);
      if (profile.avatarUrl) setAvatarPreview(getAvatarUrl(profile.avatarUrl));
    }
  }, [profile]);

  // Update profile mutation
 const mutation = useMutation<Profile, Error, Partial<Profile>>({
  mutationFn: updateProfile,
  onSuccess: (data) => {
    queryClient.setQueryData(["profile"], data);
    alert("Profile updated successfully!");
  },
  onError: (err) => {
    console.error(err);
    alert("Failed to update profile.");
  },
});


  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let avatarUrl = formData.avatarUrl;

    // Upload new avatar if selected
    if (avatarFile) {
      try {
        avatarUrl = await uploadAvatar(avatarFile);
      } catch (err) {
        console.error(err);
        alert("Failed to upload avatar.");
        return;
      }
    }

    const { email, ...updatableData } = formData;
    mutation.mutate({ ...updatableData, avatarUrl });
  };

  // if (isLoading || !profile) return <p>Loading profile...</p>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Preview */}
        <div className="flex flex-col items-center mb-4">
          {avatarPreview && (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="w-24 h-24 rounded-full mb-2 object-cover"
            />
          )}
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </div>

        {/* Username */}
        <div>
          <label className="block font-medium mb-1">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username ?? ""}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        {/* Email (cannot edit) */}
        <div>
          <label className="block font-medium mb-1">Email (cannot edit)</label>
          <input
            type="email"
            name="email"
            value={formData.email ?? ""}
            className="w-full border p-2 rounded bg-gray-100"
            disabled
          />
        </div>

        {/* First Name */}
        <div>
          <label className="block font-medium mb-1">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName ?? ""}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block font-medium mb-1">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName ?? ""}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Birth Date */}
        <div>
          <label className="block font-medium mb-1">Birth Date</label>
          <input
            type="date"
            name="birthDate"
            value={formData.birthDate ?? ""}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
