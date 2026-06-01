import sys
import os
from datetime import datetime, timezone, timedelta

# Dynamically locate and add backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from app.database import SessionLocal, engine, Base
from app import models, schemas
from app.crud import products, customers, orders

def run_tests():
    print("=== RECREATING DATABASE TABLES FOR NEW SCHEMA ===")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database tables recreated successfully.\n")

    db = SessionLocal()
    try:
        # Create test customer and products
        cust = customers.create_customer(db, schemas.CustomerCreate(
            name="Bob Martin", email="bob.martin@gmail.com", phone="+919876543210"
        ))
        p1 = products.create_product(db, schemas.ProductCreate(
            name="iPhone 15", sku="IPHONE15", price=799.99, quantity_in_stock=10
        ))
        p2 = products.create_product(db, schemas.ProductCreate(
            name="AirPods Pro", sku="AIRPODSPRO", price=249.99, quantity_in_stock=20
        ))
        print(f"Created customer: {cust.name} (ID: {cust.id})")
        print(f"Created product 1: {p1.name} (SKU: {p1.sku})")
        print(f"Created product 2: {p2.name} (SKU: {p2.sku})")

        # ----------------- TEST 1: Place Order and Verify Initial Status -----------------
        print("\n--- TEST 1: Placing a new order ---")
        order1 = orders.create_order(db, schemas.OrderCreate(
            customer_id=cust.id,
            items=[schemas.OrderItemCreate(product_id=p1.id, quantity=1)]
        ))
        print(f"Order 1 created. ID: {order1.id}, Status: {order1.status}, Total: {order1.total_amount}")
        assert order1.status == "active", f"Expected 'active', got '{order1.status}'"
        print("PASS: Order initially gets 'active' status.")

        # ----------------- TEST 2: Product Deletion Restrictions -----------------
        print("\n--- TEST 2: Attempting to delete a product in an active order ---")
        try:
            products.delete_product(db, p1.id)
            print("FAIL: Product in active order was deleted!")
            assert False, "Should have failed deleting product in active order"
        except Exception as e:
            print(f"PASS: Correctly prevented deletion of product in active order. Error: {str(e)}")

        print("\nAttempting to delete a product NOT in any active order (AirPods Pro)...")
        deleted_p2 = products.delete_product(db, p2.id)
        assert deleted_p2.is_deleted is True, "Expected is_deleted = True"
        print(f"Product AirPods Pro delete status: is_deleted={deleted_p2.is_deleted}")
        
        # Verify that get_products filters out soft-deleted products
        active_prods = products.get_products(db)
        prod_ids = [p.id for p in active_prods]
        assert p2.id not in prod_ids, "Expected soft-deleted product to be hidden from get_products"
        print("PASS: Soft-deleted product is hidden from product listings.")

        # Verify that get_product can still fetch soft-deleted product details for past invoices
        fetched_p2 = products.get_product(db, p2.id)
        assert fetched_p2 is not None, "Soft-deleted product should still exist in DB"
        print(f"PASS: Soft-deleted product can still be fetched directly by ID ({fetched_p2.name}).")

        # ----------------- TEST 3: Order Cancellation (Before 7 Days) -----------------
        print("\n--- TEST 3: Cancelling an active order ---")
        db.refresh(p1)
        db.refresh(cust)
        initial_stock = p1.quantity_in_stock
        initial_points = cust.points
        print(f"Before cancel: SKU {p1.sku} stock = {initial_stock}, Customer points = {initial_points}")

        cancelled_order1 = orders.delete_order(db, order1.id)
        db.refresh(p1)
        db.refresh(cust)
        print(f"Order status after cancel: {cancelled_order1.status}")
        assert cancelled_order1.status == "cancelled", f"Expected 'cancelled', got '{cancelled_order1.status}'"
        print(f"After cancel: SKU {p1.sku} stock = {p1.quantity_in_stock}, Customer points = {cust.points}")
        assert p1.quantity_in_stock == initial_stock + 1, "Expected stock to be restored"
        assert cust.points == max(0, initial_points - int(order1.total_amount // 10)), "Expected points to be refunded"
        print("PASS: Order status updated to 'cancelled', stock restored, points refunded.")

        # Trying to cancel an already cancelled order
        print("\nAttempting to cancel an already cancelled order...")
        try:
            orders.delete_order(db, order1.id)
            print("FAIL: Cancelled an already cancelled order!")
            assert False, "Should have failed"
        except Exception as e:
            print(f"PASS: Correctly prevented cancelling an already cancelled order. Error: {str(e)}")

        # ----------------- TEST 4: Product Deletion after Order Cancelled -----------------
        print("\n--- TEST 4: Deleting product after order is cancelled ---")
        deleted_p1 = products.delete_product(db, p1.id)
        assert deleted_p1.is_deleted is True, "Expected is_deleted = True"
        print(f"PASS: Product in cancelled order can now be deleted. is_deleted={deleted_p1.is_deleted}")

        # ----------------- TEST 5: Cronjob and 7-day Settling Policy -----------------
        print("\n--- TEST 5: Order settling policy and cron job ---")
        p1.quantity_in_stock = 10
        p1.is_deleted = False
        db.commit()

        # Create active order
        order2 = orders.create_order(db, schemas.OrderCreate(
            customer_id=cust.id,
            items=[schemas.OrderItemCreate(product_id=p1.id, quantity=2)]
        ))
        print(f"Order 2 created. ID: {order2.id}, Status: {order2.status}")

        # Backdate Order 2 to 8 days ago
        order2.created_at = datetime.now(timezone.utc) - timedelta(days=8)
        db.commit()
        db.refresh(order2)
        print(f"Backdated Order 2 created_at to: {order2.created_at}")

        # Create another active order but keep it new (Today)
        order3 = orders.create_order(db, schemas.OrderCreate(
            customer_id=cust.id,
            items=[schemas.OrderItemCreate(product_id=p1.id, quantity=1)]
        ))
        print(f"Order 3 created (Today). ID: {order3.id}, Status: {order3.status}")

        # Run settle_expired_orders
        print("\nRunning settle_expired_orders cron job logic manually...")
        settled_count = orders.settle_expired_orders(db)
        print(f"Cron execution finished. Settled count = {settled_count}")
        assert settled_count == 1, f"Expected 1 order to settle, got {settled_count}"

        db.refresh(order2)
        db.refresh(order3)
        print(f"Order 2 status after cron: {order2.status}")
        print(f"Order 3 status after cron: {order3.status}")
        assert order2.status == "settled", f"Expected 'settled', got {order2.status}"
        assert order3.status == "active", f"Expected 'active', got {order3.status}"
        print("PASS: Cron settled the older order, while keeping today's order active.")

        # ----------------- TEST 6: Cancelling Settled Order Restrictions -----------------
        print("\n--- TEST 6: Attempting to cancel a settled order ---")
        try:
            orders.delete_order(db, order2.id)
            print("FAIL: Settled order was cancelled!")
            assert False, "Should have failed"
        except Exception as e:
            print(f"PASS: Correctly prevented cancellation of settled order. Error: {str(e)}")

        print("\nALL BACKEND TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
