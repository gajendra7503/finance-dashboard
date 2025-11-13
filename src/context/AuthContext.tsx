// import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   login as loginService,
//   signup as signupService,
//   logout as logoutService,
//   getCurrentUser,
//   type Profile,
// } from "../services/authService";
// import toast from "react-hot-toast";

// interface AuthContextType {
//   user: Profile | null;
//   isAuthenticated: boolean;
//   loading: boolean;
//   login: (email: string, password: string) => Promise<void>;
//   signup: (
//     username: string,
//     email: string,
//     password: string,
//     firstName?: string,
//     lastName?: string
//   ) => Promise<void>;
//   logout: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// const SESSION_TIMEOUT = 2 * 60 * 1000; // 15 minutes of inactivity
// const WARNING_TIME = 60 * 1000; // Warn user 1 minute before auto logout

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [user, setUser] = useState<Profile | null>(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
  
//   // ✅ Load user session on first mount
//   useEffect(() => {
//     (async () => {
//       const profile = await getCurrentUser();
//       if (profile) setUser(profile);
//       setLoading(false);
//     })();
//   }, []);

//   // ✅ Use the actual profile document returned by authService.login
//   const login = async (email: string, password: string) => {
//     const profile = await loginService(email, password);
//     setUser(profile);
//   };

//   // ✅ Same for signup: use backend response
//   const signup = async (
//     username: string,
//     email: string,
//     password: string,
//     firstName?: string,
//     lastName?: string
//   ) => {
//     const profile = await signupService(username, email, password, firstName, lastName);
//     setUser(profile);
//   };

//   const logout = async () => {
//     await logoutService();
//     setUser(null);
//   };

//    // 🕒 Auto logout logic with countdown toast
//   useEffect(() => {
//     if (!user) return;

//    let warningTimer: ReturnType<typeof setTimeout>;
//    let logoutTimer: ReturnType<typeof setTimeout>;
//    let countdownTimer: ReturnType<typeof setInterval>;

//    let countdownToastId: string | null = null;
//    let remainingSeconds = WARNING_TIME / 1000;

//     const resetTimers = () => {
//       clearTimeout(warningTimer);
//       clearTimeout(logoutTimer);
//       clearInterval(countdownTimer);

//       warningTimer = setTimeout(() => {
//         remainingSeconds = WARNING_TIME / 1000;

//         // countdownToastId = toast.custom(() => (
//         //   <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow">
//         //     Logging out in <strong>{remainingSeconds}</strong> seconds due to inactivity.
//         //   </div>
//         // ));

//         countdownTimer = setInterval(() => {
//           remainingSeconds -= 1;
//           if (remainingSeconds <= 0) clearInterval(countdownTimer);
//           toast.dismiss(countdownToastId!);
//           countdownToastId = toast.custom(() => (
//             <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow">
//               Logging out in <strong>{remainingSeconds}</strong> seconds due to inactivity.
//             </div>
//           ));
//         }, 1000);
//       }, SESSION_TIMEOUT - WARNING_TIME);

//       logoutTimer = setTimeout(async () => {
//         clearInterval(countdownTimer);
//         toast.dismiss(countdownToastId!);
//         await logoutService();
//         setUser(null);
//         toast.error("Session expired. Please log in again.");
//         navigate("/login");
//       }, SESSION_TIMEOUT);
//     };

//     resetTimers();

//     const activityHandler = () => resetTimers();
//     window.addEventListener("mousemove", activityHandler);
//     window.addEventListener("keydown", activityHandler);

//     return () => {
//       clearTimeout(warningTimer);
//       clearTimeout(logoutTimer);
//       clearInterval(countdownTimer);
//       window.removeEventListener("mousemove", activityHandler);
//       window.removeEventListener("keydown", activityHandler);
//     };
//   }, [user]);


//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center text-gray-600">
//         Checking authentication...
//       </div>
//     );

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         isAuthenticated: !!user,
//         login,
//         signup,
//         logout,
//         loading,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error("useAuth must be used within AuthProvider");
//   return context;
// };

// AuthContext.tsx
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  login as loginService,
  signup as signupService,
  logout as logoutService,
  getCurrentUser,
  type Profile,
} from "../services/authService";

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Configurable durations (ms)
const SESSION_TIMEOUT = 2 * 60 * 1000; // 5 minutes total session
const WARNING_TIME = 60 * 1000; // 1 minute before logout show warning

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs for timers & toast id so we can clear/update them from any callback
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastIdRef = useRef<string | null>(null);

  // Helper to clear all timers and toast
  const clearAll = () => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  // render content for the countdown toast
  const renderWarningToast = (secondsLeft: number, onStay: () => void, onLogoutNow: () => void) => {
    return (
      <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-md shadow-sm text-gray-800">
        <div className="font-semibold mb-1">You're about to be logged out due to inactivity</div>
        <div className="text-sm mb-2">Auto logout in <strong>{secondsLeft}</strong> seconds</div>
        <div className="flex gap-2">
          <button
            onClick={onStay}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogoutNow}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout Now
          </button>
        </div>
      </div>
    );
  };

  // Reset and (re)start session timers — call on user activity / signin
  const resetSessionTimer = () => {
    clearAll();

    // schedule warning
    warningTimerRef.current = setTimeout(() => {
      let secondsLeft = Math.floor(WARNING_TIME / 1000);

      // show initial toast and save its id
      toastIdRef.current = toast.custom(renderWarningToast(secondsLeft, () => {
        // stay logged in
        toast.dismiss(toastIdRef.current ?? undefined);
        resetSessionTimer();
      }, async () => {
        // logout now
        toast.dismiss(toastIdRef.current ?? undefined);
        await handleLogout(true);
      }), { duration: Infinity });

      // start countdown that updates the same toast
      countdownRef.current = setInterval(() => {
        secondsLeft -= 1;
        if (!toastIdRef.current) return;

        // dismiss old toast and show new one with updated secondsLeft
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = toast.custom(renderWarningToast(secondsLeft, () => {
          toast.dismiss(toastIdRef.current ?? undefined);
          resetSessionTimer();
        }, async () => {
          toast.dismiss(toastIdRef.current ?? undefined);
          await handleLogout(true);
        }), { duration: Infinity });

        if (secondsLeft <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        }
      }, 1000);
    }, Math.max(0, SESSION_TIMEOUT - WARNING_TIME));

    // schedule final logout
    logoutTimerRef.current = setTimeout(async () => {
      await handleLogout(true);
      toast.error("You have been logged out due to inactivity.");
    }, SESSION_TIMEOUT);
  };

  // Logout helper (silent=true avoids success toast)
  const handleLogout = async (silent = false) => {
    try {
      await logoutService();
    } catch (err) {
      console.error("Logout service error:", err);
    } finally {
      clearAll();
      setUser(null);
      if (!silent) toast.success("Logged out successfully");
    }
  };

  // Auth actions
  const login = async (email: string, password: string) => {
    const profile = await loginService(email, password);
    setUser(profile);
    resetSessionTimer();
  };

  const signup = async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const profile = await signupService(username, email, password, firstName, lastName);
    setUser(profile);
    resetSessionTimer();
  };

  // Initialize session on mount and hook activity events
  useEffect(() => {
    (async () => {
      try {
        const profile = await getCurrentUser();
        if (profile) {
          setUser(profile);
          resetSessionTimer();
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
      } finally {
        setLoading(false);
      }
    })();

    const onActivity = () => {
      // Only reset timers if user is logged in
      if (user) resetSessionTimer();
    };

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id]); // restart effect when user changes

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Checking authentication...
      </div>
    );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout: () => handleLogout(),
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
