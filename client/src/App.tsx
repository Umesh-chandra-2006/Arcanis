import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "./contexts/ThemeContext"
import { AuthProvider } from "./contexts/AuthContext"
import ErrorBoundary from "./components/ErrorBoundary"
const Home = lazy(() => import("./pages/Home"))
const Auth = lazy(() => import("./pages/Auth"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const Lab = lazy(() => import("./pages/Lab"))
const BattleSelect = lazy(() => import("./pages/BattleSelect"))
const Battle = lazy(() => import("./pages/Battle"))
const NotFound = lazy(() => import("./pages/NotFound"))
import { PlaceholderPage } from "./pages/Placeholder"

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" switchable>
          <TooltipProvider>
            <Toaster />
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/lab" element={<Lab />} />
                  <Route path="/battle-select" element={<BattleSelect />} />
                  <Route path="/battle/:battleId" element={<Battle />} />
                  <Route path="/tower" element={<PlaceholderPage title="Magic Tower" />} />
                  <Route path="/quests" element={<PlaceholderPage title="Quests" />} />
                  <Route path="/freestyle" element={<PlaceholderPage title="Freestyle" />} />
                  <Route path="/community" element={<PlaceholderPage title="Community" />} />
                  <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
                  <Route path="/avatar" element={<PlaceholderPage title="Avatar Selection" />} />
                  <Route path="/hall" element={<PlaceholderPage title="Hall" />} />
                  <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
