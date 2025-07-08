import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  // حالة التطبيق الرئيسية
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  
  // نظام المصادقة
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  
  // البيانات والإعدادات
  const [paymentSettings, setPaymentSettings] = useState({
    min_amount: 50,
    max_amount: 50000,
    currency: 'SAR'
  });
  const [showPayment, setShowPayment] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(null);

  // نظام الإشعارات
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // التحقق من المصادقة عند بدء التطبيق
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        setAuthToken(token);
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        logout();
      }
    }
    
    fetchLawyers();
    fetchPaymentSettings();
  }, []);

  // جلب بيانات المحامين
  const fetchLawyers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/lawyers`);
      const data = await response.json();
      setLawyers(data);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/settings`);
      const data = await response.json();
      setPaymentSettings(data);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  // دوال المصادقة
  const login = async (email, password) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setAuthToken(data.access_token);
        setUser(data.user);
        setIsAuthenticated(true);
        
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        showNotification('تم تسجيل الدخول بنجاح', 'success');
        
        // توجيه حسب نوع المستخدم
        if (data.user.role === 'admin') {
          setCurrentPage('adminDashboard');
        } else if (data.user.role === 'lawyer') {
          setCurrentPage('lawyerDashboard');
        } else if (data.user.role === 'client') {
          setCurrentPage('clientDashboard');
        }
        
        return true;
      } else {
        showNotification(data.detail || 'خطأ في تسجيل الدخول', 'error');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('خطأ في الاتصال', 'error');
      return false;
    }
  };

  const logout = async () => {
    try {
      if (authToken) {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setCurrentPage('home');
      showNotification('تم تسجيل الخروج بنجاح', 'success');
    }
  };

  // دوال مساعدة للـ API مع المصادقة
  const apiCall = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return fetch(`${process.env.REACT_APP_BACKEND_URL}${url}`, {
      ...options,
      headers
    });
  };

  // إنشاء جلسة دفع
  const createPaymentSession = async (appointmentId, paymentData) => {
    try {
      const response = await apiCall('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: appointmentId,
          amount: paymentData.amount,
          customer_name: paymentData.customer_name,
          customer_email: paymentData.customer_email,
          customer_mobile: paymentData.customer_mobile,
          consultation_type: paymentData.consultation_type,
          lawyer_name: paymentData.lawyer_name
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        window.location.href = result.payment_url;
        return true;
      } else {
        showNotification(result.error || 'حدث خطأ في إنشاء جلسة الدفع', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      showNotification('حدث خطأ في الاتصال بنظام الدفع', 'error');
      return false;
    }
  };

  // حجز موعد
  const bookAppointment = async (lawyerId, appointmentData) => {
    try {
      const response = await apiCall('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          lawyer_id: lawyerId,
          ...appointmentData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(prev => [...prev, data]);
        showNotification('تم حجز الموعد بنجاح!', 'success');
        return data;
      } else {
        showNotification('حدث خطأ في حجز الموعد', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      showNotification('حدث خطأ في حجز الموعد', 'error');
      return false;
    }
  };

  // صفحة تسجيل الدخول
  const LoginPage = () => {
    const [loginData, setLoginData] = useState({
      email: '',
      password: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      await login(loginData.email, loginData.password);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">تسجيل الدخول</h2>
            <p className="text-gray-600">مرحباً بك في منصة دبرة للاستشارات القانونية</p>
          </div>
          
          <div className="bg-white shadow-lg rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                <input 
                  type="password" 
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                تسجيل الدخول
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ليس لديك حساب؟ 
                <button 
                  onClick={() => setCurrentPage('register')}
                  className="text-blue-600 hover:text-blue-800 font-medium mr-1"
                >
                  سجل الآن
                </button>
              </p>
            </div>

            {/* بيانات تجريبية للاختبار */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">بيانات تجريبية للاختبار:</h4>
              <div className="text-xs text-yellow-700">
                <p><strong>مدير النظام:</strong> admin@debra-legal.com / admin123456</p>
                <p><strong>محامي:</strong> سجل كمحامي واطلب التفعيل من المدير</p>
                <p><strong>عميل:</strong> سجل كعميل واستخدم المنصة مباشرة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // صفحة التسجيل
  const RegisterPage = () => {
    const [registerData, setRegisterData] = useState({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'client',
      specialization: '',
      experience_years: '',
      license_number: '',
      bio: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const userData = {
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        phone: registerData.phone,
        role: registerData.role
      };

      if (registerData.role === 'lawyer') {
        userData.specialization = registerData.specialization;
        userData.experience_years = parseInt(registerData.experience_years);
        userData.license_number = registerData.license_number;
        userData.bio = registerData.bio;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (response.ok) {
          if (userData.role === 'lawyer') {
            showNotification('تم تسجيل طلبك بنجاح. سيتم مراجعته وتفعيل الحساب خلال 24 ساعة', 'success');
            setCurrentPage('login');
          } else {
            setAuthToken(data.access_token);
            setUser(data.user);
            setIsAuthenticated(true);
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            showNotification('تم التسجيل بنجاح', 'success');
            setCurrentPage('clientDashboard');
          }
        } else {
          showNotification(data.detail || 'خطأ في التسجيل', 'error');
        }
      } catch (error) {
        console.error('Register error:', error);
        showNotification('خطأ في الاتصال', 'error');
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">إنشاء حساب جديد</h2>
            <p className="text-gray-600">انضم لمنصة دبرة للاستشارات القانونية</p>
          </div>
          
          <div className="bg-white shadow-lg rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                  <input 
                    type="text" 
                    value={registerData.name}
                    onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                  <input 
                    type="password" 
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    minLength="8"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
                  <input 
                    type="tel" 
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    pattern="5[0-9]{8}"
                    placeholder="5xxxxxxxx"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحساب</label>
                <select 
                  value={registerData.role}
                  onChange={(e) => setRegisterData({...registerData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="client">عميل</option>
                  <option value="lawyer">محامي</option>
                </select>
              </div>

              {registerData.role === 'lawyer' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">التخصص</label>
                      <input 
                        type="text" 
                        value={registerData.specialization}
                        onChange={(e) => setRegisterData({...registerData, specialization: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">سنوات الخبرة</label>
                      <input 
                        type="number" 
                        value={registerData.experience_years}
                        onChange={(e) => setRegisterData({...registerData, experience_years: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">رقم الترخيص</label>
                    <input 
                      type="text" 
                      value={registerData.license_number}
                      onChange={(e) => setRegisterData({...registerData, license_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نبذة تعريفية</label>
                    <textarea 
                      value={registerData.bio}
                      onChange={(e) => setRegisterData({...registerData, bio: e.target.value})}
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="اكتب نبذة مختصرة عن خبراتك وتخصصاتك..."
                    />
                  </div>
                </>
              )}

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                إنشاء الحساب
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                لديك حساب بالفعل؟ 
                <button 
                  onClick={() => setCurrentPage('login')}
                  className="text-blue-600 hover:text-blue-800 font-medium mr-1"
                >
                  سجل دخولك
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // لوحة تحكم العميل
  const ClientDashboard = () => {
    const [stats, setStats] = useState({});
    const [recentAppointments, setRecentAppointments] = useState([]);

    useEffect(() => {
      fetchClientDashboard();
    }, []);

    const fetchClientDashboard = async () => {
      try {
        const response = await apiCall('/api/client/dashboard');
        const data = await response.json();
        setStats(data.stats);
        setRecentAppointments(data.recent_appointments || []);
      } catch (error) {
        console.error('Error fetching client dashboard:', error);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">مرحباً {user?.name}</h1>
                <p className="text-gray-600">لوحة تحكم العميل</p>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <button 
                  onClick={() => setCurrentPage('lawyers')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  حجز موعد جديد
                </button>
                <button 
                  onClick={logout}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 13a9 9 0 1018 0 9 9 0 00-18 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_appointments || 0}</p>
                  <p className="text-gray-600">إجمالي المواعيد</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.completed_appointments || 0}</p>
                  <p className="text-gray-600">المواعيد المكتملة</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_appointments || 0}</p>
                  <p className="text-gray-600">المواعيد المعلقة</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_spent || 0} ريال</p>
                  <p className="text-gray-600">إجمالي المدفوع</p>
                </div>
              </div>
            </div>
          </div>

          {/* المواعيد الأخيرة */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">المواعيد الأخيرة</h3>
            {recentAppointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد مواعيد حتى الآن</p>
                <button 
                  onClick={() => setCurrentPage('lawyers')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  احجز موعدك الأول
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{appointment.lawyer_name}</p>
                      <p className="text-sm text-gray-600">{appointment.date} - {appointment.time}</p>
                      <p className="text-xs text-gray-500">{appointment.consultation_type}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appointment.status === 'pending' ? 'في الانتظار' : 
                       appointment.status === 'confirmed' ? 'مؤكد' :
                       appointment.status === 'completed' ? 'مكتمل' : 'ملغى'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // لوحة تحكم المحامي
  const LawyerDashboard = () => {
    const [stats, setStats] = useState({});
    const [recentAppointments, setRecentAppointments] = useState([]);

    useEffect(() => {
      fetchLawyerDashboard();
    }, []);

    const fetchLawyerDashboard = async () => {
      try {
        const response = await apiCall('/api/lawyer/dashboard');
        const data = await response.json();
        setStats(data.stats);
        setRecentAppointments(data.recent_appointments || []);
      } catch (error) {
        console.error('Error fetching lawyer dashboard:', error);
      }
    };

    if (user?.status === 'pending') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full text-center">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">حسابك قيد المراجعة</h2>
              <p className="text-gray-600 mb-6">سيتم مراجعة طلبك وتفعيل الحساب خلال 24 ساعة</p>
              <button 
                onClick={logout}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">مرحباً {user?.name}</h1>
                <p className="text-gray-600">لوحة تحكم المحامي</p>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <button 
                  onClick={logout}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 13a9 9 0 1018 0 9 9 0 00-18 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_appointments || 0}</p>
                  <p className="text-gray-600">إجمالي المواعيد</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_earnings || 0} ريال</p>
                  <p className="text-gray-600">إجمالي الأرباح</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.average_rating || 0}</p>
                  <p className="text-gray-600">التقييم</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_reviews || 0}</p>
                  <p className="text-gray-600">التقييمات</p>
                </div>
              </div>
            </div>
          </div>

          {/* المواعيد الأخيرة */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">المواعيد الأخيرة</h3>
            {recentAppointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد مواعيد حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">موعد - {appointment.date}</p>
                      <p className="text-sm text-gray-600">{appointment.time} - {appointment.consultation_type}</p>
                      <p className="text-xs text-gray-500">{appointment.notes}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appointment.status === 'pending' ? 'في الانتظار' : 
                       appointment.status === 'confirmed' ? 'مؤكد' :
                       appointment.status === 'completed' ? 'مكتمل' : 'ملغى'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // لوحة تحكم الإدارة
  const AdminDashboard = () => {
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [pendingLawyers, setPendingLawyers] = useState([]);

    useEffect(() => {
      fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          apiCall('/api/admin/stats'),
          apiCall('/api/admin/users?limit=50')
        ]);
        
        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        
        setStats(statsData);
        setUsers(usersData);
        setPendingLawyers(usersData.filter(user => user.role === 'lawyer' && user.status === 'pending'));
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
    };

    const verifyLawyer = async (lawyerId) => {
      try {
        const response = await apiCall(`/api/admin/lawyers/${lawyerId}/verify`, {
          method: 'POST'
        });
        
        if (response.ok) {
          showNotification('تم التحقق من المحامي بنجاح', 'success');
          fetchAdminData();
        } else {
          showNotification('خطأ في التحقق من المحامي', 'error');
        }
      } catch (error) {
        console.error('Error verifying lawyer:', error);
        showNotification('خطأ في الاتصال', 'error');
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم الإدارة</h1>
                <p className="text-gray-600">مرحباً {user?.name}</p>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <button 
                  onClick={logout}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_users || 0}</p>
                  <p className="text-gray-600">إجمالي المستخدمين</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_lawyers || 0}</p>
                  <p className="text-gray-600">المحامين</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_clients || 0}</p>
                  <p className="text-gray-600">العملاء</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.active_users || 0}</p>
                  <p className="text-gray-600">المستخدمين النشطين</p>
                </div>
              </div>
            </div>
          </div>

          {/* المحامين المعلقين */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">المحامين في انتظار التحقق ({pendingLawyers.length})</h3>
            {pendingLawyers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد طلبات معلقة</p>
            ) : (
              <div className="space-y-4">
                {pendingLawyers.map(lawyer => (
                  <div key={lawyer.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{lawyer.name}</h4>
                      <p className="text-sm text-gray-600">{lawyer.email}</p>
                      <p className="text-sm text-gray-600">التخصص: {lawyer.specialization}</p>
                      <p className="text-sm text-gray-600">الخبرة: {lawyer.experience_years} سنة</p>
                      <p className="text-sm text-gray-600">رقم الترخيص: {lawyer.license_number}</p>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <button 
                        onClick={() => verifyLawyer(lawyer.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        تفعيل
                      </button>
                      <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* قائمة المستخدمين */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">جميع المستخدمين</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المستخدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ التسجيل
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.slice(0, 10).map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'lawyer' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? 'مدير' : user.role === 'lawyer' ? 'محامي' : 'عميل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' :
                          user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? 'نشط' : 
                           user.status === 'pending' ? 'معلق' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // الصفحة الرئيسية العامة
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
            <nav className="flex space-x-reverse space-x-8">
              {!isAuthenticated ? (
                <>
                  <button 
                    onClick={() => setCurrentPage('login')}
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                  <button 
                    onClick={() => setCurrentPage('register')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    إنشاء حساب
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-700">مرحباً {user?.name}</span>
                  <button 
                    onClick={() => {
                      if (user?.role === 'admin') {
                        setCurrentPage('adminDashboard');
                      } else if (user?.role === 'lawyer') {
                        setCurrentPage('lawyerDashboard');
                      } else {
                        setCurrentPage('clientDashboard');
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    لوحة التحكم
                  </button>
                  <button 
                    onClick={logout}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    تسجيل الخروج
                  </button>
                </>
              )}
            </nav>
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
              {!isAuthenticated ? (
                <>
                  <button 
                    onClick={() => setCurrentPage('register')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                  >
                    ابدأ الآن
                  </button>
                  <button 
                    onClick={() => setCurrentPage('login')}
                    className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setCurrentPage('lawyers')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  تصفح المحامين
                </button>
              )}
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
          {!isAuthenticated ? (
            <button 
              onClick={() => setCurrentPage('register')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              ابدأ الآن
            </button>
          ) : (
            <button 
              onClick={() => setCurrentPage('lawyers')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              تصفح المحامين
            </button>
          )}
        </div>
      </section>
    </div>
  );

  // صفحة عرض المحامين (مبسطة)
  const LawyersPage = () => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lawyers.map(lawyer => (
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
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{lawyer.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-600">{lawyer.price} ريال/ساعة</span>
                  <div className="flex space-x-2 space-x-reverse">
                    <button 
                      onClick={() => {
                        if (!isAuthenticated) {
                          showNotification('يرجى تسجيل الدخول أولاً', 'error');
                          setCurrentPage('login');
                          return;
                        }
                        setSelectedLawyer(lawyer);
                        setCurrentPage('booking');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      حجز موعد
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // صفحة الحجز المبسطة
  const BookingPage = () => {
    const [appointmentData, setAppointmentData] = useState({
      date: '',
      time: '',
      consultation_type: 'video',
      notes: ''
    });

    const [customerData, setCustomerData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      mobile: user?.phone || ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (selectedLawyer) {
        const appointmentResult = await bookAppointment(selectedLawyer.id, appointmentData);
        if (appointmentResult) {
          setCurrentAppointment(appointmentResult);
          setShowPayment(true);
        }
      }
    };

    const handlePayment = async (e) => {
      e.preventDefault();
      
      if (!customerData.name || !customerData.email || !customerData.mobile) {
        showNotification('يرجى ملء جميع البيانات المطلوبة', 'error');
        return;
      }

      if (!customerData.mobile.match(/^5[0-9]{8}$/)) {
        showNotification('يرجى إدخال رقم جوال سعودي صحيح (مثال: 512345678)', 'error');
        return;
      }

      if (!currentAppointment) {
        showNotification('لم يتم العثور على الموعد', 'error');
        return;
      }

      const paymentData = {
        amount: selectedLawyer.price,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_mobile: customerData.mobile,
        consultation_type: appointmentData.consultation_type,
        lawyer_name: selectedLawyer.name
      };

      await createPaymentSession(currentAppointment.id, paymentData);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {showPayment ? 'الدفع' : 'حجز موعد'}
              </h1>
              <button 
                onClick={() => {
                  if (showPayment) {
                    setShowPayment(false);
                  } else {
                    setCurrentPage('lawyers');
                    setCurrentAppointment(null);
                    setShowPayment(false);
                  }
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showPayment ? 'العودة للحجز' : 'العودة للمحامين'}
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
                    <p className="text-green-600 font-bold">{selectedLawyer.price} ريال/ساعة</p>
                  </div>
                </div>
              </div>
            )}

            {!showPayment ? (
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
                  المتابعة للدفع
                </button>
              </form>
            ) : (
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">ملخص الموعد</h3>
                  <div className="text-sm text-green-700">
                    <p><strong>التاريخ:</strong> {appointmentData.date}</p>
                    <p><strong>الوقت:</strong> {appointmentData.time}</p>
                    <p><strong>نوع الاستشارة:</strong> {appointmentData.consultation_type}</p>
                    <p><strong>المبلغ:</strong> {selectedLawyer.price} ريال</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                  <input 
                    type="text" 
                    value={customerData.name}
                    onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={customerData.email}
                    onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال (السعودية)</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      +966
                    </span>
                    <input 
                      type="tel" 
                      value={customerData.mobile}
                      onChange={(e) => setCustomerData({...customerData, mobile: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="512345678"
                      pattern="5[0-9]{8}"
                      maxLength="9"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  الدفع الآن - {selectedLawyer.price} ريال
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  // عرض الصفحة المحددة
  const renderPage = () => {
    // التحقق من URL للصفحات الخاصة بالدفع
    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/payment/success' || urlParams.get('paymentId')) {
      return <div className="text-center py-20">تم الدفع بنجاح</div>;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'clientDashboard':
        return <ClientDashboard />;
      case 'lawyerDashboard':
        return <LawyerDashboard />;
      case 'adminDashboard':
        return <AdminDashboard />;
      case 'lawyers':
        return <LawyersPage />;
      case 'booking':
        return <BookingPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="font-arabic">
      {/* نظام الإشعارات */}
      {notification && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === 'success' && (
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="mr-2 text-white hover:text-gray-200 transition-colors"
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