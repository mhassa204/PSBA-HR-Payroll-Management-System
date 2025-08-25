import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "../../lib/axios";

// ensure session cookie included
axios.defaults.withCredentials = true;

// Debug: log configured API URL and axios baseURL
try {
  console.log("DEBUG: VITE_API_URL=", import.meta.env.VITE_API_URL);
  console.log("DEBUG: axios baseURL=", axios.defaults.baseURL);
} catch (e) {
  console.warn("DEBUG: could not read env or axios defaults", e.message);
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: undefined,
      isChecking: true,

      setUser: (user) => set({ user }),

      // permission checker
      can: (perm) => {
        const u = get().user;
        if (!u) return false;
        if (u.role?.name === "Super Admin") return true;
        const list = u.permissions || [];
        if (list.includes("*")) return true;
        return list.includes(perm);
      },

      fetchSession: async () => {
        set({ isChecking: true });
        try {
          const res = await axios.get("/me", { withCredentials: true });
          set({ user: res.data.user, isChecking: false });
        } catch (err) {
          // Only clear user on 401 (unauthenticated). For network/server errors, don't force logout.
          const status = err?.response?.status;
          if (status === 401) {
            set({ user: null, isChecking: false });
          } else {
            set({ isChecking: false });
          }
        }
      },

      login: async (credentials) => {
        const res = await axios.post("/login", credentials, {
          withCredentials: true,
        });
        set({ user: res.data.user, isChecking: false });
      },

      logout: async () => {
        await axios.post("/logout", {}, { withCredentials: true });
        set({ user: null });
      },
    }),
    {
      name: "auth", // localStorage key
      partialize: (state) => ({ user: state.user }),
    }
  )
);
