import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Transfers } from './pages/Transfers';
import { Maintenance } from './pages/Maintenance';
import { POS } from './pages/POS';
import { Reports } from './pages/Reports';
import { Customers } from './pages/Customers';
import { Damages } from './pages/Damages';
import { InventoryAudits } from './pages/InventoryAudits';
import { ActiveAudit } from './pages/ActiveAudit';
import { initDb } from './lib/db';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { useActivationStore } from './store/activationStore';
import { Activation } from './pages/Activation';

// Wholesale Pages
import { WholesaleDashboard } from './pages/wholesale/WholesaleDashboard';
import { WholesaleInventory } from './pages/wholesale/WholesaleInventory';
import { WholesaleMerchants } from './pages/wholesale/WholesaleMerchants';
import { WholesaleOrders } from './pages/wholesale/WholesaleOrders';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  
  const { isActivated, isChecking, checkActivation, hardwareId } = useActivationStore();
  const [hwidError, setHwidError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get Hardware ID first
    invoke<string>('get_hardware_id')
      .then((hwid) => {
        checkActivation(hwid);
      })
      .catch((err) => {
        console.error("Hardware ID Error: ", err);
        setHwidError(String(err));
      });

    // 2. Init DB
    initDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("DB Init Error: ", err);
        setDbError(String(err));
      });
  }, [checkActivation]);

  if (hwidError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">خطأ في قراءة بصمة الجهاز</h1>
        <p className="bg-slate-800 p-4 rounded-lg text-left text-sm max-w-lg w-full font-mono">{hwidError}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-blue-600 rounded">إعادة المحاولة</button>
      </div>
    );
  }

  if (isChecking || !hardwareId) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">جاري التحقق من الترخيص...</div>;
  }

  if (!isActivated) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />
        <Activation />
      </>
    );
  }

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">فشل في تهيئة قاعدة البيانات</h1>
        <p className="bg-slate-800 p-4 rounded-lg text-left text-sm max-w-lg w-full font-mono">{dbError}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-blue-600 rounded">إعادة المحاولة</button>
      </div>
    );
  }

  if (!dbReady) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">جاري تهيئة قاعدة البيانات...</div>;
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={user ? <MainLayout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="pos" element={<POS />} />
          <Route path="customers" element={<Customers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="damages" element={<Damages />} />
          <Route path="inventory-audits" element={<InventoryAudits />} />
          <Route path="inventory-audits/:id" element={<ActiveAudit />} />

          {/* Wholesale Routes */}
          <Route path="wholesale" element={<WholesaleDashboard />} />
          <Route path="wholesale/inventory" element={<WholesaleInventory />} />
          <Route path="wholesale/merchants" element={<WholesaleMerchants />} />
          <Route path="wholesale/orders" element={<WholesaleOrders />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
