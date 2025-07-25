from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import os
from pymongo import MongoClient
from bson import ObjectId
import logging

# استيراد خدمات الدفع
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from payment_service import myfatoorah_service
from payment_models import (
    PaymentRequest, PaymentResponse, PaymentVerification, 
    PaymentStatus, RefundRequest, RefundResponse, 
    PaymentRecord, WebhookPayload
)

# استيراد نظام المصادقة
from auth_service import auth_service, get_current_user, require_role, UserRoles
from user_models import (
    UserRegister, UserLogin, PasswordReset, PasswordUpdate,
    User, Client, Lawyer, Admin, TokenResponse, UserResponse,
    ProfileUpdate, UserStats, LawyerStats, ClientStats,
    UserRole, UserStatus
)

# إعداد السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Debra Legal Consultations API")

# إعداد CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# الاتصال بقاعدة البيانات
try:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
    client = MongoClient(mongo_url)
    db = client['debra_legal']
    
    # مجموعات قاعدة البيانات
    lawyers_collection = db['lawyers']
    appointments_collection = db['appointments']
    consultations_collection = db['consultations']
    users_collection = db['users']
    payments_collection = db['payments']
    sessions_collection = db['sessions']  # جلسات المستخدمين
    notifications_collection = db['notifications']  # الإشعارات
    reviews_collection = db['reviews']  # التقييمات
    admin_logs_collection = db['admin_logs']  # سجلات الإدارة
    
    logger.info("تم الاتصال بقاعدة البيانات بنجاح")
except Exception as e:
    logger.error(f"خطأ في الاتصال بقاعدة البيانات: {e}")

# النماذج
class Lawyer(BaseModel):
    id: str
    name: str
    specialization: str
    description: str
    rating: float
    price: int
    image: Optional[str] = None
    available: bool = True
    experience_years: int
    languages: List[str]
    certificates: List[str]

class Appointment(BaseModel):
    id: str
    lawyer_id: str
    client_id: str
    date: str
    time: str
    consultation_type: str
    status: str
    notes: Optional[str] = None
    created_at: datetime

class Consultation(BaseModel):
    id: str
    lawyer_id: str
    client_id: str
    consultation_type: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    messages: List[dict] = []

class User(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    user_type: str  # client or lawyer
    created_at: datetime

# بيانات تجريبية للمحامين
sample_lawyers = [
    {
        "id": str(uuid.uuid4()),
        "name": "المحامي أحمد محمد",
        "specialization": "القانون التجاري",
        "description": "محامٍ متخصص في القانون التجاري والشركات مع خبرة 15 عام",
        "rating": 4.8,
        "price": 300,
        "image": "https://images.pexels.com/photos/32892535/pexels-photo-32892535.jpeg",
        "available": True,
        "experience_years": 15,
        "languages": ["العربية", "الإنجليزية"],
        "certificates": ["بكالوريوس الحقوق", "ماجستير القانون التجاري"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "المحامية فاطمة علي",
        "specialization": "قانون الأسرة",
        "description": "محامية متخصصة في قضايا الأسرة والأحوال الشخصية",
        "rating": 4.9,
        "price": 250,
        "image": "https://images.pexels.com/photos/7876051/pexels-photo-7876051.jpeg",
        "available": True,
        "experience_years": 12,
        "languages": ["العربية", "الإنجليزية", "الفرنسية"],
        "certificates": ["بكالوريوس الحقوق", "دبلوم قانون الأسرة"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "المحامي عبدالرحمن سعد",
        "specialization": "القانون الجنائي",
        "description": "محامٍ متخصص في القضايا الجنائية والدفاع الجنائي",
        "rating": 4.7,
        "price": 350,
        "image": "https://images.unsplash.com/photo-1719561940627-8de702b6256e",
        "available": True,
        "experience_years": 18,
        "languages": ["العربية", "الإنجليزية"],
        "certificates": ["بكالوريوس الحقوق", "ماجستير القانون الجنائي"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "المحامية نور الهدى",
        "specialization": "قانون العمل",
        "description": "محامية متخصصة في قضايا العمل والتأمينات الاجتماعية",
        "rating": 4.6,
        "price": 280,
        "image": "https://images.unsplash.com/photo-1589994965851-a8f479c573a9",
        "available": True,
        "experience_years": 10,
        "languages": ["العربية", "الإنجليزية"],
        "certificates": ["بكالوريوس الحقوق", "دبلوم قانون العمل"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "المحامي خالد الأحمد",
        "specialization": "القانون العقاري",
        "description": "محامٍ متخصص في القضايا العقارية والتطوير العقاري",
        "rating": 4.8,
        "price": 320,
        "image": "https://images.pexels.com/photos/159832/justice-law-case-hearing-159832.jpeg",
        "available": True,
        "experience_years": 14,
        "languages": ["العربية", "الإنجليزية"],
        "certificates": ["بكالوريوس الحقوق", "ماجستير القانون العقاري"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "المحامية سارة محمود",
        "specialization": "قانون الملكية الفكرية",
        "description": "محامية متخصصة في براءات الاختراع والملكية الفكرية",
        "rating": 4.9,
        "price": 400,
        "image": "https://images.pexels.com/photos/7876051/pexels-photo-7876051.jpeg",
        "available": True,
        "experience_years": 8,
        "languages": ["العربية", "الإنجليزية", "الألمانية"],
        "certificates": ["بكالوريوس الحقوق", "ماجستير الملكية الفكرية"]
    }
]

# إدراج البيانات التجريبية
@app.on_event("startup")
async def startup_event():
    """إدراج البيانات التجريبية عند بدء التشغيل"""
    try:
        # التحقق من وجود بيانات محامين
        if lawyers_collection.count_documents({}) == 0:
            lawyers_collection.insert_many(sample_lawyers)
            logger.info("تم إدراج البيانات التجريبية للمحامين")
        
        # إنشاء مستخدم مدير افتراضي
        admin_exists = users_collection.find_one({"role": "admin"})
        if not admin_exists:
            admin_id = str(uuid.uuid4())
            admin_password = auth_service.hash_password("admin123456")
            
            admin_user = {
                "id": admin_id,
                "name": "مدير النظام",
                "email": "admin@debra-legal.com",
                "phone": "501234567",
                "role": "admin",
                "status": "active",
                "avatar": None,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "last_login": None,
                "email_verified": True,
                "phone_verified": True,
                "password_hash": admin_password,
                "permissions": ["all"],
                "department": "إدارة النظام"
            }
            
            users_collection.insert_one(admin_user)
            logger.info("تم إنشاء مستخدم مدير افتراضي - admin@debra-legal.com / admin123456")
            
    except Exception as e:
        logger.error(f"خطأ في إدراج البيانات التجريبية: {e}")

# ========================
# نقاط النهاية لإدارة المستخدمين (للمدراء)
# ========================

@app.get("/api/admin/users", response_model=List[User])
async def get_all_users(
    page: int = 1,
    limit: int = 10,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    current_user: dict = Depends(require_role([UserRoles.ADMIN]))
):
    """جلب جميع المستخدمين (للمدراء فقط)"""
    try:
        # بناء معايير البحث
        filter_criteria = {}
        if role:
            filter_criteria["role"] = role.value
        if status:
            filter_criteria["status"] = status.value
        
        # التصفح مع التقسيم
        skip = (page - 1) * limit
        users = list(users_collection.find(
            filter_criteria,
            {"_id": 0, "password_hash": 0}
        ).skip(skip).limit(limit).sort("created_at", -1))
        
        return [User(**user) for user in users]
        
    except Exception as e:
        logger.error(f"خطأ في جلب المستخدمين: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب المستخدمين"
        )

@app.get("/api/admin/stats", response_model=UserStats)
async def get_user_stats(current_user: dict = Depends(require_role([UserRoles.ADMIN]))):
    """إحصائيات المستخدمين للمدراء"""
    try:
        total_users = users_collection.count_documents({})
        total_clients = users_collection.count_documents({"role": UserRole.CLIENT})
        total_lawyers = users_collection.count_documents({"role": UserRole.LAWYER})
        total_admins = users_collection.count_documents({"role": UserRole.ADMIN})
        active_users = users_collection.count_documents({"status": UserStatus.ACTIVE})
        
        # المستخدمين الجدد اليوم
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        new_users_today = users_collection.count_documents({
            "created_at": {"$gte": today_start}
        })
        
        # المستخدمين الجدد هذا الشهر
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_users_this_month = users_collection.count_documents({
            "created_at": {"$gte": month_start}
        })
        
        return UserStats(
            total_users=total_users,
            total_clients=total_clients,
            total_lawyers=total_lawyers,
            total_admins=total_admins,
            active_users=active_users,
            new_users_today=new_users_today,
            new_users_this_month=new_users_this_month
        )
        
    except Exception as e:
        logger.error(f"خطأ في جلب إحصائيات المستخدمين: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب الإحصائيات"
        )

@app.put("/api/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    new_status: UserStatus,
    current_user: dict = Depends(require_role([UserRoles.ADMIN]))
):
    """تحديث حالة المستخدم"""
    try:
        # التحقق من وجود المستخدم
        user_record = users_collection.find_one({"id": user_id})
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="المستخدم غير موجود"
            )
        
        # تحديث الحالة
        users_collection.update_one(
            {"id": user_id},
            {"$set": {
                "status": new_status.value,
                "updated_at": datetime.now()
            }}
        )
        
        # تسجيل الإجراء
        admin_logs_collection.insert_one({
            "admin_id": current_user["user_id"],
            "action": "update_user_status",
            "target_user_id": user_id,
            "details": {"new_status": new_status.value},
            "timestamp": datetime.now()
        })
        
        return {"message": f"تم تحديث حالة المستخدم إلى {new_status.value}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"خطأ في تحديث حالة المستخدم: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في تحديث حالة المستخدم"
        )

@app.post("/api/admin/lawyers/{lawyer_id}/verify")
async def verify_lawyer(
    lawyer_id: str,
    current_user: dict = Depends(require_role([UserRoles.ADMIN]))
):
    """التحقق من المحامي وتفعيل حسابه"""
    try:
        # التحقق من وجود المحامي
        lawyer_record = users_collection.find_one({
            "id": lawyer_id,
            "role": UserRole.LAWYER
        })
        if not lawyer_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="المحامي غير موجود"
            )
        
        # تحديث حالة التحقق
        users_collection.update_one(
            {"id": lawyer_id},
            {"$set": {
                "is_verified": True,
                "status": UserStatus.ACTIVE,
                "updated_at": datetime.now()
            }}
        )
        
        # إضافة إلى مجموعة المحامين
        lawyer_data = lawyer_record.copy()
        lawyer_data.pop("_id", None)
        lawyer_data.pop("password_hash", None)
        lawyer_data["image"] = lawyer_data.get("avatar")
        lawyers_collection.update_one(
            {"id": lawyer_id},
            {"$set": lawyer_data},
            upsert=True
        )
        
        # تسجيل الإجراء
        admin_logs_collection.insert_one({
            "admin_id": current_user["user_id"],
            "action": "verify_lawyer",
            "target_user_id": lawyer_id,
            "timestamp": datetime.now()
        })
        
        return {"message": "تم التحقق من المحامي وتفعيل حسابه"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"خطأ في التحقق من المحامي: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في التحقق من المحامي"
        )

# ========================
# نقاط النهاية للمحامين
# ========================

@app.get("/api/lawyer/stats", response_model=LawyerStats)
async def get_lawyer_stats(current_user: dict = Depends(require_role([UserRoles.LAWYER]))):
    """إحصائيات المحامي"""
    try:
        lawyer_id = current_user["user_id"]
        
        # إحصائيات المواعيد
        total_appointments = appointments_collection.count_documents({"lawyer_id": lawyer_id})
        completed_appointments = appointments_collection.count_documents({
            "lawyer_id": lawyer_id,
            "status": "completed"
        })
        pending_appointments = appointments_collection.count_documents({
            "lawyer_id": lawyer_id,
            "status": {"$in": ["pending", "confirmed"]}
        })
        cancelled_appointments = appointments_collection.count_documents({
            "lawyer_id": lawyer_id,
            "status": "cancelled"
        })
        
        # الأرباح
        total_earnings = 0
        this_month_earnings = 0
        
        # حساب الأرباح من الدفعات المكتملة
        payments = list(payments_collection.find({
            "status": "paid"
        }))
        
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        for payment in payments:
            appointment = appointments_collection.find_one({"id": payment["appointment_id"]})
            if appointment and appointment.get("lawyer_id") == lawyer_id:
                total_earnings += payment["amount"]
                if payment.get("transaction_date", datetime.min) >= month_start:
                    this_month_earnings += payment["amount"]
        
        # التقييمات
        reviews = list(reviews_collection.find({"lawyer_id": lawyer_id}))
        total_reviews = len(reviews)
        average_rating = sum(review["rating"] for review in reviews) / total_reviews if reviews else 0
        
        return LawyerStats(
            total_appointments=total_appointments,
            completed_appointments=completed_appointments,
            pending_appointments=pending_appointments,
            cancelled_appointments=cancelled_appointments,
            total_earnings=total_earnings,
            this_month_earnings=this_month_earnings,
            average_rating=round(average_rating, 1),
            total_reviews=total_reviews
        )
        
    except Exception as e:
        logger.error(f"خطأ في جلب إحصائيات المحامي: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب الإحصائيات"
        )

@app.get("/api/lawyer/dashboard")
async def get_lawyer_dashboard(current_user: dict = Depends(require_role([UserRoles.LAWYER]))):
    """لوحة تحكم المحامي"""
    try:
        lawyer_id = current_user["user_id"]
        
        # الحصول على الإحصائيات
        stats_response = await get_lawyer_stats(current_user)
        
        # المواعيد الأخيرة
        recent_appointments = list(appointments_collection.find(
            {"lawyer_id": lawyer_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(5))
        
        # الاستشارات النشطة
        active_consultations = list(consultations_collection.find(
            {"lawyer_id": lawyer_id, "status": "active"},
            {"_id": 0}
        ).sort("started_at", -1))
        
        # التقييمات الأخيرة
        recent_reviews = list(reviews_collection.find(
            {"lawyer_id": lawyer_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(5))
        
        return {
            "stats": stats_response,
            "recent_appointments": recent_appointments,
            "active_consultations": active_consultations,
            "recent_reviews": recent_reviews
        }
        
    except Exception as e:
        logger.error(f"خطأ في جلب لوحة تحكم المحامي: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب لوحة التحكم"
        )

# ========================
# نقاط النهاية للعملاء
# ========================

@app.get("/api/client/stats", response_model=ClientStats)
async def get_client_stats(current_user: dict = Depends(require_role([UserRoles.CLIENT]))):
    """إحصائيات العميل"""
    try:
        client_id = current_user["user_id"]
        
        # إحصائيات المواعيد
        total_appointments = appointments_collection.count_documents({"client_id": client_id})
        completed_appointments = appointments_collection.count_documents({
            "client_id": client_id,
            "status": "completed"
        })
        pending_appointments = appointments_collection.count_documents({
            "client_id": client_id,
            "status": {"$in": ["pending", "confirmed"]}
        })
        cancelled_appointments = appointments_collection.count_documents({
            "client_id": client_id,
            "status": "cancelled"
        })
        
        # المبلغ المدفوع
        total_spent = 0
        client_payments = list(payments_collection.find({
            "status": "paid"
        }))
        
        for payment in client_payments:
            appointment = appointments_collection.find_one({"id": payment["appointment_id"]})
            if appointment and appointment.get("client_id") == client_id:
                total_spent += payment["amount"]
        
        # المحامين المفضلين (الأكثر حجزاً)
        pipeline = [
            {"$match": {"client_id": client_id}},
            {"$group": {"_id": "$lawyer_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        favorite_lawyers = list(appointments_collection.aggregate(pipeline))
        favorite_lawyer_ids = [lawyer["_id"] for lawyer in favorite_lawyers]
        
        return ClientStats(
            total_appointments=total_appointments,
            completed_appointments=completed_appointments,
            pending_appointments=pending_appointments,
            cancelled_appointments=cancelled_appointments,
            total_spent=total_spent,
            favorite_lawyers=favorite_lawyer_ids
        )
        
    except Exception as e:
        logger.error(f"خطأ في جلب إحصائيات العميل: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب الإحصائيات"
        )

@app.get("/api/client/dashboard")
async def get_client_dashboard(current_user: dict = Depends(require_role([UserRoles.CLIENT]))):
    """لوحة تحكم العميل"""
    try:
        client_id = current_user["user_id"]
        
        # الحصول على الإحصائيات
        stats_response = await get_client_stats(current_user)
        
        # المواعيد القادمة
        upcoming_appointments = list(appointments_collection.find(
            {
                "client_id": client_id,
                "status": {"$in": ["confirmed", "pending"]},
                "date": {"$gte": datetime.now().strftime("%Y-%m-%d")}
            },
            {"_id": 0}
        ).sort("date", 1).limit(5))
        
        # المواعيد الأخيرة
        recent_appointments = list(appointments_collection.find(
            {"client_id": client_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(5))
        
        # المحامين المفضلين بالتفاصيل
        favorite_lawyer_details = []
        for lawyer_id in stats_response.favorite_lawyers:
            lawyer = lawyers_collection.find_one({"id": lawyer_id}, {"_id": 0})
            if lawyer:
                favorite_lawyer_details.append(lawyer)
        
        return {
            "stats": stats_response,
            "upcoming_appointments": upcoming_appointments,
            "recent_appointments": recent_appointments,
            "favorite_lawyers": favorite_lawyer_details
        }
        
    except Exception as e:
        logger.error(f"خطأ في جلب لوحة تحكم العميل: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب لوحة التحكم"
        )

# ========================
# نقاط النهاية للتقييمات
# ========================

@app.post("/api/reviews")
async def create_review(
    appointment_id: str,
    comment: str,
    rating: int = 5,
    current_user: dict = Depends(require_role([UserRoles.CLIENT]))
):
    """إضافة تقييم للمحامي"""
    try:
        # التحقق من الموعد
        appointment = appointments_collection.find_one({
            "id": appointment_id,
            "client_id": current_user["user_id"],
            "status": "completed"
        })
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="الموعد غير موجود أو غير مكتمل"
            )
        
        # التحقق من عدم وجود تقييم مسبق
        existing_review = reviews_collection.find_one({
            "appointment_id": appointment_id,
            "client_id": current_user["user_id"]
        })
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="تم تقييم هذا الموعد مسبقاً"
            )
        
        # التحقق من صحة التقييم
        if not 1 <= rating <= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="التقييم يجب أن يكون بين 1 و 5"
            )
        
        # إنشاء التقييم
        review = {
            "id": str(uuid.uuid4()),
            "appointment_id": appointment_id,
            "lawyer_id": appointment["lawyer_id"],
            "client_id": current_user["user_id"],
            "rating": rating,
            "comment": comment,
            "created_at": datetime.now()
        }
        
        reviews_collection.insert_one(review)
        
        # تحديث تقييم المحامي
        lawyer_reviews = list(reviews_collection.find({"lawyer_id": appointment["lawyer_id"]}))
        new_rating = sum(r["rating"] for r in lawyer_reviews) / len(lawyer_reviews)
        
        # تحديث في مجموعتي المحامين والمستخدمين
        update_data = {
            "rating": round(new_rating, 1),
            "reviews_count": len(lawyer_reviews)
        }
        
        lawyers_collection.update_one({"id": appointment["lawyer_id"]}, {"$set": update_data})
        users_collection.update_one({"id": appointment["lawyer_id"]}, {"$set": update_data})
        
        return {"message": "تم إضافة التقييم بنجاح"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"خطأ في إضافة التقييم: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في إضافة التقييم"
        )

@app.get("/api/reviews/lawyer/{lawyer_id}")
async def get_lawyer_reviews(lawyer_id: str, page: int = 1, limit: int = 10):
    """جلب تقييمات المحامي"""
    try:
        skip = (page - 1) * limit
        reviews = list(reviews_collection.find(
            {"lawyer_id": lawyer_id},
            {"_id": 0}
        ).skip(skip).limit(limit).sort("created_at", -1))
        
        # إضافة تفاصيل العميل لكل تقييم
        for review in reviews:
            client = users_collection.find_one(
                {"id": review["client_id"]},
                {"name": 1, "avatar": 1, "_id": 0}
            )
            review["client_name"] = client.get("name", "عميل") if client else "عميل"
            review["client_avatar"] = client.get("avatar") if client else None
        
        total_reviews = reviews_collection.count_documents({"lawyer_id": lawyer_id})
        
        return {
            "reviews": reviews,
            "total": total_reviews,
            "page": page,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"خطأ في جلب التقييمات: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطأ في جلب التقييمات"
        )

# نقاط النهاية الرئيسية
@app.get("/")
async def read_root():
    return {"message": "مرحباً بك في API منصة دبرة للاستشارات القانونية"}

@app.get("/api/lawyers")
async def get_lawyers():
    """جلب قائمة جميع المحامين"""
    try:
        lawyers = list(lawyers_collection.find({}, {"_id": 0}))
        return lawyers
    except Exception as e:
        logger.error(f"خطأ في جلب المحامين: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب المحامين")

@app.get("/api/lawyers/{lawyer_id}")
async def get_lawyer(lawyer_id: str):
    """جلب تفاصيل محامٍ محدد"""
    try:
        lawyer = lawyers_collection.find_one({"id": lawyer_id}, {"_id": 0})
        if not lawyer:
            raise HTTPException(status_code=404, detail="المحامي غير موجود")
        return lawyer
    except Exception as e:
        logger.error(f"خطأ في جلب المحامي: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب المحامي")

# نقاط النهاية الجديدة للمحامين
@app.post("/api/lawyers/{lawyer_id}/login")
async def lawyer_login(lawyer_id: str):
    """تسجيل دخول المحامي"""
    try:
        lawyer = lawyers_collection.find_one({"id": lawyer_id}, {"_id": 0})
        if not lawyer:
            raise HTTPException(status_code=404, detail="المحامي غير موجود")
        
        # محاكاة تسجيل الدخول
        return {
            "message": "تم تسجيل الدخول بنجاح",
            "lawyer": lawyer,
            "token": f"lawyer_token_{lawyer_id}"
        }
    except Exception as e:
        logger.error(f"خطأ في تسجيل دخول المحامي: {e}")
        raise HTTPException(status_code=500, detail="خطأ في تسجيل دخول المحامي")

@app.get("/api/lawyers/{lawyer_id}/appointments")
async def get_lawyer_appointments(lawyer_id: str):
    """جلب مواعيد المحامي"""
    try:
        appointments = list(appointments_collection.find(
            {"lawyer_id": lawyer_id}, 
            {"_id": 0}
        ).sort("created_at", -1))
        return appointments
    except Exception as e:
        logger.error(f"خطأ في جلب مواعيد المحامي: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب مواعيد المحامي")

@app.get("/api/lawyers/{lawyer_id}/consultations")
async def get_lawyer_consultations(lawyer_id: str):
    """جلب استشارات المحامي"""
    try:
        consultations = list(consultations_collection.find(
            {"lawyer_id": lawyer_id}, 
            {"_id": 0}
        ).sort("started_at", -1))
        return consultations
    except Exception as e:
        logger.error(f"خطأ في جلب استشارات المحامي: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب استشارات المحامي")

@app.get("/api/lawyers/{lawyer_id}/stats")
async def get_lawyer_stats(lawyer_id: str):
    """جلب إحصائيات المحامي"""
    try:
        # حساب الإحصائيات
        total_appointments = appointments_collection.count_documents({"lawyer_id": lawyer_id})
        active_consultations = consultations_collection.count_documents({
            "lawyer_id": lawyer_id, 
            "status": "active"
        })
        completed_consultations = consultations_collection.count_documents({
            "lawyer_id": lawyer_id, 
            "status": "completed"
        })
        
        # حساب الأرباح (تقديري)
        lawyer = lawyers_collection.find_one({"id": lawyer_id}, {"_id": 0})
        estimated_earnings = completed_consultations * (lawyer.get("price", 0) if lawyer else 0)
        
        return {
            "totalAppointments": total_appointments,
            "activeConsultations": active_consultations,
            "completedConsultations": completed_consultations,
            "totalEarnings": estimated_earnings
        }
    except Exception as e:
        logger.error(f"خطأ في جلب إحصائيات المحامي: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب إحصائيات المحامي")

@app.put("/api/lawyers/{lawyer_id}")
async def update_lawyer_profile(lawyer_id: str, profile_data: dict):
    """تحديث ملف المحامي"""
    try:
        # التحقق من وجود المحامي
        lawyer = lawyers_collection.find_one({"id": lawyer_id})
        if not lawyer:
            raise HTTPException(status_code=404, detail="المحامي غير موجود")
        
        # تحديث البيانات
        update_data = {
            "name": profile_data.get("name"),
            "specialization": profile_data.get("specialization"),
            "description": profile_data.get("description"),
            "price": profile_data.get("price"),
            "experience_years": profile_data.get("experience_years"),
            "languages": profile_data.get("languages", []),
            "certificates": profile_data.get("certificates", [])
        }
        
        # إزالة القيم الفارغة
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # تحديث في قاعدة البيانات
        lawyers_collection.update_one(
            {"id": lawyer_id},
            {"$set": update_data}
        )
        
        # إرجاع البيانات المحدثة
        updated_lawyer = lawyers_collection.find_one({"id": lawyer_id}, {"_id": 0})
        return updated_lawyer
        
    except Exception as e:
        logger.error(f"خطأ في تحديث ملف المحامي: {e}")
        raise HTTPException(status_code=500, detail="خطأ في تحديث ملف المحامي")

@app.put("/api/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: str, status_data: dict):
    """تحديث حالة الموعد"""
    try:
        # التحقق من وجود الموعد
        appointment = appointments_collection.find_one({"id": appointment_id})
        if not appointment:
            raise HTTPException(status_code=404, detail="الموعد غير موجود")
        
        # تحديث الحالة
        new_status = status_data.get("status")
        appointments_collection.update_one(
            {"id": appointment_id},
            {"$set": {"status": new_status}}
        )
        
        return {"message": "تم تحديث حالة الموعد بنجاح"}
        
    except Exception as e:
        logger.error(f"خطأ في تحديث حالة الموعد: {e}")
        raise HTTPException(status_code=500, detail="خطأ في تحديث حالة الموعد")

@app.post("/api/appointments")
async def create_appointment(appointment_data: dict):
    """إنشاء موعد جديد"""
    try:
        # إنشاء معرف فريد للموعد
        appointment_id = str(uuid.uuid4())
        
        # البحث عن المحامي
        lawyer = lawyers_collection.find_one({"id": appointment_data["lawyer_id"]}, {"_id": 0})
        if not lawyer:
            raise HTTPException(status_code=404, detail="المحامي غير موجود")
        
        # إنشاء بيانات الموعد
        appointment = {
            "id": appointment_id,
            "lawyer_id": appointment_data["lawyer_id"],
            "lawyer_name": lawyer["name"],
            "specialization": lawyer["specialization"],
            "client_id": appointment_data.get("client_id", "client_temp"),
            "date": appointment_data["date"],
            "time": appointment_data["time"],
            "consultation_type": appointment_data["consultation_type"],
            "status": "pending",
            "notes": appointment_data.get("notes", ""),
            "created_at": datetime.now()
        }
        
        # إدراج الموعد في قاعدة البيانات
        appointments_collection.insert_one(appointment)
        
        # إرجاع الموعد بدون _id
        appointment.pop("_id", None)
        return appointment
    
    except Exception as e:
        logger.error(f"خطأ في إنشاء الموعد: {e}")
        raise HTTPException(status_code=500, detail="خطأ في إنشاء الموعد")

@app.get("/api/appointments")
async def get_appointments(client_id: str = None):
    """جلب قائمة المواعيد"""
    try:
        filter_criteria = {}
        if client_id:
            filter_criteria["client_id"] = client_id
        
        appointments = list(appointments_collection.find(filter_criteria, {"_id": 0}))
        return appointments
    except Exception as e:
        logger.error(f"خطأ في جلب المواعيد: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب المواعيد")

@app.post("/api/consultations")
async def create_consultation(consultation_data: dict):
    """إنشاء جلسة استشارة جديدة"""
    try:
        # إنشاء معرف فريد للجلسة
        consultation_id = str(uuid.uuid4())
        
        # البحث عن المحامي
        lawyer = lawyers_collection.find_one({"id": consultation_data["lawyer_id"]}, {"_id": 0})
        if not lawyer:
            raise HTTPException(status_code=404, detail="المحامي غير موجود")
        
        # إنشاء بيانات الجلسة
        consultation = {
            "id": consultation_id,
            "lawyer_id": consultation_data["lawyer_id"],
            "lawyer_name": lawyer["name"],
            "specialization": lawyer["specialization"],
            "client_id": consultation_data.get("client_id", "client_temp"),
            "consultation_type": consultation_data["consultation_type"],
            "status": "active",
            "started_at": datetime.now(),
            "messages": []
        }
        
        # إدراج الجلسة في قاعدة البيانات
        consultations_collection.insert_one(consultation)
        
        # إرجاع الجلسة بدون _id
        consultation.pop("_id", None)
        return consultation
    
    except Exception as e:
        logger.error(f"خطأ في إنشاء الجلسة: {e}")
        raise HTTPException(status_code=500, detail="خطأ في إنشاء الجلسة")

@app.get("/api/consultations/{consultation_id}")
async def get_consultation(consultation_id: str):
    """جلب تفاصيل جلسة الاستشارة"""
    try:
        consultation = consultations_collection.find_one({"id": consultation_id}, {"_id": 0})
        if not consultation:
            raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
        return consultation
    except Exception as e:
        logger.error(f"خطأ في جلب الجلسة: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب الجلسة")

@app.post("/api/consultations/{consultation_id}/messages")
async def add_message(consultation_id: str, message_data: dict):
    """إضافة رسالة جديدة للجلسة"""
    try:
        # البحث عن الجلسة
        consultation = consultations_collection.find_one({"id": consultation_id})
        if not consultation:
            raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
        
        # إنشاء الرسالة
        message = {
            "id": str(uuid.uuid4()),
            "sender": message_data["sender"],
            "content": message_data["content"],
            "timestamp": datetime.now(),
            "message_type": message_data.get("message_type", "text")
        }
        
        # إضافة الرسالة للجلسة
        consultations_collection.update_one(
            {"id": consultation_id},
            {"$push": {"messages": message}}
        )
        
        return message
    
    except Exception as e:
        logger.error(f"خطأ في إضافة الرسالة: {e}")
        raise HTTPException(status_code=500, detail="خطأ في إضافة الرسالة")

@app.put("/api/consultations/{consultation_id}/status")
async def update_consultation_status(consultation_id: str, status_data: dict):
    """تحديث حالة الجلسة"""
    try:
        # البحث عن الجلسة
        consultation = consultations_collection.find_one({"id": consultation_id})
        if not consultation:
            raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
        
        # تحديث الحالة
        update_data = {"status": status_data["status"]}
        if status_data["status"] == "completed":
            update_data["ended_at"] = datetime.now()
        
        consultations_collection.update_one(
            {"id": consultation_id},
            {"$set": update_data}
        )
        
        return {"message": "تم تحديث حالة الجلسة بنجاح"}
    
    except Exception as e:
        logger.error(f"خطأ في تحديث حالة الجلسة: {e}")
        raise HTTPException(status_code=500, detail="خطأ في تحديث حالة الجلسة")

@app.get("/api/lawyers/{lawyer_id}/availability")
async def get_lawyer_availability(lawyer_id: str):
    """جلب الأوقات المتاحة للمحامي"""
    try:
        # البحث عن المحامي
        lawyer = lawyers_collection.find_one({"id": lawyer_id}, {"_id": 0})
        if not lawyer:
            raise HTTPException(status_code=404, detail="المحامي غير موجود")
        
        # جلب المواعيد المحجوزة
        booked_appointments = list(appointments_collection.find(
            {"lawyer_id": lawyer_id, "status": {"$ne": "cancelled"}},
            {"date": 1, "time": 1, "_id": 0}
        ))
        
        # إرجاع الأوقات المتاحة (منطق بسيط)
        available_times = []
        for hour in range(9, 17):  # من 9 صباحاً إلى 5 مساءً
            time_slot = f"{hour:02d}:00"
            available_times.append(time_slot)
        
        return {
            "lawyer_id": lawyer_id,
            "available_times": available_times,
            "booked_appointments": booked_appointments
        }
    
    except Exception as e:
        logger.error(f"خطأ في جلب الأوقات المتاحة: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب الأوقات المتاحة")

@app.get("/api/search/lawyers")
async def search_lawyers(
    specialization: str = None,
    min_rating: float = None,
    max_price: int = None,
    language: str = None
):
    """البحث في المحامين حسب المعايير"""
    try:
        # بناء معايير البحث
        search_criteria = {}
        
        if specialization:
            search_criteria["specialization"] = {"$regex": specialization, "$options": "i"}
        
        if min_rating:
            search_criteria["rating"] = {"$gte": min_rating}
        
        if max_price:
            search_criteria["price"] = {"$lte": max_price}
        
        if language:
            search_criteria["languages"] = {"$in": [language]}
        
        # تطبيق البحث
        lawyers = list(lawyers_collection.find(search_criteria, {"_id": 0}))
        
        return {
            "count": len(lawyers),
            "lawyers": lawyers,
            "search_criteria": search_criteria
        }
    
    except Exception as e:
        logger.error(f"خطأ في البحث: {e}")
        raise HTTPException(status_code=500, detail="خطأ في البحث")

@app.get("/api/stats")
async def get_platform_stats():
    """جلب إحصائيات المنصة"""
    try:
        total_lawyers = lawyers_collection.count_documents({})
        total_appointments = appointments_collection.count_documents({})
        active_consultations = consultations_collection.count_documents({"status": "active"})
        completed_consultations = consultations_collection.count_documents({"status": "completed"})
        
        return {
            "total_lawyers": total_lawyers,
            "total_appointments": total_appointments,
            "active_consultations": active_consultations,
            "completed_consultations": completed_consultations
        }
    
    except Exception as e:
        logger.error(f"خطأ في جلب الإحصائيات: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب الإحصائيات")

@app.get("/api/health")
async def health_check():
    """فحص صحة الخدمة"""
    try:
        # فحص قاعدة البيانات
        db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"خطأ في فحص الصحة: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now()
        }

# ========================
# نقاط النهاية للدفع
# ========================

@app.post("/api/payments/create", response_model=PaymentResponse)
async def create_payment(payment_request: PaymentRequest):
    """إنشاء جلسة دفع جديدة"""
    try:
        # التحقق من وجود الموعد
        appointment = appointments_collection.find_one({"id": payment_request.appointment_id})
        if not appointment:
            raise HTTPException(status_code=404, detail="الموعد غير موجود")
        
        # التحقق من عدم وجود دفع مؤكد مسبقاً
        existing_payment = payments_collection.find_one({
            "appointment_id": payment_request.appointment_id,
            "status": "paid"
        })
        if existing_payment:
            raise HTTPException(status_code=400, detail="تم دفع هذا الموعد مسبقاً")
        
        # إنشاء جلسة الدفع
        payment_result = await myfatoorah_service.create_payment_session(
            amount=payment_request.amount,
            customer_name=payment_request.customer_name,
            customer_email=payment_request.customer_email,
            customer_mobile=payment_request.customer_mobile,
            appointment_id=payment_request.appointment_id,
            lawyer_name=payment_request.lawyer_name,
            consultation_type=payment_request.consultation_type
        )
        
        if payment_result["success"]:
            # حفظ سجل الدفع
            payment_record = PaymentRecord(
                id=str(uuid.uuid4()),
                appointment_id=payment_request.appointment_id,
                invoice_id=payment_result["invoice_id"],
                amount=payment_request.amount,
                customer_name=payment_request.customer_name,
                customer_email=payment_request.customer_email,
                customer_mobile=payment_request.customer_mobile,
                lawyer_name=payment_request.lawyer_name,
                consultation_type=payment_request.consultation_type,
                payment_url=payment_result["payment_url"],
                status="pending"
            )
            
            payments_collection.insert_one(payment_record.dict())
            
            # تحديث حالة الموعد
            appointments_collection.update_one(
                {"id": payment_request.appointment_id},
                {"$set": {
                    "payment_status": "pending",
                    "invoice_id": payment_result["invoice_id"],
                    "payment_amount": payment_request.amount
                }}
            )
            
            return PaymentResponse(**payment_result)
        else:
            raise HTTPException(status_code=400, detail=payment_result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"خطأ في إنشاء الدفع: {e}")
        raise HTTPException(status_code=500, detail="خطأ في إنشاء جلسة الدفع")

@app.post("/api/payments/verify", response_model=PaymentStatus)
async def verify_payment(verification: PaymentVerification):
    """التحقق من حالة الدفع"""
    try:
        # التحقق من الدفع عبر ماي فاتورة
        verification_result = await myfatoorah_service.verify_payment(verification.payment_id)
        
        if verification_result["success"] and verification_result["is_paid"]:
            # البحث عن سجل الدفع
            payment_record = payments_collection.find_one({
                "invoice_id": verification_result["invoice_id"]
            })
            
            if payment_record:
                # تحديث حالة الدفع
                payments_collection.update_one(
                    {"id": payment_record["id"]},
                    {"$set": {
                        "status": "paid",
                        "payment_id": verification.payment_id,
                        "payment_method": verification_result["payment_method"],
                        "transaction_date": datetime.now(),
                        "updated_at": datetime.now()
                    }}
                )
                
                # تحديث حالة الموعد
                appointments_collection.update_one(
                    {"id": payment_record["appointment_id"]},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "confirmed"
                    }}
                )
                
                logger.info(f"Payment confirmed for appointment {payment_record['appointment_id']}")
        
        return PaymentStatus(**verification_result)
        
    except Exception as e:
        logger.error(f"خطأ في التحقق من الدفع: {e}")
        raise HTTPException(status_code=500, detail="خطأ في التحقق من حالة الدفع")

@app.post("/api/payments/refund", response_model=RefundResponse)
async def refund_payment(refund_request: RefundRequest):
    """استرداد المبلغ"""
    try:
        # البحث عن سجل الدفع
        payment_record = payments_collection.find_one({"payment_id": refund_request.payment_id})
        if not payment_record:
            raise HTTPException(status_code=404, detail="سجل الدفع غير موجود")
        
        if payment_record["status"] != "paid":
            raise HTTPException(status_code=400, detail="لا يمكن استرداد دفع غير مؤكد")
        
        # طلب الاسترداد
        refund_result = await myfatoorah_service.refund_payment(
            payment_id=refund_request.payment_id,
            amount=refund_request.amount,
            reason=refund_request.reason
        )
        
        if refund_result["success"]:
            # تحديث سجل الدفع
            payments_collection.update_one(
                {"payment_id": refund_request.payment_id},
                {"$set": {
                    "status": "refunded",
                    "refund_amount": refund_request.amount,
                    "refund_reason": refund_request.reason,
                    "updated_at": datetime.now()
                }}
            )
            
            # تحديث حالة الموعد
            appointments_collection.update_one(
                {"id": payment_record["appointment_id"]},
                {"$set": {
                    "payment_status": "refunded",
                    "status": "cancelled"
                }}
            )
        
        return RefundResponse(**refund_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"خطأ في الاسترداد: {e}")
        raise HTTPException(status_code=500, detail="خطأ في عملية الاسترداد")

@app.get("/api/payments/history/{appointment_id}")
async def get_payment_history(appointment_id: str):
    """جلب تاريخ الدفعات للموعد"""
    try:
        payments = list(payments_collection.find(
            {"appointment_id": appointment_id},
            {"_id": 0}
        ).sort("created_at", -1))
        
        return {
            "appointment_id": appointment_id,
            "payments": payments,
            "count": len(payments)
        }
        
    except Exception as e:
        logger.error(f"خطأ في جلب تاريخ الدفعات: {e}")
        raise HTTPException(status_code=500, detail="خطأ في جلب تاريخ الدفعات")

@app.post("/api/payments/webhook/myfatoorah")
async def myfatoorah_webhook(webhook_data: WebhookPayload):
    """معالجة Webhook من ماي فاتورة"""
    try:
        logger.info(f"Received MyFatoorah webhook: {webhook_data}")
        
        # البحث عن سجل الدفع
        payment_record = payments_collection.find_one({
            "invoice_id": webhook_data.InvoiceId
        })
        
        if not payment_record:
            logger.warning(f"Payment record not found for invoice {webhook_data.InvoiceId}")
            return {"status": "ignored", "reason": "payment record not found"}
        
        # تحديث حالة الدفع حسب الحالة الواردة
        new_status = "pending"
        appointment_status = "pending"
        
        if webhook_data.InvoiceStatus == "Paid":
            new_status = "paid"
            appointment_status = "confirmed"
        elif webhook_data.InvoiceStatus == "Failed":
            new_status = "failed"
            appointment_status = "payment_failed"
        elif webhook_data.InvoiceStatus == "Expired":
            new_status = "expired"
            appointment_status = "payment_expired"
        
        # تحديث سجل الدفع
        payments_collection.update_one(
            {"invoice_id": webhook_data.InvoiceId},
            {"$set": {
                "status": new_status,
                "payment_id": webhook_data.PaymentId,
                "payment_method": webhook_data.PaymentGateway,
                "transaction_date": datetime.now(),
                "updated_at": datetime.now()
            }}
        )
        
        # تحديث حالة الموعد
        appointments_collection.update_one(
            {"id": payment_record["appointment_id"]},
            {"$set": {
                "payment_status": new_status,
                "status": appointment_status
            }}
        )
        
        logger.info(f"Webhook processed successfully for appointment {payment_record['appointment_id']}")
        
        return {"status": "processed", "appointment_id": payment_record["appointment_id"]}
        
    except Exception as e:
        logger.error(f"خطأ في معالجة Webhook: {e}")
        return {"status": "error", "error": str(e)}

@app.get("/api/payments/settings")
async def get_payment_settings():
    """إعدادات نظام الدفع"""
    return {
        "min_amount": float(os.getenv("MIN_PAYMENT_AMOUNT", "50")),
        "max_amount": float(os.getenv("MAX_PAYMENT_AMOUNT", "50000")),
        "currency": "SAR",
        "supported_gateways": ["myfatoorah"],
        "test_mode": True  # البيئة التجريبية
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)