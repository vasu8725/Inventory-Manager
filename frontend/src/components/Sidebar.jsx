import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Users, ShoppingCart, BarChart2, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Products", path: "/products", icon: Package },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Orders", path: "/orders", icon: ShoppingCart },
  ];

  return (
    <aside className={`glass-panel h-screen fixed top-0 flex flex-col z-20 border-r border-gray-800 transition-all duration-300 
      ${isMobileOpen ? "left-0 w-64" : "-left-64 md:left-0"} 
      ${isCollapsed ? "md:w-20" : "md:w-64"}`}>
      
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl shadow-lg glow-indigo shrink-0">
            <BarChart2 className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-xl font-bold tracking-wider text-white">StockFlow</h1>
              <span className="text-xs text-gray-500 font-medium tracking-widest uppercase">Inventory Pro</span>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg focus:outline-none"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileOpen(false)} // Close mobile drawer on navigation
              title={isCollapsed ? item.name : ""}
              className={({ isActive }) =>
                `flex items-center rounded-xl transition-all duration-300 group ${
                  isCollapsed ? "justify-center p-3" : "space-x-3 px-4 py-3"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600/20 to-cyan-500/10 border-l-4 border-indigo-500 text-white font-medium shadow-md"
                    : "text-gray-400 hover:bg-gray-800/40 hover:text-white border-l-4 border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 shrink-0 ${
                      isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                  {!isCollapsed && <span className="animate-in fade-in duration-300">{item.name}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800 text-center overflow-hidden">
        <p className="text-xs text-gray-600 truncate">
          {isCollapsed ? "v1" : "v1.0.0 • Containerized App"}
        </p>
      </div>
    </aside>
  );
}
