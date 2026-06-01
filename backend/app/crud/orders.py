from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from decimal import Decimal
from .. import models, schemas

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_in: schemas.OrderCreate):
    # Check if customer exists
    customer = db.query(models.Customer).filter(models.Customer.id == order_in.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {order_in.customer_id} not found."
        )
        
    # Transactional order creation
    total_amount = Decimal("0.00")
    order_items = []
    
    # Process items and update product stock
    for item in order_in.items:
        product_query = db.query(models.Product).filter(models.Product.id == item.product_id)
        if db.bind.dialect.name != "sqlite":
            product_query = product_query.with_for_update()
        db_product = product_query.first()
        
        if not db_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} not found."
            )
            
        # Check stock sufficiency
        if db_product.quantity_in_stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory for product '{db_product.name}' (SKU: {db_product.sku}). Available: {db_product.quantity_in_stock}, Requested: {item.quantity}."
            )
            
        # Reduce stock
        db_product.quantity_in_stock -= item.quantity
        
        # Calculate subtotal using product's current price
        subtotal = db_product.price * item.quantity
        total_amount += subtotal
        
        # Create OrderItem object
        db_order_item = models.OrderItem(
            product_id=db_product.id,
            quantity=item.quantity,
            price_at_order=db_product.price
        )
        order_items.append(db_order_item)
        
    # Update customer loyalty points (1 point per $10 of order total)
    customer.points += int(total_amount // 10)

    # Create the main order
    db_order = models.Order(
        customer_id=order_in.customer_id,
        total_amount=total_amount,
        status="active"
    )
    db.add(db_order)
    db.flush()  # Generates the db_order.id
    
    # Associate items with order and add them
    for db_order_item in order_items:
        db_order_item.order_id = db_order.id
        db.add(db_order_item)
        
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while placing the order: {str(e)}"
        )

def delete_order(db: Session, order_id: int):
    # Retrieve order
    db_order = get_order(db, order_id)
    if not db_order:
        return None

    # Check current status
    if db_order.status == "settled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled/deleted as it has already settled."
        )
    elif db_order.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order has already been cancelled."
        )

    # Enforce 1-week cancellation policy (7 days)
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    created_at = db_order.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    else:
        created_at = created_at.astimezone(timezone.utc)

    if now - created_at > timedelta(days=7):
        db_order.status = "settled"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled after 1 week of creation (Return policy expired)."
        )
        
    # Refund customer loyalty points (if customer still exists)
    if db_order.customer_id:
        db_customer = db.query(models.Customer).filter(models.Customer.id == db_order.customer_id).first()
        if db_customer:
            db_customer.points = max(0, db_customer.points - int(db_order.total_amount // 10))

    # Restore product inventory count
    for item in db_order.items:
        product_query = db.query(models.Product).filter(models.Product.id == item.product_id)
        if db.bind.dialect.name != "sqlite":
            product_query = product_query.with_for_update()
        db_product = product_query.first()
        if db_product:
            db_product.quantity_in_stock += item.quantity
            
    db_order.status = "cancelled"
    try:
        db.commit()
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting/cancelling the order: {str(e)}"
        )

# ==================== CRON & BATCH JOBS ====================
import logging
logger = logging.getLogger(__name__)

def settle_expired_orders(db: Session):
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    active_orders = db.query(models.Order).filter(models.Order.status == "active").all()
    settled_count = 0
    
    for order in active_orders:
        created_at = order.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        else:
            created_at = created_at.astimezone(timezone.utc)
            
        if now - created_at >= timedelta(days=7):
            order.status = "settled"
            settled_count += 1
            
    if settled_count > 0:
        try:
            db.commit()
            logger.info(f"Settle orders cron: Settled {settled_count} active orders older than 7 days.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to commit settled orders in cron: {str(e)}")
            
    return settled_count

async def settle_orders_cron():
    import asyncio
    from ..database import SessionLocal
    
    logger.info("Starting order settling background cron task loop...")
    while True:
        try:
            db = SessionLocal()
            try:
                settle_expired_orders(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in settle_orders_cron run: {str(e)}")
            
        # Run every hour
        await asyncio.sleep(3600)

# ==================== DASHBOARD METRICS ====================
def get_dashboard_summary(db: Session, low_stock_threshold: int = 10):
    total_products = db.query(models.Product).filter(models.Product.is_deleted == False).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    low_stock_products = db.query(models.Product).filter(
        models.Product.is_deleted == False,
        models.Product.quantity_in_stock <= low_stock_threshold
    ).all()
    
    return schemas.DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_count=len(low_stock_products),
        low_stock_products=low_stock_products
    )
