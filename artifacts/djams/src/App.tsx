import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Workers from "@/pages/workers";
import WorkerDetail from "@/pages/worker-detail";
import Suppliers from "@/pages/suppliers";
import Revenue from "@/pages/revenue";
import MenuManager from "@/pages/menu";
import MenuPublic from "@/pages/menu-public";
import Kitchen from "@/pages/kitchen";
import Expenses from "@/pages/expenses";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false;
        return failureCount < 1;
      },
      staleTime: 5000,
    }
  }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "kitchen" && location !== "/kitchen") {
    return <Redirect to="/kitchen" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/menu/public" component={MenuPublic} />
      <Route path="/login" component={Login} />
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/workers" component={Workers} />
              <Route path="/workers/:id" component={WorkerDetail} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/revenue" component={Revenue} />
              <Route path="/menu" component={MenuManager} />
              <Route path="/kitchen" component={Kitchen} />
              <Route path="/expenses" component={Expenses} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <div dir="rtl" className="dark h-full min-h-[100dvh] bg-background text-foreground font-sans">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
