import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Pages
import Dashboard from './pages/Dashboard';
import GroupDetails from './pages/GroupDetails';
import AddExpense from './pages/AddExpense';
import BalanceSummary from './pages/BalanceSummary';
import SettlementHistory from './pages/SettlementHistory';
import ImportCsv from './pages/ImportCsv';
import ImportReport from './pages/ImportReport';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/groups/:groupId" element={<GroupDetails />} />
            <Route path="/groups/:groupId/add-expense" element={<AddExpense />} />
            <Route path="/groups/:groupId/balance" element={<BalanceSummary />} />
            <Route path="/groups/:groupId/settlements" element={<SettlementHistory />} />
            <Route path="/groups/:groupId/import" element={<ImportCsv />} />
            <Route path="/import-report/:importId" element={<ImportReport />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
