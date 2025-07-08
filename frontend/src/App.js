import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [currentConsultation, setCurrentConsultation] = useState(null);

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
      const data = await response.json();
      setAppointments(prev => [...prev, data]);
      alert('تم حجز الموعد بنجاح!');
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
            <nav className="flex space-x-reverse space-x-8">
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

  // صفحة المحامين
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
                <p className="text-gray-600 mb-4">{lawyer.description}</p>
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
      </div>
    </div>
  );

  // صفحة الحجز
  const BookingPage = () => {
    const [appointmentData, setAppointmentData] = useState({
      date: '',
      time: '',
      consultation_type: 'video',
      notes: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (selectedLawyer) {
        bookAppointment(selectedLawyer.id, appointmentData);
        setCurrentPage('appointments');
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
          sender: 'client',
          timestamp: new Date()
        }]);
        setNewMessage('');
        
        // محاكاة رد المحامي
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: 'شكراً لك على رسالتك، سأراجع الأمر وأعود إليك بالرد المناسب',
            sender: 'lawyer',
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
                  onClick={() => setCurrentPage('lawyers')}
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
                    className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'client' 
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
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="font-arabic">
      {renderPage()}
    </div>
  );
};

export default App;