import { create } from "zustand";
import axios from "axios";

axios.defaults.withCredentials = true; // IMPORTANT for session cookies
export const useAuthStore = create((set) => ({
  user:{role:'super_admin',id:"1",name:"Liaqat Ali"}, // { id, role, name }

  setUser: (user) => set({ user }),
  login: async (credentials) => {
    const res = await axios.post("/api/login", credentials, {
      withCredentials: true,
    });
    set({ user: res.data.user });
  },

  logout: async () => {
    await axios.post("/api/logout", {}, { withCredentials: true });
    set({ user: null });
  },
}));
