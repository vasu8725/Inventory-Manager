from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)

@router.post("", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(database.get_db)):
    """
    Register a new customer.
    
    Verifies that:
    - Email is unique and has valid DNS MX (Mail Exchanger) records.
    - Phone number is a valid carrier format (supports India/US).
    """
    return crud.create_customer(db=db, customer=customer)

@router.get("", response_model=List[schemas.CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    Retrieve a list of customers.
    
    Supports pagination via `skip` and `limit`.
    """
    customers = crud.get_customers(db, skip=skip, limit=limit)
    return customers

@router.get("/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(customer_id: int, db: Session = Depends(database.get_db)):
    """
    Get customer details by customer ID.
    """
    db_customer = crud.get_customer(db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found."
        )
    return db_customer

@router.delete("/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(customer_id: int, db: Session = Depends(database.get_db)):
    """
    Delete a customer.
    
    NOTE: Associated orders are PRESERVED (no cascade delete). Their `customer_id` is set to NULL
    to maintain transaction history and inventory integrity.
    """
    db_customer = crud.delete_customer(db=db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found."
        )
    return {"message": f"Customer with ID {customer_id} has been deleted successfully."}
