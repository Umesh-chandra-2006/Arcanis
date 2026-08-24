import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const Home = lazy(() => import("./pages/Home"));
const AuthVerify = lazy(() => import("./pages/AuthVerify"));
const Create = lazy(() => import("./pages/Create"));
const Library = lazy(() => import("./pages/Library"));
const ShareSpell = lazy(() => import("./pages/ShareSpell"));
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth/verify" element={<AuthVerify />} />
          <Route path="/create" element={<Create />} />
          <Route path="/library" element={<Library />} />
          <Route path="/spell/:spellId" element={<ShareSpell />} />
          <Route path="/admin/metrics" element={<AdminMetrics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </TooltipProvider>
  );
}

export default App;