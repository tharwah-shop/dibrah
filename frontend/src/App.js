import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [currentConsultation, setCurrentConsultation] = useState(null);
  const [user, setUser] = useState(null);
  const [isLawyerMode, setIsLawyerMode] = useState(false);
  const [lawyerDashboardData, setLawyerDashboardData] = useState({
    appointments: [],
    consultations: [],
    stats: {},
    profile: {}
  });

  // جلب بيانات المحامين
  useEffect(() => {
    fetchLawyers();
  }, []);

  const fetchLawyers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers`);
      const data = await response.json();
      setLawyers(data);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
    }
  };

  // تسجيل دخول المحامي
  const lawyerLogin = async (lawyerId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers/${lawyerId}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setUser(data.lawyer);
      setIsLawyerMode(true);
      setCurrentPage('lawyerDashboard');
      await fetchLawyerDashboardData(lawyerId);
    } catch (error) {
      console.error('Error logging in lawyer:', error);
    }
  };

  // جلب بيانات لوحة التحكم
  const fetchLawyerDashboardData = async (lawyerId) => {
    try {
      const [appointmentsRes, consultationsRes, statsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers/${lawyerId}/appointments`),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers/${lawyerId}/consultations`),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers/${lawyerId}/stats`)
      ]);

      const appointments = await appointmentsRes.json();
      const consultations = await consultationsRes.json();
      const stats = await statsRes.json();

      setLawyerDashboardData({
        appointments: appointments || [],
        consultations: consultations || [],
        stats: stats || {},
        profile: user || {}
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // تحديث حالة الموعد
  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        await fetchLawyerDashboardData(user.id);
        // عرض إشعار نجاح
        showNotification('تم تحديث حالة الموعد بنجاح', 'success');
      } else {
        showNotification('حدث خطأ في تحديث حالة الموعد', 'error');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      showNotification('حدث خطأ في تحديث حالة الموعد', 'error');
    }
  };

  // تحديث حالة الاستشارة
  const updateConsultationStatus = async (consultationId, status) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        await fetchLawyerDashboardData(user.id);
        showNotification('تم تحديث حالة الاستشارة بنجاح', 'success');
      } else {
        showNotification('حدث خطأ في تحديث حالة الاستشارة', 'error');
      }
    } catch (error) {
      console.error('Error updating consultation status:', error);
      showNotification('حدث خطأ في تحديث حالة الاستشارة', 'error');
    }
  };

  // نظام الإشعارات
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // تحديث ملف المحامي
  const updateLawyerProfile = async (profileData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });
      
      if (response.ok) {
        const updatedLawyer = await response.json();
        setUser(updatedLawyer);
        showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
      } else {
        showNotification('حدث خطأ في تحديث الملف الشخصي', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('حدث خطأ في تحديث الملف الشخصي', 'error');
    }
  };

  // حجز موعد
  const bookAppointment = async (lawyerId, appointmentData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lawyer_id: lawyerId,
          ...appointmentData
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(prev => [...prev, data]);
        showNotification('تم حجز الموعد بنجاح!', 'success');
        return true;
      } else {
        showNotification('حدث خطأ في حجز الموعد', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  };

  // بدء استشارة
  const startConsultation = async (lawyerId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/consultations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lawyer_id: lawyerId,
          consultation_type: 'video'
        })
      });
      const data = await response.json();
      setCurrentConsultation(data);
      setCurrentPage('consultation');
    } catch (error) {
      console.error('Error starting consultation:', error);
    }
  };

  // تسجيل الخروج
  const logout = () => {
    setUser(null);
    setIsLawyerMode(false);
    setCurrentPage('home');
  };

  // الصفحة الرئيسية
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img src="https://images.unsplash.com/photo-1589994965851-a8f479c573a9" alt="Logo" className="h-12 w-12 rounded-full ml-3" />
              <h1 className="text-2xl font-bold text-gray-900">دبرة للاستشارات والمحاماة</h1>
            </div>
            <nav className="hidden md:flex space-x-reverse space-x-8">
              <button 
                onClick={() => setCurrentPage('home')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                الرئيسية
              </button>
              <button 
                onClick={() => setCurrentPage('lawyers')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                المحامين
              </button>
              <button 
                onClick={() => setCurrentPage('appointments')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                مواعيدي
              </button>
              <button 
                onClick={() => setCurrentPage('lawyerLogin')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                دخول المحامين
              </button>
            </nav>
            
            {/* القائمة المحمولة */}
            <div className="md:hidden">
              <button 
                onClick={() => setCurrentPage('lawyerLogin')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                دخول المحامين
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-blue-900 text-white">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              استشارات قانونية موثوقة
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              احصل على الاستشارة القانونية المناسبة من أفضل المحامين المختصين
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setCurrentPage('lawyers')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                اختر محاميك الآن
              </button>
              <button className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 text-white font-bold py-3 px-8 rounded-lg transition-colors">
                تعلم المزيد
              </button>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900 opacity-90"></div>
        <img 
          src="https://images.unsplash.com/photo-1719561940627-8de702b6256e" 
          alt="Legal consultation" 
          className="absolute inset-0 w-full h-full object-cover -z-10"
        />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">خدماتنا المتميزة</h2>
            <p className="text-xl text-gray-600">نقدم حلولاً قانونية شاملة لجميع احتياجاتك</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-blue-50 rounded-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">استشارات فورية</h3>
              <p className="text-gray-600">احصل على استشارة قانونية فورية عبر الدردشة أو المكالمة</p>
            </div>
            <div className="text-center p-8 bg-green-50 rounded-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">مكالمات مرئية</h3>
              <p className="text-gray-600">تواصل وجهاً لوجه مع المحامي المختص</p>
            </div>
            <div className="text-center p-8 bg-purple-50 rounded-lg">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">محامون معتمدون</h3>
              <p className="text-gray-600">جميع محامينا معتمدون ومتخصصون في مجالاتهم</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">هل تحتاج لاستشارة قانونية؟</h2>
          <p className="text-xl text-gray-600 mb-8">لا تتردد في التواصل مع أفضل المحامين</p>
          <button 
            onClick={() => setCurrentPage('lawyers')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            ابدأ الآن
          </button>
        </div>
      </section>
    </div>
  );

  // صفحة تسجيل دخول المحامين
  const LawyerLoginPage = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">دخول المحامين</h2>
          <p className="text-gray-600">اختر حسابك للدخول إلى لوحة التحكم</p>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="space-y-4">
            {lawyers.map(lawyer => (
              <div key={lawyer.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img 
                      src={lawyer.image || "https://images.pexels.com/photos/32892535/pexels-photo-32892535.jpeg"} 
                      alt={lawyer.name}
                      className="w-12 h-12 rounded-full ml-3 object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{lawyer.name}</h3>
                      <p className="text-sm text-blue-600">{lawyer.specialization}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => lawyerLogin(lawyer.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    دخول
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setCurrentPage('home')}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // لوحة تحكم المحامين
  const LawyerDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <img 
                  src={user?.image || "https://images.pexels.com/photos/32892535/pexels-photo-32892535.jpeg"} 
                  alt={user?.name}
                  className="w-12 h-12 rounded-full ml-3 object-cover"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">مرحباً {user?.name}</h1>
                  <p className="text-sm text-gray-600">{user?.specialization}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <button 
                  onClick={() => setCurrentPage('home')}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  الموقع الرئيسي
                </button>
                <button 
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 space-x-reverse">
              {[
                { id: 'overview', label: 'نظرة عامة', icon: '📊' },
                { id: 'appointments', label: 'المواعيد', icon: '📅' },
                { id: 'consultations', label: 'الاستشارات', icon: '💬' },
                { id: 'profile', label: 'الملف الشخصي', icon: '👤' },
                { id: 'settings', label: 'الإعدادات', icon: '⚙️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'appointments' && <AppointmentsManagement />}
          {activeTab === 'consultations' && <ConsultationsManagement />}
          {activeTab === 'profile' && <ProfileManagement />}
          {activeTab === 'settings' && <SettingsManagement />}
        </div>
      </div>
    );
  };

  // نظرة عامة على لوحة التحكم
  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 13a9 9 0 1018 0 9 9 0 00-18 0z" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-2xl font-bold text-gray-900">{lawyerDashboardData.stats.totalAppointments || 0}</p>
              <p className="text-gray-600">إجمالي المواعيد</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-2xl font-bold text-gray-900">{lawyerDashboardData.stats.activeConsultations || 0}</p>
              <p className="text-gray-600">الاستشارات النشطة</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-2xl font-bold text-gray-900">{lawyerDashboardData.stats.totalEarnings || 0} ريال</p>
              <p className="text-gray-600">إجمالي الأرباح</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-2xl font-bold text-gray-900">{user?.rating || 0}</p>
              <p className="text-gray-600">التقييم</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">المواعيد الأخيرة</h3>
        <div className="space-y-4">
          {lawyerDashboardData.appointments.slice(0, 3).map(appointment => (
            <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">موعد - {appointment.date}</p>
                <p className="text-sm text-gray-600">{appointment.time} - {appointment.consultation_type}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {appointment.status === 'pending' ? 'في الانتظار' : 
                 appointment.status === 'confirmed' ? 'مؤكد' : 'ملغى'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // إدارة المواعيد
  const AppointmentsManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">جميع المواعيد</h3>
        <div className="space-y-4">
          {lawyerDashboardData.appointments.map(appointment => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">موعد - {appointment.date}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appointment.status === 'pending' ? 'في الانتظار' : 
                       appointment.status === 'confirmed' ? 'مؤكد' : 'ملغى'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">الوقت: {appointment.time}</p>
                  <p className="text-sm text-gray-600">نوع الاستشارة: {appointment.consultation_type}</p>
                  {appointment.notes && (
                    <p className="text-sm text-gray-600 mt-2">ملاحظات: {appointment.notes}</p>
                  )}
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  {appointment.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        تأكيد
                      </button>
                      <button 
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        إلغاء
                      </button>
                    </>
                  )}
                  {appointment.status === 'confirmed' && (
                    <button 
                      onClick={() => startConsultation(user.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      بدء الاستشارة
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // إدارة الاستشارات
  const ConsultationsManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">الاستشارات النشطة</h3>
        <div className="space-y-4">
          {lawyerDashboardData.consultations.map(consultation => (
            <div key={consultation.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">استشارة - {consultation.consultation_type}</h4>
                  <p className="text-sm text-gray-600">بدأت في: {new Date(consultation.started_at).toLocaleString('ar-SA')}</p>
                  <p className="text-sm text-gray-600">الحالة: {consultation.status === 'active' ? 'نشطة' : 'مكتملة'}</p>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  {consultation.status === 'active' && (
                    <>
                      <button 
                        onClick={() => {
                          setCurrentConsultation(consultation);
                          setCurrentPage('consultation');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        الانضمام
                      </button>
                      <button 
                        onClick={() => updateConsultationStatus(consultation.id, 'completed')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        إنهاء
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // إدارة الملف الشخصي
  const ProfileManagement = () => {
    const [profileData, setProfileData] = useState({
      name: user?.name || '',
      specialization: user?.specialization || '',
      description: user?.description || '',
      price: user?.price || 0,
      experience_years: user?.experience_years || 0,
      languages: user?.languages?.join(', ') || '',
      certificates: user?.certificates?.join(', ') || ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const updatedData = {
        ...profileData,
        languages: profileData.languages.split(',').map(lang => lang.trim()),
        certificates: profileData.certificates.split(',').map(cert => cert.trim())
      };
      updateLawyerProfile(updatedData);
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تعديل الملف الشخصي</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
              <input 
                type="text" 
                value={profileData.name}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التخصص</label>
              <input 
                type="text" 
                value={profileData.specialization}
                onChange={(e) => setProfileData({...profileData, specialization: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
              <textarea 
                value={profileData.description}
                onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">سعر الساعة (ريال)</label>
                <input 
                  type="number" 
                  value={profileData.price}
                  onChange={(e) => setProfileData({...profileData, price: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">سنوات الخبرة</label>
                <input 
                  type="number" 
                  value={profileData.experience_years}
                  onChange={(e) => setProfileData({...profileData, experience_years: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اللغات (مفصولة بفواصل)</label>
              <input 
                type="text" 
                value={profileData.languages}
                onChange={(e) => setProfileData({...profileData, languages: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="العربية, الإنجليزية, الفرنسية"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الشهادات (مفصولة بفواصل)</label>
              <input 
                type="text" 
                value={profileData.certificates}
                onChange={(e) => setProfileData({...profileData, certificates: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="بكالوريوس الحقوق, ماجستير القانون"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              حفظ التغييرات
            </button>
          </form>
        </div>
      </div>
    );
  };

  // إدارة الإعدادات
  const SettingsManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات الحساب</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">الحالة النشطة</h4>
              <p className="text-sm text-gray-600">تحديد ما إذا كنت متاحاً لتلقي مواعيد جديدة</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">الإشعارات</h4>
              <p className="text-sm text-gray-600">تلقي إشعارات عند حجز مواعيد جديدة</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">ساعات العمل</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
                <input 
                  type="time" 
                  defaultValue="09:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
                <input 
                  type="time" 
                  defaultValue="17:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // صفحة المحامين
  const LawyersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredLawyers, setFilteredLawyers] = useState(lawyers);
    const [filterSpecialization, setFilterSpecialization] = useState('');
    const [sortBy, setSortBy] = useState('rating');

    // تطبيق الفلترة والبحث
    useEffect(() => {
      let filtered = lawyers;

      // فلترة بالبحث
      if (searchTerm) {
        filtered = filtered.filter(lawyer => 
          lawyer.name.includes(searchTerm) || 
          lawyer.specialization.includes(searchTerm) ||
          lawyer.description.includes(searchTerm)
        );
      }

      // فلترة بالتخصص
      if (filterSpecialization) {
        filtered = filtered.filter(lawyer => 
          lawyer.specialization.includes(filterSpecialization)
        );
      }

      // ترتيب النتائج
      filtered.sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'price') return a.price - b.price;
        if (sortBy === 'experience') return b.experience_years - a.experience_years;
        return 0;
      });

      setFilteredLawyers(filtered);
    }, [searchTerm, filterSpecialization, sortBy, lawyers]);

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-2xl font-bold text-gray-900">المحامين المتاحين</h1>
              <button 
                onClick={() => setCurrentPage('home')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* شريط البحث والفلترة */}
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو التخصص..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التخصص</label>
                <select
                  value={filterSpecialization}
                  onChange={(e) => setFilterSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">جميع التخصصات</option>
                  <option value="القانون التجاري">القانون التجاري</option>
                  <option value="قانون الأسرة">قانون الأسرة</option>
                  <option value="القانون الجنائي">القانون الجنائي</option>
                  <option value="قانون العمل">قانون العمل</option>
                  <option value="القانون العقاري">القانون العقاري</option>
                  <option value="قانون الملكية الفكرية">قانون الملكية الفكرية</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ترتيب حسب</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rating">التقييم</option>
                  <option value="price">السعر</option>
                  <option value="experience">سنوات الخبرة</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterSpecialization('');
                    setSortBy('rating');
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          </div>

          {/* نتائج البحث */}
          <div className="mb-4">
            <p className="text-gray-600">
              تم العثور على {filteredLawyers.length} محامٍ
              {searchTerm && ` للبحث عن "${searchTerm}"`}
              {filterSpecialization && ` في تخصص ${filterSpecialization}`}
            </p>
          </div>

          {/* قائمة المحامين */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawyers.map(lawyer => (
              <div key={lawyer.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <img 
                      src={lawyer.image || "https://images.pexels.com/photos/32892535/pexels-photo-32892535.jpeg"} 
                      alt={lawyer.name}
                      className="w-16 h-16 rounded-full ml-4 object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{lawyer.name}</h3>
                      <p className="text-blue-600 font-medium">{lawyer.specialization}</p>
                      <p className="text-sm text-gray-500">{lawyer.experience_years} سنة خبرة</p>
                    </div>
                  </div>
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-gray-600 text-sm mr-2">{lawyer.rating}</span>
                  </div>
                  <p className="text-gray-600 mb-4 text-sm">{lawyer.description}</p>
                  
                  {/* اللغات */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">اللغات:</p>
                    <div className="flex flex-wrap gap-1">
                      {lawyer.languages.map((lang, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">{lawyer.price} ريال/ساعة</span>
                    <div className="flex space-x-2 space-x-reverse">
                      <button 
                        onClick={() => {
                          setSelectedLawyer(lawyer);
                          setCurrentPage('booking');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        حجز موعد
                      </button>
                      <button 
                        onClick={() => startConsultation(lawyer.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        استشارة فورية
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* في حالة عدم وجود نتائج */}
          {filteredLawyers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-600">لم يتم العثور على محامين يطابقون معايير البحث</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterSpecialization('');
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                عرض جميع المحامين
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // صفحة الحجز
  const BookingPage = () => {
    const [appointmentData, setAppointmentData] = useState({
      date: '',
      time: '',
      consultation_type: 'video',
      notes: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (selectedLawyer) {
        const success = await bookAppointment(selectedLawyer.id, appointmentData);
        if (success) {
          // إعادة تعيين النموذج
          setAppointmentData({
            date: '',
            time: '',
            consultation_type: 'video',
            notes: ''
          });
          // الانتقال لصفحة المواعيد بعد ثانيتين
          setTimeout(() => {
            setCurrentPage('appointments');
          }, 2000);
        }
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-2xl font-bold text-gray-900">حجز موعد</h1>
              <button 
                onClick={() => setCurrentPage('lawyers')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                العودة للمحامين
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            {selectedLawyer && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <img 
                    src={selectedLawyer.image || "https://images.pexels.com/photos/32892535/pexels-photo-32892535.jpeg"} 
                    alt={selectedLawyer.name}
                    className="w-12 h-12 rounded-full ml-3 object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedLawyer.name}</h3>
                    <p className="text-blue-600">{selectedLawyer.specialization}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الموعد</label>
                <input 
                  type="date" 
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">وقت الموعد</label>
                <input 
                  type="time" 
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData({...appointmentData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الاستشارة</label>
                <select 
                  value={appointmentData.consultation_type}
                  onChange={(e) => setAppointmentData({...appointmentData, consultation_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="video">مكالمة مرئية</option>
                  <option value="audio">مكالمة صوتية</option>
                  <option value="chat">دردشة نصية</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <textarea 
                  value={appointmentData.notes}
                  onChange={(e) => setAppointmentData({...appointmentData, notes: e.target.value})}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اكتب تفاصيل استشارتك هنا..."
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                تأكيد الحجز
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // صفحة الاستشارة
  const ConsultationPage = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isVideoCall, setIsVideoCall] = useState(false);

    const sendMessage = (e) => {
      e.preventDefault();
      if (newMessage.trim()) {
        setMessages([...messages, {
          id: Date.now(),
          text: newMessage,
          sender: isLawyerMode ? 'lawyer' : 'client',
          timestamp: new Date()
        }]);
        setNewMessage('');
        
        // محاكاة رد الطرف الآخر
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: isLawyerMode ? 'شكراً لك على رسالتك، سأراجع الأمر وأعود إليك بالرد المناسب' : 'تلقيت رسالتك، كيف يمكنني مساعدتك؟',
            sender: isLawyerMode ? 'client' : 'lawyer',
            timestamp: new Date()
          }]);
        }, 2000);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-2xl font-bold text-gray-900">جلسة الاستشارة</h1>
              <div className="flex items-center space-x-4 space-x-reverse">
                <button 
                  onClick={() => setIsVideoCall(!isVideoCall)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isVideoCall 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {isVideoCall ? 'إيقاف الفيديو' : 'تشغيل الفيديو'}
                </button>
                <button 
                  onClick={() => setCurrentPage(isLawyerMode ? 'lawyerDashboard' : 'lawyers')}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  إنهاء الجلسة
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Video Call Area */}
            {isVideoCall && (
              <div className="relative h-64 bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>المكالمة المرئية نشطة</p>
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div 
                    key={message.id}
                    className={`flex ${message.sender === (isLawyerMode ? 'lawyer' : 'client') ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === (isLawyerMode ? 'lawyer' : 'client')
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {message.timestamp.toLocaleTimeString('ar-SA')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                <div className="flex space-x-2 space-x-reverse">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    إرسال
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // صفحة المواعيد
  const AppointmentsPage = () => (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">مواعيدي</h1>
            <button 
              onClick={() => setCurrentPage('home')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 13a9 9 0 1018 0 9 9 0 00-18 0z" />
              </svg>
              <p className="text-gray-600">لا توجد مواعيد محجوزة حالياً</p>
              <button 
                onClick={() => setCurrentPage('lawyers')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                احجز موعدك الأول
              </button>
            </div>
          ) : (
            appointments.map(appointment => (
              <div key={appointment.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      موعد مع {appointment.lawyer_name}
                    </h3>
                    <p className="text-blue-600 mb-2">{appointment.specialization}</p>
                    <p className="text-gray-600">
                      {appointment.date} - {appointment.time}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      نوع الاستشارة: {appointment.consultation_type}
                    </p>
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                      انضم الآن
                    </button>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // عرض الصفحة المحددة
  const renderPage = () => {
    if (isLawyerMode) {
      switch (currentPage) {
        case 'lawyerDashboard':
          return <LawyerDashboard />;
        case 'consultation':
          return <ConsultationPage />;
        default:
          return <LawyerDashboard />;
      }
    } else {
      switch (currentPage) {
        case 'home':
          return <HomePage />;
        case 'lawyers':
          return <LawyersPage />;
        case 'booking':
          return <BookingPage />;
        case 'consultation':
          return <ConsultationPage />;
        case 'appointments':
          return <AppointmentsPage />;
        case 'lawyerLogin':
          return <LawyerLoginPage />;
        default:
          return <HomePage />;
      }
    }
  };

  return (
    <div className="font-arabic">
      {/* نظام الإشعارات */}
      {notification && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="mr-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {renderPage()}
    </div>
  );
};

export default App;