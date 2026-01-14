import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import NotFound from "@/pages/not-found";
import { StoreProvider, useAppStore } from "@/lib/StoreContext";
import { PasswordGate } from "@/components/PasswordGate";

const CalendarPage = lazy(() => import("@/pages/CalendarPage").then(m => ({ default: m.CalendarPage })));
const EmployeesPage = lazy(() => import("@/pages/EmployeesPage").then(m => ({ default: m.EmployeesPage })));
const SkillsPage = lazy(() => import("@/pages/SkillsPage").then(m => ({ default: m.SkillsPage })));
const AeroStaffPage = lazy(() => import("@/pages/AeroStaffPage").then(m => ({ default: m.AeroStaffPage })));
const TrainingPage = lazy(() => import("@/pages/TrainingPage").then(m => ({ default: m.TrainingPage })));
const SyncPage = lazy(() => import("@/pages/SyncPage").then(m => ({ default: m.SyncPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function AppRouter() {
  const store = useAppStore();
  
  return (
    <Layout 
      employees={store.employees}
      assignments={store.assignments}
      dailyTargets={store.dailyTargets}
      onImport={store.importData}
      onReset={store.resetToDefaults}
      onLoadDemo={store.loadDemoData}
    >
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/employees" component={EmployeesPage} />
          <Route path="/skills" component={SkillsPage} />
          <Route path="/aerostaff" component={AeroStaffPage} />
          <Route path="/training" component={TrainingPage} />
          <Route path="/sync" component={SyncPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StoreProvider>
            <WouterRouter hook={useHashLocation}>
              <PasswordGate>
                <Toaster />
                <AppRouter />
              </PasswordGate>
            </WouterRouter>
          </StoreProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
