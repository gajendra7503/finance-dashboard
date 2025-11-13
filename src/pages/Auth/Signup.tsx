import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff } from "lucide-react"; // 👈 import icons

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signup(
        formData.username,
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="min-h-screen flex items-center justify-center bg-white-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-bold text-gray-700 text-center">Sign Up</h2>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Username */}
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
          className="border p-2 rounded-md w-full"
        />

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="border p-2 rounded-md w-full"
        />

        {/* Password with show/hide icon */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="border p-2 rounded-md w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* First Name */}
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="border p-2 rounded-md w-full"
        />

        {/* Last Name */}
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="border p-2 rounded-md w-full"
        />

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded-lg w-full hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {/* Login link */}
        <p className="text-center text-sm text-gray-600 mt-3">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-blue-600 font-medium hover:underline"
          >
            Login here
          </button>
        </p>
      </form>
    </div>
  );
}

