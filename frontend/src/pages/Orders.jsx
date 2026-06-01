import React, { useEffect, useState } from "react";
import { Plus, Trash2, Eye, ShoppingBag, ShoppingCart, User, AlertCircle, CheckCircle, RefreshCw, X, ChevronRight } from "lucide-react";
import api, { parseErrorDetail } from "../api";
import Modal from "../components/Modal";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order Form state
  const [newOrderStep, setNewOrderStep] = useState(1); // 1: Customer, 2: Cart, 3: Confirm
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [cart, setCart] = useState([]); // Array of { product_id, quantity, product }
  
  // Selection helpers
  const [tempProductId, setTempProductId] = useState("");
  const [tempQuantity, setTempQuantity] = useState("1");
  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState(null);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        api.get("/api/orders"),
        api.get("/api/customers"),
        api.get("/api/products")
      ]);
      setOrders(ordersRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch order history. Ensure the server is online.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenInvoice = (order) => {
    setSelectedOrder(order);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenCreateOrder = () => {
    setNewOrderStep(1);
    setSelectedCustomerId("");
    setCart([]);
    setTempProductId("");
    setTempQuantity("1");
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const handleSelectCustomer = (e) => {
    setSelectedCustomerId(e.target.value);
    setFormError("");
  };

  const nextStep = () => {
    if (newOrderStep === 1) {
      if (!selectedCustomerId) {
        setFormError("Please select a customer.");
        return;
      }
      setNewOrderStep(2);
    } else if (newOrderStep === 2) {
      if (cart.length === 0) {
        setFormError("Please add at least one product to the order.");
        return;
      }
      setNewOrderStep(3);
    }
  };

  const prevStep = () => {
    setFormError("");
    setNewOrderStep((prev) => Math.max(1, prev - 1));
  };

  const handleAddToCart = () => {
    setFormError("");
    if (!tempProductId) {
      setFormError("Please select a product.");
      return;
    }

    const qty = parseInt(tempQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setFormError("Quantity must be a positive integer.");
      return;
    }

    const product = products.find((p) => p.id === parseInt(tempProductId, 10));
    if (!product) {
      setFormError("Product not found.");
      return;
    }

    // Check aggregate quantity if item already in cart
    const existingCartItem = cart.find((item) => item.product_id === product.id);
    const existingQty = existingCartItem ? existingCartItem.quantity : 0;
    const totalRequestQty = existingQty + qty;

    if (product.quantity_in_stock < totalRequestQty) {
      setFormError(
        `Insufficient stock for "${product.name}". In Stock: ${product.quantity_in_stock}, Cart/Requested: ${totalRequestQty}.`
      );
      return;
    }

    if (existingCartItem) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id ? { ...item, quantity: totalRequestQty } : item
        )
      );
    } else {
      setCart([...cart, { product_id: product.id, quantity: qty, product }]);
    }

    // Reset selection input
    setTempProductId("");
    setTempQuantity("1");
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  };

  const handleSubmitOrder = async () => {
    setFormError("");
    const orderItemsPayload = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    try {
      const response = await api.post("/api/orders", {
        customer_id: parseInt(selectedCustomerId, 10),
        items: orderItemsPayload,
      });

      // Update local states: add order, and deduct quantities from local products list
      setOrders([response.data, ...orders]);
      
      const updatedProducts = products.map((prod) => {
        const cartItem = cart.find((c) => c.product_id === prod.id);
        if (cartItem) {
          return { ...prod, quantity_in_stock: prod.quantity_in_stock - cartItem.quantity };
        }
        return prod;
      });
      setProducts(updatedProducts);

      setIsCreateModalOpen(false);
      triggerNotification("success", `Order #${response.data.id} placed successfully.`);
    } catch (err) {
      console.error(err);
      setFormError(parseErrorDetail(err));
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Cancel Order #${orderId}? This will remove the transaction and restore stock.`)) return;

    try {
      await api.delete(`/api/orders/${orderId}`);
      
      // Fetch fresh data after cancellation to ensure inventory amounts and orders sync correctly
      await fetchInitialData();
      triggerNotification("success", `Order #${orderId} cancelled and deleted. Stock restored.`);
    } catch (err) {
      console.error(err);
      triggerNotification("error", parseErrorDetail(err));
    }
  };

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
          <h2 className="text-3xl font-extrabold text-white">Order Registry</h2>
          <p className="text-gray-400 text-sm mt-1">Create sales orders, track client invoices, and handle cancellations</p>
        </div>
        <button
          onClick={handleOpenCreateOrder}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-200 glow-indigo"
        >
          <Plus className="h-5 w-5" />
          <span>New Sales Order</span>
        </button>
      </div>

      {/* Display states */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">Loading transaction logs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-gray-800">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 font-semibold">{error}</p>
          <button
            onClick={fetchInitialData}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-gray-800">
          <ShoppingBag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No orders recorded</p>
          <p className="text-gray-600 text-sm mt-1">Create a new sales order to register client transactions.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-gray-800/80 bg-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/20 text-gray-400 text-xs tracking-wider uppercase font-semibold">
                  <th className="py-4 px-6">Order ID</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Items Count</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Total Amount</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-sm">
                {orders.map((order) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  const formattedDate = new Date(order.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={order.id} className="hover:bg-gray-800/10 transition duration-150">
                      <td className="py-4 px-6 font-semibold text-white">#{order.id}</td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-200">{order.customer?.name}</div>
                        <div className="text-xs text-gray-500">{order.customer?.email}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-xs">{formattedDate}</td>
                      <td className="py-4 px-6 text-gray-300">
                        <span className="font-bold">{itemCount}</span> items
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-indigo-400 font-bold">${Number(order.total_amount).toFixed(2)}</td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleOpenInvoice(order)}
                          className="p-2 text-indigo-400 hover:text-indigo-350 hover:bg-indigo-500/10 rounded-lg transition duration-200"
                          title="View Invoice"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition duration-200"
                          title="Cancel Order"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title={`Invoice details: Order #${selectedOrder?.id}`}>
        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer Details section */}
            <div className="p-4 bg-gray-950/40 border border-gray-850 rounded-xl flex items-start space-x-4">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <User className="h-6 w-6" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client Billing</h4>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedOrder.customer.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{selectedOrder.customer.email}</div>
                  <div className="text-xs text-gray-450 mt-1 leading-relaxed">{selectedOrder.customer.address}</div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Invoice Metadata</h4>
                  <div className="text-xs text-gray-300">Phone: {selectedOrder.customer.phone}</div>
                  <div className="text-xs text-indigo-400 mt-0.5 font-semibold">Loyalty points: {selectedOrder.customer.points}</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedOrder.status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Products</h4>
              <div className="border border-gray-800 rounded-xl bg-gray-950/20 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900/40 text-gray-500 uppercase font-semibold">
                      <th className="py-3 px-4">Item description</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-gray-300">
                    {selectedOrder.items.map((item) => {
                      const itemSubtotal = Number(item.price_at_order) * item.quantity;
                      return (
                        <tr key={item.id} className="hover:bg-gray-800/10">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{item.product?.name || "Deleted Product"}</div>
                            <div className="text-xs font-mono text-gray-500">SKU: {item.product?.sku || "N/A"}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-200">{item.quantity}</td>
                          <td className="py-3.5 px-4 text-right font-mono">${Number(item.price_at_order).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-indigo-400 font-mono">${itemSubtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-indigo-600/10 border border-indigo-500/25 rounded-xl">
              <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Grand Total Amount</span>
              <span className="text-2xl font-extrabold text-indigo-400 font-mono">${Number(selectedOrder.total_amount).toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Close Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Order Modal (Wizard) */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="New Sales Order Setup">
        <div className="space-y-6">
          {/* Stepper Headers */}
          <div className="flex items-center justify-between border-b border-gray-850 pb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center space-x-2">
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    newOrderStep === step
                      ? "bg-indigo-600 text-white shadow-lg glow-indigo"
                      : newOrderStep > step
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-900 text-gray-500 border border-gray-800"
                  }`}
                >
                  {step}
                </span>
                <span
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    newOrderStep === step ? "text-indigo-400 font-bold" : "text-gray-500"
                  }`}
                >
                  {step === 1 ? "Customer" : step === 2 ? "Items Cart" : "Confirm"}
                </span>
                {step < 3 && <ChevronRight className="h-4 w-4 text-gray-700" />}
              </div>
            ))}
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="flex items-center space-x-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Step 1: Select Customer */}
          {newOrderStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Customer Profile</label>
                {customers.length === 0 ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm">
                    No customers found in database. Please create a customer account before setting up orders.
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={handleSelectCustomer}
                    className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none text-sm transition"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Configure Cart Items */}
          {newOrderStep === 2 && (
            <div className="space-y-6">
              {/* Product selector panel */}
              <div className="p-4 bg-gray-950/40 border border-gray-850 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Select & Add Product</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <select
                      value={tempProductId}
                      onChange={(e) => {
                        setTempProductId(e.target.value);
                        setFormError("");
                      }}
                      className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white outline-none text-xs transition"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.quantity_in_stock <= 0}>
                          {p.name} - ${Number(p.price).toFixed(2)} ({p.quantity_in_stock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={tempQuantity}
                      onChange={(e) => {
                        setTempQuantity(e.target.value);
                        setFormError("");
                      }}
                      className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white outline-none text-xs transition"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Order Cart</span>
                </button>
              </div>

              {/* Cart List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order items in cart ({cart.length})</h4>
                {cart.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                    Cart is empty. Add products above.
                  </div>
                ) : (
                  <div className="border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-850">
                    {cart.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between p-3.5 bg-gray-900/10 text-xs">
                        <div>
                          <div className="font-bold text-white">{item.product.name}</div>
                          <div className="text-gray-500 font-mono uppercase mt-0.5">SKU: {item.product.sku}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-gray-300">
                              <span className="font-bold">{item.quantity}</span> x ${Number(item.product.price).toFixed(2)}
                            </div>
                            <div className="font-bold text-indigo-400 mt-0.5">
                              ${(item.quantity * Number(item.product.price)).toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product_id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Running Total */}
              {cart.length > 0 && (
                <div className="flex justify-between items-center p-3.5 bg-gray-950/40 border border-gray-850 rounded-xl text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-wide">Running Order Total</span>
                  <span className="font-extrabold text-white text-sm font-mono">${calculateCartTotal().toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation Summary */}
          {newOrderStep === 3 && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-950/40 border border-gray-850 rounded-xl text-xs space-y-3">
                <h4 className="font-bold text-gray-400 uppercase tracking-wide">Billing Client Details</h4>
                {(() => {
                  const customer = customers.find((c) => c.id === parseInt(selectedCustomerId, 10));
                  return (
                    <div className="text-white">
                      <p className="font-bold text-sm">{customer?.name}</p>
                      <p className="text-gray-400 mt-0.5 font-mono">{customer?.email}</p>
                      <p className="text-gray-400 mt-0.5">Phone: {customer?.phone}</p>
                      <p className="text-gray-450 mt-1">Billing Address: {customer?.address}</p>
                      <p className="text-indigo-400 mt-1 font-semibold">Loyalty points: {customer?.points}</p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase Checklist</h4>
                <div className="border border-gray-850 rounded-xl divide-y divide-gray-850 text-xs">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex justify-between p-3">
                      <span className="text-gray-300">
                        {item.product.name} <span className="text-gray-500 font-bold">x {item.quantity}</span>
                      </span>
                      <span className="font-bold text-white font-mono">
                        ${(item.quantity * Number(item.product.price)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-emerald-600/10 border border-emerald-500/25 rounded-xl">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Order Grand Total</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">${calculateCartTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="flex space-x-3 pt-4 border-t border-gray-850">
            {newOrderStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-sm font-semibold transition"
              >
                Back
              </button>
            )}
            
            {newOrderStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl text-sm font-bold shadow-lg transition duration-200"
              >
                Continue Setup
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitOrder}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg transition duration-200"
              >
                Confirm & Place Order
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
