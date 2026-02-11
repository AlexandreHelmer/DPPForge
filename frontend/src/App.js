import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';

// Styles
import './styles/custom.scss';

// Auth Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import VerifyEmail from './components/auth/VerifyEmail';
import PasswordReset from './components/auth/PasswordReset';
import PasswordResetConfirm from './components/auth/PasswordResetConfirm';

// Pages
import Dashboard from './pages/Dashboard';
import ComponentList from './pages/ComponentList';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import Settings from './pages/Settings';
import DigitalTwins from './pages/DigitalTwins';
import PublicProductView from './pages/PublicProductView';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

function App() {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const basePath = process.env.PUBLIC_URL || '/'; // PUBLIC_URL = homepage dans package.json

  // Listen for auth changes (manual poll or events)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAuthenticated(authService.isAuthenticated());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  const showSidebar = isAuthenticated;

  return (
    <Router basename={basePath}>
      <div className="app-wrapper">
        {showSidebar && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
          />
        )}

        <div className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''} ${!showSidebar ? 'no-sidebar' : ''}`}>
          <Navbar />

          <main className="content-area" id="main-content" tabIndex="-1">
            <Routes>
              {/* Public routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/verify-email/:key" element={<VerifyEmail />} />
              <Route path="/auth/password-reset" element={<PasswordReset />} />
              <Route path="/auth/password-reset/confirm/:key" element={<PasswordResetConfirm />} />
              <Route path="/twin/:id" element={<PublicProductView />} />

              {/* Legacy login redirect */}
              <Route path="/login" element={<Navigate to="/auth/login" replace />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />

              <Route path="/components" element={
                <PrivateRoute>
                  <ComponentList />
                </PrivateRoute>
              } />

              <Route path="/products" element={
                <PrivateRoute>
                  <ProductList />
                </PrivateRoute>
              } />

              <Route path="/products/new" element={
                <PrivateRoute>
                  <ProductForm />
                </PrivateRoute>
              } />

              <Route path="/products/edit/:id" element={
                <PrivateRoute>
                  <ProductForm />
                </PrivateRoute>
              } />

              <Route path="/settings" element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              } />

              <Route path="/qr-generator" element={
                <PrivateRoute>
                  <DigitalTwins />
                </PrivateRoute>
              } />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </div>
    </Router>
  );
}

export default App;
