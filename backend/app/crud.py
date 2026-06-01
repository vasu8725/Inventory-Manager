from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from decimal import Decimal
from . import models, schemas

# ==================== PRODUCT CRUD ====================
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    # Check if SKU is unique
    existing_product = get_product_by_sku(db, product.sku)
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists."
        )
    
    db_product = models.Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity_in_stock=product.quantity_in_stock,
        brand=product.brand,
        category=product.category,
        description=product.description
    )
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error: Check constraints failed or duplicate SKU."
        )

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    # If SKU is being updated, verify it is unique
    if "sku" in update_data and update_data["sku"] != db_product.sku:
        existing = get_product_by_sku(db, update_data["sku"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{update_data['sku']}' already exists."
            )
            
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error: Check constraints failed."
        )

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    # Check if product is in any orders
    in_orders = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    if in_orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete product as it is referenced in existing orders. Consider updating its stock to 0 instead."
        )
        
    db.delete(db_product)
    db.commit()
    return db_product


# ==================== CUSTOMER CRUD ====================
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email.strip().lower()).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    # Check if email is unique
    existing_customer = get_customer_by_email(db, customer.email)
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{customer.email}' already exists."
        )
        
    db_customer = models.Customer(
        name=customer.name,
        email=customer.email.strip().lower(),
        phone=customer.phone,
        address=customer.address
    )
    db.add(db_customer)
    try:
        db.commit()
        db.refresh(db_customer)
        return db_customer
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error: Customer duplicate email or invalid data."
        )

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return None
    db.delete(db_customer)
    db.commit()
    return db_customer


# ==================== ORDER CRUD ====================
def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_in: schemas.OrderCreate):
    # Check if customer exists
    customer = get_customer(db, order_in.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {order_in.customer_id} not found."
        )
        
    # Transactional order creation
    total_amount = Decimal("0.00")
    order_items = []
    
    # To prevent race conditions, let's process items
    # and update product stock
    for item in order_in.items:
        # Fetch product and lock the row for update (to prevent race conditions in concurrent requests)
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
        status="Completed"
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
        
    # Refund customer loyalty points
    db_customer = db.query(models.Customer).filter(models.Customer.id == db_order.customer_id).first()
    if db_customer:
        db_customer.points = max(0, db_customer.points - int(db_order.total_amount // 10))

    # Standard practice on order cancellation: restore product inventory!
    # Let's restore the inventory count for all products in this order.
    for item in db_order.items:
        product_query = db.query(models.Product).filter(models.Product.id == item.product_id)
        if db.bind.dialect.name != "sqlite":
            product_query = product_query.with_for_update()
        db_product = product_query.first()
        if db_product:
            db_product.quantity_in_stock += item.quantity
            
    db.delete(db_order)
    try:
        db.commit()
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting/cancelling the order: {str(e)}"
        )


# ==================== DASHBOARD METRICS CRUD ====================
def get_dashboard_summary(db: Session, low_stock_threshold: int = 10):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    low_stock_products = db.query(models.Product).filter(
        models.Product.quantity_in_stock <= low_stock_threshold
    ).all()
    
    return schemas.DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_count=len(low_stock_products),
        low_stock_products=low_stock_products
    )
