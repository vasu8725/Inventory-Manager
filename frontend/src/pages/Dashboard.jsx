import React, { useEffect, useState } from "react";
import { Package, Users, ShoppingCart, AlertTriangle, RefreshCw } from "lucide-react";
import api from "../api";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/dashboard");
      setData(response.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard metrics. Make sure the API service is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center max-w-md mx-auto">
        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30 text-neonRed mb-4">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg transition duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Products",
      value: data?.total_products ?? 0,
      icon: Package,
      gradient: "from-blue-600/20 to-indigo-600/10",
      iconColor: "text-blue-400",
      glow: "border-blue-500/20",
    },
    {
      title: "Total Customers",
      value: data?.total_customers ?? 0,
      icon: Users,
      gradient: "from-cyan-600/20 to-teal-600/10",
      iconColor: "text-cyan-400",
      glow: "border-cyan-500/20",
    },
    {
      title: "Total Orders",
      value: data?.total_orders ?? 0,
      icon: ShoppingCart,
      gradient: "from-purple-600/20 to-indigo-600/10",
      iconColor: "text-purple-400",
      glow: "border-purple-500/20",
    },
    {
      title: "Low Stock Alerts",
      value: data?.low_stock_count ?? 0,
      icon: AlertTriangle,
      gradient: "from-amber-600/20 to-yellow-600/10",
      iconColor: "text-amber-400",
      glow: "border-amber-500/20",
      alert: (data?.low_stock_count ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time statistics and stock alerts</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2.5 bg-gray-900/60 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition duration-200"
          title="Refresh Data"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl glass-card bg-gradient-to-br ${card.gradient} relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-semibold tracking-wider text-gray-400 uppercase">{card.title}</p>
                  <h3 className="text-4xl font-extrabold text-white">{card.value}</h3>
                </div>
                <div className={`p-3 bg-gray-900/50 border border-gray-800 rounded-xl ${card.iconColor}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              {card.alert && (
                <div className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Low Stock Warning Section */}
      <div className="glass-panel rounded-2xl p-6 border border-gray-800 bg-gray-900/10">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-800">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Critical Low Stock Products</h3>
            <p className="text-xs text-gray-500">Products with 10 units or less left in stock</p>
          </div>
        </div>

        {data?.low_stock_products.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>All products have healthy inventory levels.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs tracking-wider uppercase font-semibold">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-sm">
                {data?.low_stock_products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-800/20 transition duration-150">
                    <td className="py-4 px-4 font-semibold text-white">{product.name}</td>
                    <td className="py-4 px-4 font-mono text-gray-400">{product.sku}</td>
                    <td className="py-4 px-4 text-gray-200">${Number(product.price).toFixed(2)}</td>
                    <td className="py-4 px-4 text-gray-300">
                      <span className="font-bold text-base">{product.quantity_in_stock}</span> units
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          product.quantity_in_stock === 0
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {product.quantity_in_stock === 0 ? "Out of Stock" : "Low Stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
