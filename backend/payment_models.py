"""
نماذج الدفع - Payment Models
نماذج قاعدة البيانات لإدارة المدفوعات
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal, Dict, Any
from datetime import datetime
from decimal import Decimal

class PaymentRequest(BaseModel):
    """طلب إنشاء دفع جديد"""
    appointment_id: str
    amount: float = Field(..., ge=50, le=50000, description="المبلغ بالريال السعودي")
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_email: EmailStr
    customer_mobile: str = Field(..., pattern=r"^5[0-9]{8}$", description="رقم الجوال السعودي")
    consultation_type: str
    lawyer_name: str

class PaymentResponse(BaseModel):
    """استجابة إنشاء الدفع"""
    success: bool
    payment_url: Optional[str] = None
    invoice_id: Optional[str] = None
    appointment_id: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "SAR"
    error: Optional[str] = None

class PaymentVerification(BaseModel):
    """التحقق من الدفع"""
    payment_id: str

class PaymentStatus(BaseModel):
    """حالة الدفع"""
    success: bool
    is_paid: Optional[bool] = None
    payment_status: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_value: Optional[float] = None
    customer_reference: Optional[str] = None
    payment_method: Optional[str] = None
    transaction_date: Optional[str] = None
    error: Optional[str] = None

class RefundRequest(BaseModel):
    """طلب الاسترداد"""
    payment_id: str
    amount: float
    reason: str = "إلغاء الموعد"

class RefundResponse(BaseModel):
    """استجابة الاسترداد"""
    success: bool
    refund_id: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    error: Optional[str] = None

class PaymentRecord(BaseModel):
    """سجل الدفع في قاعدة البيانات"""
    id: str
    appointment_id: str
    invoice_id: Optional[str] = None
    payment_id: Optional[str] = None
    amount: float
    currency: str = "SAR"
    status: Literal["pending", "paid", "failed", "refunded", "expired"] = "pending"
    payment_method: Optional[str] = None
    gateway: str = "myfatoorah"
    customer_name: str
    customer_email: str
    customer_mobile: str
    lawyer_name: str
    consultation_type: str
    payment_url: Optional[str] = None
    transaction_date: Optional[datetime] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None

class WebhookPayload(BaseModel):
    """بيانات Webhook من ماي فاتورة"""
    InvoiceId: str
    PaymentId: str
    InvoiceStatus: str
    CustomerReference: str
    InvoiceValue: float
    PaymentGateway: Optional[str] = None
    TransactionDate: Optional[str] = None