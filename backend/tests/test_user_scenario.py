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

def run_user_scenario():
    print("=== RUNNING USER SCENARIO: ORDER IPHONE & DELETE AFTER SETTLE ===")
    db = SessionLocal()
    try:
        # 1. Setup Customer and iPhone with exactly 1 stock
        cust = db.query(models.Customer).filter(models.Customer.email == "user.test@gmail.com").first()
        if not cust:
            cust = customers.create_customer(db, schemas.CustomerCreate(
                name="Jane User", email="user.test@gmail.com", phone="+919876543210"
            ))
            
        # Ensure clean SKU
        iphone = db.query(models.Product).filter(models.Product.sku == "IPHONE-ZERO").first()
        if iphone:
            # Clean up old records or references for a clean test run
            db.query(models.OrderItem).filter(models.OrderItem.product_id == iphone.id).delete()
            db.delete(iphone)
            db.commit()

        iphone = products.create_product(db, schemas.ProductCreate(
            name="iPhone Pro Zero", sku="IPHONE-ZERO", price=999.99, quantity_in_stock=1
        ))
        
        print(f"Initial setup completed.")
        print(f"- Customer: {cust.name} (ID: {cust.id})")
        print(f"- Product: {iphone.name} (SKU: {iphone.sku}, Stock: {iphone.quantity_in_stock})")

        # 2. Make an order for the iPhone
        print("\nStep 2: Placing order for the iPhone...")
        order = orders.create_order(db, schemas.OrderCreate(
            customer_id=cust.id,
            items=[schemas.OrderItemCreate(product_id=iphone.id, quantity=1)]
        ))
        db.refresh(iphone)
        print(f"Order created successfully. ID: {order.id}, Status: {order.status}")
        print(f"iPhone stock after order: {iphone.quantity_in_stock} (Expected: 0)")
        assert iphone.quantity_in_stock == 0, "iPhone stock should be 0"

        # 3. Attempt to delete the zero stock iPhone while order is active
        print("\nStep 3: Attempting to delete the zero-stock iPhone (Order is active)...")
        try:
            products.delete_product(db, iphone.id)
            print("FAIL: Product in active order was deleted!")
            assert False, "Should have blocked product deletion"
        except Exception as e:
            print(f"PASS: Correctly blocked deletion. Error: {str(e)}")

        # 4. Settle the order (simulate daily cron job by backdating and running settle function)
        print("\nStep 4: Settling the order...")
        order.created_at = datetime.now(timezone.utc) - timedelta(days=8)
        db.commit()
        
        settled_count = orders.settle_expired_orders(db)
        db.refresh(order)
        print(f"Settle cron completed. Settled count: {settled_count}")
        print(f"Order status: {order.status} (Expected: settled)")
        assert order.status == "settled", "Order should be settled"

        # 5. Delete the iPhone now that the order is settled
        print("\nStep 5: Deleting the iPhone after settling the order...")
        deleted_iphone = products.delete_product(db, iphone.id)
        db.refresh(deleted_iphone)
        print(f"iPhone deletion result: is_deleted={deleted_iphone.is_deleted}")
        assert deleted_iphone.is_deleted is True, "iPhone should be soft deleted"
        print("PASS: Soft-deleted zero-stock iPhone successfully after settling its active orders.")

        print("\nUSER SCENARIO COMPLETED AND VERIFIED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    run_user_scenario()
