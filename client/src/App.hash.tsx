import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Router, Route, Switch, useHashLocation } from "wouter";
import Home from "@/pages/home";
import AddMedia from "@/pages/add-media";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from 'react';

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/add-media" component={AddMedia} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isElectronReady, setIsElectronReady] = useState(false);
  // Use hash-based routing in Electron
  const isElectron = typeof window !== 'undefined' && window.electronEnv?.isElectron;
  const routerProps = isElectron ? { hook: useHashLocation } : {};

  useEffect(() => {
    if (isElectron) {
      if (window.electronAPI?.onServerInfo) {
        window.electronAPI.onServerInfo((event, serverInfo) => {
          setIsElectronReady(true);
        });
      } else {
        setIsElectronReady(true);
      }
    } else {
      setIsElectronReady(true);
    }
  }, []);

  if (!isElectronReady && isElectron) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing CipherBox...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router {...routerProps}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
