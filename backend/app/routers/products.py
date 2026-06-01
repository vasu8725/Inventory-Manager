from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

@router.post("", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    """
    Register a new product in the inventory database.
    
    Verifies that the SKU code is unique. Raises HTTP 400 if the SKU already exists.
    """
    return crud.create_product(db=db, product=product)

@router.get("", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    Retrieve active products list.
    
    Filters out soft-deleted products (where `is_deleted` is true). Supports pagination.
    """
    products = crud.get_products(db, skip=skip, limit=limit)
    return products

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def read_product(product_id: int, db: Session = Depends(database.get_db)):
    """
    Get detailed product profile by ID.
    
    Can retrieve both active and soft-deleted products to ensure past order invoices display product details correctly.
    """
    db_product = crud.get_product(db, product_id=product_id)
    if db_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    return db_product

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(database.get_db)):
    """
    Update product attributes (e.g. price, brand, stock quantity).
    
    Verifies that the new SKU code remains unique if it is being modified.
    """
    db_product = crud.update_product(db=db, product_id=product_id, product_update=product_update)
    if db_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    return db_product

@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    """
    Soft-delete a product from the catalog.
    
    - Toggles the `is_deleted` flag to `True` on the product record.
    - Prevents physical deletion from the database to preserve historical invoices.
    - Raises HTTP 400 if the product is currently referenced in any active orders.
    """
    db_product = crud.delete_product(db=db, product_id=product_id)
    if db_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    return {"message": f"Product with ID {product_id} has been soft-deleted. Historic sales data is preserved."}
