import { Navigate, Route, Routes } from "react-router-dom"

import { useAuth } from "../state/auth/useAuth.js"
import { routes } from "./routes.js"
import { AppShell } from "./shell/AppShell.jsx"
import { DashboardPage } from "./pages/DashboardPage.jsx"
import { LocationsPage } from "./pages/LocationsPage.jsx"
import { EmployeesPage } from "./pages/EmployeesPage.jsx"
import { LeavesPage } from "./pages/LeavesPage.jsx"
import { LoginPage } from "./pages/LoginPage.jsx"
import { PayrollPage } from "./pages/PayrollPage.jsx"
import { ReportsPage } from "./pages/ReportsPage.jsx"
import { SchedulingPage } from "./pages/SchedulingPage.jsx"
import { TasksPage } from "./pages/TasksPage.jsx"
import { TimePage } from "./pages/TimePage.jsx"
import { SettingsPage } from "./pages/SettingsPage.jsx"
import { GetStartedPage } from "./pages/GetStartedPage.jsx"
import { LiveLocationsPage } from "./pages/LiveLocationsPage.jsx"

export function App() {
  const { isReady, user } = useAuth()

  if (!isReady) return null

  return (
    <Routes>
      <Route 
        path={routes.login} 
        element={user ? (user.companyId ? <Navigate to={routes.get_started} replace /> : <Navigate to={routes.onboarding} replace />) : <LoginPage />} 
      />
      <Route 
        path={routes.onboarding} 
        element={<Navigate to={routes.login} replace />} 
      />
      <Route element={user ? (user.companyId ? <AppShell /> : <Navigate to={routes.onboarding} replace />) : <Navigate to={routes.login} replace />}>
        <Route path={routes.get_started} element={<GetStartedPage />} />
        <Route path={routes.dashboard} element={<DashboardPage />} />
        <Route path={routes.locations} element={<LocationsPage />} />
        <Route path={routes.live_locations} element={<LiveLocationsPage />} />
        <Route path={routes.time} element={<TimePage />} />
        <Route path={routes.tasks} element={<TasksPage />} />
        <Route path={routes.leaves} element={<LeavesPage />} />
        <Route path={routes.payroll} element={<PayrollPage />} />
        <Route path={routes.scheduling} element={<SchedulingPage />} />
        <Route path={routes.employees} element={<EmployeesPage />} />
        <Route path={routes.reports} element={<ReportsPage />} />
        
        {/* Settings Routes */}
        <Route path={routes.settings} element={<SettingsPage />} />
        <Route path={routes.settings_people} element={<SettingsPage section="people" />} />
        <Route path={routes.settings_timetracking} element={<SettingsPage section="time-tracking" />} />
        <Route path={routes.settings_attendance} element={<SettingsPage section="attendance" />} />
        <Route path={routes.settings_schedules} element={<SettingsPage section="schedules" />} />
        <Route path={routes.settings_shiftplanner} element={<SettingsPage section="shift-planner" />} />
        <Route path={routes.settings_holidays} element={<SettingsPage section="holidays" />} />
        <Route path={routes.settings_payroll} element={<SettingsPage section="payroll" />} />
        <Route path={routes.settings_expenses} element={<SettingsPage section="expenses" />} />
        <Route path={routes.settings_workflows} element={<SettingsPage section="workflows" />} />
        <Route path={routes.settings_productivity} element={<SettingsPage section="productivity" />} />
        <Route path={routes.settings_reports} element={<SettingsPage section="reports" />} />
        <Route path={routes.settings_notifications} element={<SettingsPage section="notifications" />} />
        <Route path={routes.settings_security} element={<SettingsPage section="security" />} />
        <Route path={routes.settings_rbac} element={<SettingsPage section="rbac" />} />
        <Route path={routes.settings_audit} element={<SettingsPage section="audit" />} />
        <Route path={routes.settings_devices} element={<SettingsPage section="devices" />} />
        <Route path={routes.settings_location} element={<SettingsPage section="location" />} />
        <Route path={routes.settings_branding} element={<SettingsPage section="branding" />} />
        <Route path={routes.settings_organization} element={<SettingsPage section="organization" />} />
        <Route path={routes.settings_integrations} element={<SettingsPage section="integrations" />} />
        <Route path={routes.settings_developer} element={<SettingsPage section="developer" />} />
        <Route path={routes.settings_billing} element={<SettingsPage section="billing" />} />
        <Route path={routes.settings_data} element={<SettingsPage section="data" />} />
      </Route>
      <Route path="*" element={<Navigate to={routes.dashboard} replace />} />
    </Routes>
  )
}
