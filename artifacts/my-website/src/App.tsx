import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Soldiers from "@/pages/soldiers";
import NewSoldier from "@/pages/new-soldier";
import Warnings from "@/pages/warnings";
import ActivityLogs from "@/pages/activity-logs";
import SoldierDashboard from "@/pages/soldier-dashboard";
import CitizenSearch from "@/pages/citizen-search";
import Points from "@/pages/points";
import Radar from "@/pages/radar";
import BankSearch from "@/pages/bank-search";
import PoliceBudget from "@/pages/police-budget";
import Seizure from "@/pages/seizure";
import DiscordSetup from "@/pages/discord-setup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/soldiers" component={Soldiers} />
      <Route path="/soldiers/new" component={NewSoldier} />
      <Route path="/warnings" component={Warnings} />
      <Route path="/activity-logs" component={ActivityLogs} />
      <Route path="/soldier-dashboard" component={SoldierDashboard} />
      <Route path="/citizen-search" component={CitizenSearch} />
      <Route path="/points" component={Points} />
      <Route path="/radar" component={Radar} />
      <Route path="/bank-search" component={BankSearch} />
      <Route path="/police-budget" component={PoliceBudget} />
      <Route path="/seizure" component={Seizure} />
      <Route path="/discord-setup" component={DiscordSetup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
