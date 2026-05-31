import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, Package, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import api, { parseErrorDetail } from "../api";
import Modal from "../components/Modal";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: "", sku: "", price: "", quantity_in_stock: "" });
  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/products");
      setProducts(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch products. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
    if (!formData.name.trim()) return "Product Name is required.";
    if (!formData.sku.trim()) return "SKU code is required.";
    if (isNaN(formData.price) || Number(formData.price) < 0) return "Price must be a non-negative number.";
    if (isNaN(formData.quantity_in_stock) || !Number.isInteger(Number(formData.quantity_in_stock)) || Number(formData.quantity_in_stock) < 0) {
      return "Quantity in stock must be a non-negative integer.";
    }
    return null;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormError("");

    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      const response = await api.post("/api/products", {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        price: Number(formData.price),
        quantity_in_stock: parseInt(formData.quantity_in_stock, 10),
      });

      setProducts([...products, response.data]);
      setIsAddModalOpen(false);
      setFormData({ name: "", sku: "", price: "", quantity_in_stock: "" });
      triggerNotification("success", `Product "${response.data.name}" added successfully.`);
    } catch (err) {
      console.error(err);
      setFormError(parseErrorDetail(err));
    }
  };

  const handleOpenEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity_in_stock: product.quantity_in_stock,
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setFormError("");

    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      const response = await api.put(`/api/products/${currentProduct.id}`, {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        price: Number(formData.price),
        quantity_in_stock: parseInt(formData.quantity_in_stock, 10),
      });

      setProducts(products.map((p) => (p.id === currentProduct.id ? response.data : p)));
      setIsEditModalOpen(false);
      setFormData({ name: "", sku: "", price: "", quantity_in_stock: "" });
      triggerNotification("success", `Product "${response.data.name}" updated successfully.`);
    } catch (err) {
      console.error(err);
      setFormError(parseErrorDetail(err));
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete product "${productName}"?`)) return;

    try {
      await api.delete(`/api/products/${productId}`);
      setProducts(products.filter((p) => p.id !== productId));
      triggerNotification("success", `Product "${productName}" was deleted.`);
    } catch (err) {
      console.error(err);
      const detail = parseErrorDetail(err);
      triggerNotification("error", detail);
    }
  };

  // Filter products by query
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h2 className="text-3xl font-extrabold text-white">Product Catalog</h2>
          <p className="text-gray-400 text-sm mt-1">Manage and track your products and inventory stock levels</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", sku: "", price: "", quantity_in_stock: "" });
            setFormError("");
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-200 glow-indigo"
        >
          <Plus className="h-5 w-5" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 max-w-md w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors duration-200">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-white placeholder-gray-500 text-sm"
        />
      </div>

      {/* Data display states */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">Fetching inventory items...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-gray-800">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 font-semibold">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition"
          >
            Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-gray-800">
          <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No products found</p>
          <p className="text-gray-600 text-sm mt-1">Try refining your search query or add a new product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isLowStock = product.quantity_in_stock <= 10;
            const isOutOfStock = product.quantity_in_stock === 0;

            return (
              <div
                key={product.id}
                className="glass-card rounded-2xl p-6 border flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs text-indigo-400 tracking-wider font-semibold uppercase">
                      SKU: {product.sku}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isOutOfStock
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : isLowStock
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-wide mb-1 leading-snug">{product.name}</h3>

                  <div className="mt-4 flex justify-between items-baseline border-b border-gray-800/40 pb-4">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">Unit Price</span>
                    <span className="text-2xl font-extrabold text-white">${Number(product.price).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">Stock Available</span>
                    <span
                      className={`text-lg font-bold ${
                        isOutOfStock ? "text-red-400" : isLowStock ? "text-amber-400" : "text-gray-200"
                      }`}
                    >
                      {product.quantity_in_stock} units
                    </span>
                  </div>

                  <div className="flex space-x-2 border-t border-gray-800/40 pt-4">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition duration-200"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-red-950/10 hover:bg-red-950/30 border border-red-900/30 hover:border-red-900/60 rounded-xl text-red-400 hover:text-red-300 transition duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Product">
        <form onSubmit={handleAddProduct} className="space-y-5">
          {formError && (
            <div className="flex items-center space-x-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Wireless Mouse"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SKU Code (Must be unique)</label>
            <input
              type="text"
              name="sku"
              placeholder="e.g. TECH-MSE-001"
              value={formData.sku}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price ($)</label>
              <input
                type="number"
                name="price"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity in Stock</label>
              <input
                type="number"
                name="quantity_in_stock"
                placeholder="0"
                value={formData.quantity_in_stock}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition"
              />
            </div>
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
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Product: ${currentProduct?.name}`}>
        <form onSubmit={handleEditProduct} className="space-y-5">
          {formError && (
            <div className="flex items-center space-x-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none text-sm transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SKU Code</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none text-sm transition font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price ($)</label>
              <input
                type="number"
                name="price"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none text-sm transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity in Stock</label>
              <input
                type="number"
                name="quantity_in_stock"
                value={formData.quantity_in_stock}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none text-sm transition"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl text-sm font-bold shadow-lg transition duration-200"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
