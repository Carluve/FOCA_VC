import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ResultPage } from "./pages/ResultPage";

export function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("foca-auth") === "true";
  });

  useEffect(() => {
    if (authenticated) {
      sessionStorage.setItem("foca-auth", "true");
    } else {
      sessionStorage.removeItem("foca-auth");
    }
  }, [authenticated]);

  const handleLogout = () => {
    setAuthenticated(false);
    sessionStorage.removeItem("foca-auth");
  };

  if (!authenticated) {
    return <LoginPage onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage onLogout={handleLogout} />} />
      <Route path="/result/:id" element={<ResultPage onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
