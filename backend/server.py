from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import os
from pymongo import MongoClient
from bson import ObjectId
import logging

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
    except Exception as e:
        logger.error(f"خطأ في إدراج البيانات التجريبية: {e}")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)