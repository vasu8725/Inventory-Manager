from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

@router.post("", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(database.get_db)):
    """
    Place a new sales order.
    
    Performs transactional processing:
    - Verifies product existence and available stock.
    - Atomically reduces product inventory.
    - Automatically calculates grand total amount based on current product unit prices.
    - Adds loyalty points to the customer profile (1 point per $10 spent).
    - Sets order status to "active".
    """
    return crud.create_order(db=db, order_in=order)

@router.get("", response_model=List[schemas.OrderResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    Retrieve past orders listing.
    
    - Preserves orders linked to deleted customers (rendering null customer profiles).
    - Exposes the current status of each order: "active", "settled", or "cancelled".
    """
    orders = crud.get_orders(db, skip=skip, limit=limit)
    return orders

@router.get("/{order_id}", response_model=schemas.OrderResponse)
def read_order(order_id: int, db: Session = Depends(database.get_db)):
    """
    Get order invoice receipt details by ID.
    
    Includes order items, original prices, current status, and optional customer billing details.
    """
    db_order = crud.get_order(db, order_id=order_id)
    if db_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )
    return db_order

@router.delete("/{order_id}", status_code=status.HTTP_200_OK)
def delete_order(order_id: int, db: Session = Depends(database.get_db)):
    """
    Cancel an order (within the 1-week return policy window).
    
    - Restricts action to active orders. Raises HTTP 400 if the order is already settled or cancelled.
    - Transitions order status to "cancelled" (retaining database logs).
    - Restores the product inventory stock counts for all items in the order.
    - Deducts/refunds the loyalty points from the customer profile.
    """
    db_order = crud.delete_order(db=db, order_id=order_id)
    if db_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )
    return {"message": f"Order with ID {order_id} has been cancelled successfully. Inventory restored and customer points adjusted."}
