import { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";
import type { LoginBody, AuthUser } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginBody) => void;
  logout: () => void;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      retry: false,
    }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        refetch();
        if (data.role === "soldier") {
          const disc = (data as any).discordUsername;
          const rank = (data as any).rank as string | undefined;
          const RANK_ORDER = [
            "Cadet", "Officer 1", "Officer 2", "Officer 3",
            "Sergeant 1", "Sergeant 2", "Sergeant 3",
            "Lieutenant", "First Lieutenant", "Captain", "Major",
            "Lieutenant Colonel", "Colonel", "Brigadier General",
            "Major General", "Lieutenant General", "General",
            "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
              "Minister of Interior",
          ];
          const rankIdx = rank ? RANK_ORDER.indexOf(rank) : -1;
          const isLieutenantPlus = rankIdx >= 7;
          if (!disc && isLieutenantPlus) {
            setLocation("/discord-setup");
          } else {
            setLocation("/soldier-dashboard");
          }
        } else {
          setLocation("/");
        }
        toast({ title: "تم تسجيل الدخول بنجاح" });
      },
      onError: (error) => {
        toast({ 
          title: "خطأ في تسجيل الدخول", 
          description: error.error || "تأكد من بيانات الدخول",
          variant: "destructive" 
        });
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        refetch();
        setLocation("/login");
      }
    }
  });

  const login = (data: LoginBody) => {
    loginMutation.mutate({ data });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      login,
      logout,
      isLoggingIn: loginMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      refetchUser: refetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
