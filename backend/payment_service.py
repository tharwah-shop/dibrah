"""
خدمة الدفع - MyFatoorah Integration
نظام دفع متكامل للاستشارات القانونية
"""

import os
import httpx
import uuid
from typing import Dict, Optional, Any
from datetime import datetime
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

class MyFatoorahService:
    """خدمة ماي فاتورة للدفع الإلكتروني"""
    
    def __init__(self):
        self.api_key = os.getenv("MYFATOORAH_API_KEY")
        self.base_url = os.getenv("MYFATOORAH_BASE_URL", "https://apitest.myfatoorah.com")
        self.success_url = os.getenv("MYFATOORAH_SUCCESS_URL", "http://localhost:3000/payment/success")
        self.error_url = os.getenv("MYFATOORAH_ERROR_URL", "http://localhost:3000/payment/error")
        self.min_amount = Decimal(os.getenv("MIN_PAYMENT_AMOUNT", "50"))
        self.max_amount = Decimal(os.getenv("MAX_PAYMENT_AMOUNT", "50000"))
        
        # In test mode, we don't require an API key
        if not self.api_key:
            logger.warning("MyFatoorah API key not found in environment variables. Running in test mode.")
            self.api_key = "test_api_key"
    
    def _get_headers(self) -> Dict[str, str]:
        """إعداد headers للطلبات"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def validate_amount(self, amount: float) -> bool:
        """التحقق من صحة المبلغ"""
        amount_decimal = Decimal(str(amount))
        return self.min_amount <= amount_decimal <= self.max_amount
    
    async def create_payment_session(
        self, 
        amount: float, 
        customer_name: str,
        customer_email: str,
        customer_mobile: str,
        appointment_id: str,
        lawyer_name: str,
        consultation_type: str
    ) -> Dict[str, Any]:
        """إنشاء جلسة دفع جديدة"""
        
        try:
            # التحقق من صحة المبلغ
            if not self.validate_amount(amount):
                raise ValueError(f"المبلغ يجب أن يكون بين {self.min_amount} و {self.max_amount} ريال")
            
            # في وضع الاختبار، نعيد استجابة وهمية
            if self.api_key == "test_api_key":
                logger.info(f"Test mode: Creating payment session for appointment {appointment_id}")
                return {
                    "success": True,
                    "payment_url": f"{self.success_url}?appointment_id={appointment_id}",
                    "invoice_id": f"test_invoice_{uuid.uuid4()}",
                    "appointment_id": appointment_id,
                    "amount": amount,
                    "currency": "SAR"
                }
            
            # إعداد بيانات الدفع
            payment_data = {
                "CustomerName": customer_name,
                "InvoiceValue": amount,
                "DisplayCurrencyIso": "SAR",
                "MobileCountryCode": "+966",
                "CustomerMobile": customer_mobile,
                "CustomerEmail": customer_email,
                "CallBackUrl": f"{self.success_url}?appointment_id={appointment_id}",
                "ErrorUrl": f"{self.error_url}?appointment_id={appointment_id}",
                "Language": "ar",
                "CustomerReference": appointment_id,
                "CustomerCivilId": "",
                "UserDefinedField": f"استشارة قانونية مع {lawyer_name} - {consultation_type}",
                "ExpiryDate": "",
                "SourceInfo": "منصة دبرة للاستشارات القانونية",
                "CustomerAddress": {
                    "Block": "",
                    "Street": "",
                    "HouseBuildingNo": "",
                    "Address": "المملكة العربية السعودية",
                    "AddressInstructions": ""
                },
                "InvoiceItems": [
                    {
                        "ItemName": f"استشارة قانونية - {consultation_type}",
                        "Quantity": 1,
                        "UnitPrice": amount,
                        "Weight": 0,
                        "Width": 0,
                        "Height": 0,
                        "Depth": 0
                    }
                ]
            }
            
            # إرسال الطلب لماي فاتورة
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/SendPayment",
                    json=payment_data,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                response.raise_for_status()
                result = response.json()
                
                if result.get("IsSuccess"):
                    payment_url = result["Data"]["InvoiceURL"]
                    invoice_id = result["Data"]["InvoiceId"]
                    
                    logger.info(f"Payment session created successfully for appointment {appointment_id}")
                    
                    return {
                        "success": True,
                        "payment_url": payment_url,
                        "invoice_id": invoice_id,
                        "appointment_id": appointment_id,
                        "amount": amount,
                        "currency": "SAR"
                    }
                else:
                    error_message = result.get("Message", "خطأ غير معروف في إنشاء جلسة الدفع")
                    logger.error(f"MyFatoorah API error: {error_message}")
                    return {
                        "success": False,
                        "error": error_message
                    }
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in payment creation: {e}")
            return {
                "success": False,
                "error": "خطأ في الاتصال بنظام الدفع"
            }
        except Exception as e:
            logger.error(f"Unexpected error in payment creation: {e}")
            return {
                "success": False,
                "error": "حدث خطأ غير متوقع في إنشاء جلسة الدفع"
            }
    
    async def verify_payment(self, payment_id: str) -> Dict[str, Any]:
        """التحقق من حالة الدفع"""
        
        try:
            # في وضع الاختبار، نعيد استجابة وهمية
            if self.api_key == "test_api_key":
                logger.info(f"Test mode: Verifying payment {payment_id}")
                return {
                    "success": True,
                    "is_paid": True,
                    "payment_status": "Paid",
                    "invoice_id": f"test_invoice_{uuid.uuid4()}",
                    "invoice_value": 300,
                    "customer_reference": "test_reference",
                    "payment_method": "Test Payment",
                    "transaction_date": datetime.now().isoformat()
                }
            
            # طلب التحقق من الدفع
            verification_data = {
                "Key": payment_id,
                "KeyType": "PaymentId"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/GetPaymentStatus",
                    json=verification_data,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                response.raise_for_status()
                result = response.json()
                
                if result.get("IsSuccess"):
                    payment_data = result["Data"]
                    
                    # تحديد حالة الدفع
                    invoice_status = payment_data.get("InvoiceStatus")
                    is_paid = invoice_status == "Paid"
                    
                    return {
                        "success": True,
                        "is_paid": is_paid,
                        "payment_status": invoice_status,
                        "invoice_id": payment_data.get("InvoiceId"),
                        "invoice_value": payment_data.get("InvoiceValue"),
                        "customer_reference": payment_data.get("CustomerReference"),
                        "payment_method": payment_data.get("InvoiceTransactions", [{}])[0].get("PaymentGateway") if payment_data.get("InvoiceTransactions") else None,
                        "transaction_date": payment_data.get("CreatedDate")
                    }
                else:
                    error_message = result.get("Message", "خطأ في التحقق من حالة الدفع")
                    return {
                        "success": False,
                        "error": error_message
                    }
                    
        except Exception as e:
            logger.error(f"Error verifying payment: {e}")
            return {
                "success": False,
                "error": "خطأ في التحقق من حالة الدفع"
            }
    
    async def refund_payment(self, payment_id: str, amount: float, reason: str = "إلغاء الموعد") -> Dict[str, Any]:
        """استرداد المبلغ"""
        
        try:
            # في وضع الاختبار، نعيد استجابة وهمية
            if self.api_key == "test_api_key":
                logger.info(f"Test mode: Refunding payment {payment_id}")
                return {
                    "success": True,
                    "refund_id": f"test_refund_{uuid.uuid4()}",
                    "amount": amount,
                    "status": "تم الاسترداد بنجاح"
                }
            
            refund_data = {
                "KeyType": "PaymentId",
                "Key": payment_id,
                "RefundChargeOnCustomer": False,
                "ServiceChargeOnCustomer": False,
                "Amount": amount,
                "Comment": reason
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/MakeRefund",
                    json=refund_data,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                response.raise_for_status()
                result = response.json()
                
                if result.get("IsSuccess"):
                    return {
                        "success": True,
                        "refund_id": result["Data"]["RefundId"],
                        "amount": amount,
                        "status": "تم الاسترداد بنجاح"
                    }
                else:
                    error_message = result.get("Message", "خطأ في عملية الاسترداد")
                    return {
                        "success": False,
                        "error": error_message
                    }
                    
        except Exception as e:
            logger.error(f"Error processing refund: {e}")
            return {
                "success": False,
                "error": "خطأ في عملية الاسترداد"
            }

# إنشاء instance من الخدمة
myfatoorah_service = MyFatoorahService()