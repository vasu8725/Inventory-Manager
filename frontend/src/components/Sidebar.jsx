import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Users, ShoppingCart, BarChart2 } from "lucide-react";

export default function Sidebar() {
  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Products", path: "/products", icon: Package },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Orders", path: "/orders", icon: ShoppingCart },
  ];

  return (
    <aside className="w-64 glass-panel h-screen fixed left-0 top-0 flex flex-col z-20 border-r border-gray-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl shadow-lg glow-indigo">
          <BarChart2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">StockFlow</h1>
          <span className="text-xs text-gray-500 font-medium tracking-widest uppercase">Inventory Pro</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600/20 to-cyan-500/10 border-l-4 border-indigo-500 text-white font-medium shadow-md"
                    : "text-gray-400 hover:bg-gray-800/40 hover:text-white border-l-4 border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
                      isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-600">v1.0.0 • Containerized App</p>
      </div>
    </aside>
  );
}
