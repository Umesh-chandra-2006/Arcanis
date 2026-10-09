import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";

const Home = lazy(() => import("./pages/Home"));
const AuthVerify = lazy(() => import("./pages/AuthVerify"));
const SignIn = lazy(() => import("./pages/SignIn"));
const Create = lazy(() => import("./pages/Create"));
const Library = lazy(() => import("./pages/Library"));
const ShareSpell = lazy(() => import("./pages/ShareSpell"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
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
          <Route path="/auth/verify" element={<AuthVerify />} />
          <Route path="/signin" element={<SignIn />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/library" element={<Library />} />
            <Route path="/spell/:spellId" element={<ShareSpell />} />
            {/* Alias never rewritten to the OG renderer (see vercel.json). */}
            <Route path="/s/:spellId" element={<ShareSpell />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/admin/metrics" element={<AdminMetrics />} />
            <Route path="/admin/moderation" element={<AdminModeration />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </TooltipProvider>
  );
}

export default App;