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

  // Override collapsed state when the sidebar is serving as a mobile drawer overlay
  const renderCollapsed = isCollapsed && !isMobileOpen;

  return (
    <aside className={`glass-panel h-screen fixed top-0 flex flex-col z-20 border-r border-gray-800 transition-all duration-300 
      ${isMobileOpen ? "left-0 w-64" : "-left-64 md:left-0"} 
      ${renderCollapsed ? "md:w-20" : "md:w-64"}`}>
      
      {/* Brand Header */}
      <div className={`p-4 border-b border-gray-800 flex ${
        renderCollapsed ? "flex-col items-center justify-center space-y-3" : "items-center justify-between"
      }`}>
        <div className={`flex items-center ${renderCollapsed ? "justify-center" : "space-x-3"} overflow-hidden`}>
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl shadow-lg glow-indigo shrink-0 flex items-center justify-center h-10 w-10">
            {renderCollapsed ? (
              <span className="text-white font-black text-sm tracking-wider animate-in fade-in duration-200">SF</span>
            ) : (
              <BarChart2 className="h-5 w-5 text-white" />
            )}
          </div>
          {!renderCollapsed && (
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
          className={`hidden md:flex p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg focus:outline-none ${
            renderCollapsed ? "mt-1" : ""
          }`}
        >
          {renderCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileOpen(false)} // Close mobile drawer on navigation
              title={renderCollapsed ? item.name : ""}
              className={({ isActive }) =>
                `flex items-center rounded-xl transition-all duration-300 group relative ${
                  renderCollapsed ? "justify-center p-3" : "space-x-3 px-4 py-2.5"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600/20 to-cyan-500/10 text-white font-semibold shadow-md"
                    : "text-gray-400 hover:bg-gray-800/35 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Left Border Accent Indicator Pill */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-indigo-500 rounded-r-md animate-in slide-in-from-left duration-250" />
                  )}
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 shrink-0 ${
                      isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                  {!renderCollapsed && <span className="animate-in fade-in duration-300">{item.name}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800 text-center overflow-hidden">
        <p className="text-xs text-gray-600 truncate">
          {renderCollapsed ? "v1" : "v1.0.0 • Containerized App"}
        </p>
      </div>
    </aside>
  );
}
