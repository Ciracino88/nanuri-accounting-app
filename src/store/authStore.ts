// src/store/authStore.ts
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  name: string;
  role: string;
  position: string[] | null;
  avatar_url: string | null;
  team: string | null;
  phone?: string | null;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAnonymous: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  fetchUserProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  isLoading: true,
  isAnonymous: false,

  setUser: (user) => set({ user, isAnonymous: user?.is_anonymous ?? false }),
  setUserProfile: (userProfile) => set({ userProfile }),

  fetchUserProfile: async () => {
    const { user } = get();
    if (!user || user.is_anonymous) return;

    const { data } = await supabase
      .from("user_profiles")
      .select("name, role, position, avatar_url, team, phone")
      .eq("id", user.id)
      .single();

    set({ userProfile: data ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, userProfile: null, isAnonymous: false });
  },

  initialize: async () => {
    set({ isLoading: true });

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user, isAnonymous: session.user.is_anonymous ?? false });
      await get().fetchUserProfile();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
        set({ user: session.user, isAnonymous: session.user.is_anonymous ?? false });
        await get().fetchUserProfile();
      } else if (event === "SIGNED_OUT") {
        set({ user: null, userProfile: null, isAnonymous: false });
      }
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        set({ isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  },
}));