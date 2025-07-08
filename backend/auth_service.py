"""
نظام المصادقة والأمان - Authentication & Security System
نظام شامل لإدارة المستخدمين والمصادقة
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
import logging

logger = logging.getLogger(__name__)

# إعدادات JWT
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here-make-it-strong")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()

class AuthService:
    """خدمة المصادقة والأمان"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """تشفير كلمة المرور"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """التحقق من كلمة المرور"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def create_access_token(data: Dict[str, Any]) -> str:
        """إنشاء access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """إنشاء refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """التحقق من الرمز المميز"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="انتهت صلاحية الرمز المميز"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="رمز مميز غير صحيح"
            )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """الحصول على المستخدم الحالي من الرمز المميز"""
    token = credentials.credentials
    payload = AuthService.verify_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نوع رمز غير صحيح"
        )
    
    return payload

def require_role(allowed_roles: list):
    """تطلب دور محدد للوصول"""
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول"
            )
        return current_user
    return role_checker

# أدوار المستخدمين
class UserRoles:
    CLIENT = "client"
    LAWYER = "lawyer"
    ADMIN = "admin"

auth_service = AuthService()