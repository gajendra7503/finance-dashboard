import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: "🏠 Dashboard", path: "" },
    { label: "🎯 Goals", path: "goals" },
    { label: "💳 Transactions", path: "transactions" },
    { label: "👤 Profile", path: "profile" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white p-5 shadow-lg flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-8 text-blue-600">FinancePro</h2>
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
             <Link
  key={item.path}
  to={item.path} // relative path
  className={`p-2 rounded-lg ${
    pathname.endsWith(item.path) || (item.path === "" && pathname.endsWith("dashboard"))
      ? "bg-blue-100 text-blue-700 font-semibold"
      : "hover:bg-gray-100"
  }`}
>
  {item.label}
</Link>
            ))}
          </nav>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-500 mb-2">
            {user?.username ?? "User"}
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white w-full py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
