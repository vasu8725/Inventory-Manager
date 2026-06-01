from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

# ==================== PRODUCT SCHEMAS ====================
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    sku: str = Field(..., min_length=1, max_length=100, description="Unique stock keeping unit code")
    price: Decimal = Field(..., ge=0, description="Unit price of the product")
    quantity_in_stock: int = Field(..., ge=0, description="Available stock quantity")
    brand: str = Field(default="Generic", max_length=100, description="Product brand name")
    category: str = Field(default="General", max_length=100, description="Product category classification")
    description: Optional[str] = Field(default=None, max_length=500, description="Optional detailed description")

    @field_validator('sku')
    @classmethod
    def validate_sku(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("SKU cannot be empty or whitespace only")
        return cleaned

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(None, ge=0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True


# ==================== CUSTOMER SCHEMAS ====================
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Customer's full name")
    email: str = Field(..., min_length=3, max_length=255, description="Unique email address")
    phone: str = Field(..., min_length=1, max_length=50, description="Phone number")
    address: str = Field(default="No Address Provided", max_length=500, description="Physical billing address")
    points: int = Field(default=0, ge=0, description="Loyalty program points")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        import re
        cleaned = v.strip().lower()
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, cleaned):
            raise ValueError("Invalid email address format")
        return cleaned

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    address: Optional[str] = Field(default="No Address Provided", max_length=500)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        import re
        cleaned = v.strip().lower()
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, cleaned):
            raise ValueError("Invalid email address format")
        return cleaned

class CustomerResponse(CustomerBase):
    id: int

    class Config:
        from_attributes = True


# ==================== ORDER ITEM SCHEMAS ====================
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity ordered (must be positive)")

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_order: Decimal
    product: ProductResponse

    class Config:
        from_attributes = True


# ==================== ORDER SCHEMAS ====================
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1, description="List of items in the order")

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    total_amount: Decimal
    created_at: datetime
    status: str
    customer: CustomerResponse
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


# ==================== DASHBOARD SUMMARY SCHEMA ====================
class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_count: int
    low_stock_products: List[ProductResponse]
