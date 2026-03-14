import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ResultPage } from "./pages/ResultPage";
import { isAuthenticated, verifyToken, clearToken } from "./lib/api";

type Route =
  | { page: "login" }
  | { page: "dashboard" }
  | { page: "result"; id: string };

function parseRoute(): Route {
  const hash = window.location.hash;
  const resultMatch = hash.match(/^#\/result\/(.+)$/);
  if (resultMatch) return { page: "result", id: resultMatch[1] };
  if (hash === "#/dashboard") return { page: "dashboard" };
  return { page: "login" };
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [checking, setChecking] = useState(true);

  // Listen to hash changes
  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Verify session on mount
  useEffect(() => {
    (async () => {
      if (isAuthenticated()) {
        const valid = await verifyToken();
        if (!valid) {
          clearToken();
          navigate("login");
        } else if (route.page === "login") {
          navigate("dashboard");
        }
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-foca-700 text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated() && route.page !== "login") {
    navigate("login");
    return null;
  }

  switch (route.page) {
    case "login":
      return <LoginPage onSuccess={() => navigate("dashboard")} />;
    case "dashboard":
      return (
        <DashboardPage
          onViewResult={(id) => navigate("result", id)}
          onLogout={() => {
            clearToken();
            navigate("login");
          }}
        />
      );
    case "result":
      return (
        <ResultPage
          id={route.id}
          onBack={() => navigate("dashboard")}
          onLogout={() => {
            clearToken();
            navigate("login");
          }}
        />
      );
  }
}

function navigate(page: "login" | "dashboard"): void;
function navigate(page: "result", id: string): void;
function navigate(page: string, id?: string): void {
  if (page === "result") {
    window.location.hash = `#/result/${id}`;
  } else {
    window.location.hash = `#/${page}`;
  }
}
