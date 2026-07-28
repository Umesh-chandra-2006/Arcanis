import { Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { DashboardPage } from "@/pages/dashboard"
import { PlaceholderPage } from "@/pages/placeholder"

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<PlaceholderPage title="Home" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="battle" element={<PlaceholderPage title="Battle" />} />
        <Route path="lab" element={<PlaceholderPage title="Lab" />} />
        <Route path="tower" element={<PlaceholderPage title="Magic Tower" />} />
        <Route path="quests" element={<PlaceholderPage title="Quests" />} />
        <Route path="freestyle" element={<PlaceholderPage title="Freestyle" />} />
        <Route path="community" element={<PlaceholderPage title="Community" />} />
        <Route path="profile" element={<PlaceholderPage title="Profile" />} />
        <Route path="avatar" element={<PlaceholderPage title="Avatar Selection" />} />
        <Route path="hall" element={<PlaceholderPage title="Hall" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
    </Routes>
  )
}
