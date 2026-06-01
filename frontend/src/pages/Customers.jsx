import React, { useEffect, useState } from "react";
import { Plus, Trash2, Search, Users, AlertCircle, CheckCircle, RefreshCw, Trophy, MapPin } from "lucide-react";
import api, { parseErrorDetail } from "../api";
import Modal from "../components/Modal";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    phone: "",
    address: "No Address Provided"
  });
  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/customers");
      setCustomers(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch customers. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Customer Name is required.";
    if (!formData.email.trim()) return "Email address is required.";
    // Basic email format check
    const emailPattern = /^[\w\.-]+@[\w\.-]+\.\w+$/;
    if (!emailPattern.test(formData.email.trim())) return "Invalid email address format.";
    if (!formData.phone.trim()) return "Phone number is required.";
    return null;
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setFormError("");

    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      const response = await api.post("/api/customers", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || "No Address Provided"
      });

      setCustomers([...customers, response.data]);
      setIsAddModalOpen(false);
      setFormData({ name: "", email: "", phone: "", address: "No Address Provided" });
      triggerNotification("success", `Customer "${response.data.name}" added successfully.`);
    } catch (err) {
      console.error(err);
      setFormError(parseErrorDetail(err));
    }
  };

  const handleDeleteCustomer = async (customerId, customerName) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customerName}"? This will cancel all their orders.`)) return;

    try {
      await api.delete(`/api/customers/${customerId}`);
      setCustomers(customers.filter((c) => c.id !== customerId));
      triggerNotification("success", `Customer "${customerName}" deleted successfully.`);
    } catch (err) {
      console.error(err);
      triggerNotification("error", parseErrorDetail(err));
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Notifications */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-xl border shadow-xl transition-all duration-300 animate-bounce ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {notification.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Customer Accounts</h2>
          <p className="text-gray-400 text-sm mt-1">Manage corporate clients, retail customer profiles, and loyalty points</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", email: "", phone: "", address: "No Address Provided" });
            setFormError("");
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-200 glow-indigo"
        >
          <Plus className="h-5 w-5" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 max-w-md w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors duration-200">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-white placeholder-gray-500 text-sm"
        />
      </div>

      {/* Display states */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">Loading customers registry...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-gray-800">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 font-semibold">{error}</p>
          <button
            onClick={fetchCustomers}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition"
          >
            Retry
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-gray-800">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No customers found</p>
          <p className="text-gray-600 text-sm mt-1">Add a new customer profile to get started.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-gray-800/80 bg-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/20 text-gray-400 text-xs tracking-wider uppercase font-semibold">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Phone Number</th>
                  <th className="py-4 px-6">Address</th>
                  <th className="py-4 px-6 text-center">Loyalty Points</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 text-sm">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-800/10 transition duration-150">
                    <td className="py-4 px-6 font-semibold text-white">{customer.name}</td>
                    <td className="py-4 px-6 text-gray-300 font-mono text-xs">{customer.email}</td>
                    <td className="py-4 px-6 text-gray-300">{customer.phone}</td>
                    <td className="py-4 px-6 text-gray-400">
                      <div className="flex items-center space-x-1.5 max-w-[200px] truncate" title={customer.address}>
                        <MapPin className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0 animate-pulse" />
                        <span>{customer.points}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition duration-200"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Customer">
        <form onSubmit={handleAddCustomer} className="space-y-5">
          {formError && (
            <div className="flex items-center space-x-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
            <input
              type="text"
              name="email"
              placeholder="e.g. john@example.com"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
            <input
              type="text"
              name="phone"
              placeholder="e.g. +1 555-0199"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery/Billing Address</label>
            <textarea
              name="address"
              placeholder="e.g. 123 Sci-Fi Drive, Cyberpunk City"
              value={formData.address}
              onChange={handleInputChange}
              rows="3"
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition resize-none"
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl text-sm font-bold shadow-lg transition duration-200"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
