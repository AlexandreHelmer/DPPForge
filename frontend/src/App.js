import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';

// Styles
import './styles/custom.scss';

// Pages
import Login from './pages/Login';
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
    <Router>
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
              <Route path="/login" element={<Login />} />
              <Route path="/twin/:id" element={<PublicProductView />} />

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
