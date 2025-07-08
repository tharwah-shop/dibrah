"""
نماذج المستخدمين - User Models
نماذج شاملة لإدارة المستخدمين والمصادقة
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    CLIENT = "client"
    LAWYER = "lawyer"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

# نماذج التسجيل وتسجيل الدخول
class UserRegister(BaseModel):
    """نموذج تسجيل مستخدم جديد"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    phone: str = Field(..., pattern=r"^5[0-9]{8}$")
    role: UserRole
    
    # بيانات إضافية للمحامين
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    license_number: Optional[str] = None
    bio: Optional[str] = None

class UserLogin(BaseModel):
    """نموذج تسجيل الدخول"""
    email: EmailStr
    password: str

class PasswordReset(BaseModel):
    """نموذج إعادة تعيين كلمة المرور"""
    email: EmailStr

class PasswordUpdate(BaseModel):
    """نموذج تحديث كلمة المرور"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

# نماذج المستخدمين
class User(BaseModel):
    """نموذج المستخدم الأساسي"""
    id: str
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login: Optional[datetime] = None
    email_verified: bool = False
    phone_verified: bool = False

class Client(User):
    """نموذج العميل"""
    appointments_count: int = 0
    total_spent: float = 0.0
    preferred_language: str = "ar"
    
class Lawyer(User):
    """نموذج المحامي"""
    specialization: str
    experience_years: int
    license_number: str
    bio: str
    rating: float = 0.0
    reviews_count: int = 0
    hourly_rate: float = 100.0
    is_verified: bool = False
    available: bool = True
    languages: List[str] = ["العربية"]
    certificates: List[str] = []
    education: List[str] = []
    
    # إحصائيات
    total_appointments: int = 0
    completed_appointments: int = 0
    total_earnings: float = 0.0
    
    # ساعات العمل
    working_hours: dict = {
        "sunday": {"start": "09:00", "end": "17:00", "available": True},
        "monday": {"start": "09:00", "end": "17:00", "available": True},
        "tuesday": {"start": "09:00", "end": "17:00", "available": True},
        "wednesday": {"start": "09:00", "end": "17:00", "available": True},
        "thursday": {"start": "09:00", "end": "17:00", "available": True},
        "friday": {"start": "14:00", "end": "17:00", "available": True},
        "saturday": {"start": "09:00", "end": "17:00", "available": False}
    }

class Admin(User):
    """نموذج المدير"""
    permissions: List[str] = []
    department: Optional[str] = None

# نماذج الاستجابة
class TokenResponse(BaseModel):
    """استجابة الرمز المميز"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: User

class UserResponse(BaseModel):
    """استجابة بيانات المستخدم"""
    user: User
    message: str = "تم بنجاح"

class ProfileUpdate(BaseModel):
    """تحديث الملف الشخصي"""
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    
    # للمحامين
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None
    available: Optional[bool] = None
    languages: Optional[List[str]] = None
    specialization: Optional[str] = None

# إحصائيات المستخدمين
class UserStats(BaseModel):
    """إحصائيات المستخدمين"""
    total_users: int
    total_clients: int
    total_lawyers: int
    total_admins: int
    active_users: int
    new_users_today: int
    new_users_this_month: int

class LawyerStats(BaseModel):
    """إحصائيات المحامي"""
    total_appointments: int
    completed_appointments: int
    pending_appointments: int
    cancelled_appointments: int
    total_earnings: float
    this_month_earnings: float
    average_rating: float
    total_reviews: int

class ClientStats(BaseModel):
    """إحصائيات العميل"""
    total_appointments: int
    completed_appointments: int
    pending_appointments: int
    cancelled_appointments: int
    total_spent: float
    favorite_lawyers: List[str]