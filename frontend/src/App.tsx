import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import MaterialsPage from './pages/MaterialsPage'
import ProductionLinesPage from './pages/ProductionLinesPage'
import RoutingsPage from './pages/RoutingsPage'
import BOMsPage from './pages/BOMsPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Layout>
                  <UsersPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/materials" element={
              <ProtectedRoute>
                <Layout>
                  <MaterialsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/production-lines" element={
              <ProtectedRoute>
                <Layout>
                  <ProductionLinesPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/routings" element={
              <ProtectedRoute>
                <Layout>
                  <RoutingsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/boms" element={
              <ProtectedRoute>
                <Layout>
                  <BOMsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/work-orders" element={
              <ProtectedRoute>
                <Layout>
                  <WorkOrdersPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/work-orders/:id" element={
              <ProtectedRoute>
                <Layout>
                  <WorkOrderDetailPage />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
