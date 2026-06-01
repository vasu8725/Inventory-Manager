import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import { Menu } from "lucide-react";

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-darkBg flex text-gray-100">
        {/* Navigation Sidebar */}
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          isMobileOpen={isMobileOpen} 
          setIsMobileOpen={setIsMobileOpen} 
        />

        {/* Mobile Header Bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-4 z-10">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-lg focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-lg font-bold tracking-wider text-white">StockFlow</span>
          </div>
        </div>

        {/* Backdrop for Mobile Sidebar */}
        {isMobileOpen && (
          <div 
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-15 backdrop-blur-sm"
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 min-h-screen overflow-y-auto pt-20 md:pt-8 p-4 sm:p-6 md:p-8 transition-all duration-300 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        } ml-0`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
