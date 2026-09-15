import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import {
  ClipboardCheck, Plus, Eye, CheckCircle, XCircle,
  AlertCircle, TrendingDown, TrendingUp, FileText, Calendar,
  Filter, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InventoryAudit() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [audits, setAudits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  
  // Filters
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // New audit form
  const [newAudit, setNewAudit] = useState({
    branchId: '',
    notes: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchAudits();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      if (response.data.success) {
        setBranches(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]); // Set empty array on error
    }
  };

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterBranch) params.branchId = filterBranch;
      if (filterStatus) params.status = filterStatus;

      const response = await api.get('/audits', { params });
      
      if (response.data.success) {
        setAudits(response.data.audits || []);
      }
    } catch (error) {
      console.error('Error fetching audits:', error);
      setAudits([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();

    if (!newAudit.branchId) {
      alert('يرجى اختيار الفرع');
      return;
    }

    try {
      const response = await api.post('/audits', newAudit);
      
      if (response.data.success) {
        alert('تم إنشاء الجرد بنجاح');
        setShowNewAuditModal(false);
        setNewAudit({ branchId: '', notes: '' });
        
        // الانتقال إلى صفحة الجرد
        navigate(`/audit/${response.data.audit.id}`);
      }
    } catch (error) {
      console.error('Error creating audit:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الجرد');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'IN_PROGRESS': { text: 'جاري الجرد', color: 'bg-blue-100 text-blue-800', icon: ClipboardCheck },
      'COMPLETED': { text: 'مكتمل', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'SETTLED': { text: 'تمت التسوية', color: 'bg-purple-100 text-purple-800', icon: CheckCircle }
    };

    const badge = badges[status] || badges['IN_PROGRESS'];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = audit.auditNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.branch.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    fetchAudits();
  }, [filterBranch, filterStatus]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
            جرد المخزون
          </h1>
          <p className="text-gray-600 mt-1">إدارة جرد المنتجات في الفروع</p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowNewAuditModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            جرد جديد
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="بحث برقم الجرد أو الفرع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">كل الفروع</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">كل الحالات</option>
              <option value="IN_PROGRESS">جاري الجرد</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="SETTLED">تمت التسوية</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setFilterBranch('');
              setFilterStatus('');
              setSearchTerm('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* Audits List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">جاري التحميل...</div>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد جرود</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAudits.map(audit => (
            <div key={audit.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{audit.auditNumber}</h3>
                    {getStatusBadge(audit.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-500">الفرع</div>
                      <div className="font-medium">{audit.branch.name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">عدد الأصناف</div>
                      <div className="font-medium">{audit.totalItems}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">التاريخ</div>
                      <div className="font-medium">
                        {new Date(audit.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">المستخدم</div>
                      <div className="font-medium">{audit.createdByUser.fullName}</div>
                    </div>
                  </div>

                  {/* Summary for completed audits */}
                  {(audit.status === 'COMPLETED' || audit.status === 'SETTLED') && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-500" />
                        <div>
                          <div className="text-sm text-gray-500">عجز</div>
                          <div className="font-medium text-red-600">
                            {audit.totalShortageQty} قطعة
                          </div>
                          <div className="text-xs text-gray-500">
                            {audit.totalShortageValue.toFixed(2)} ج.م
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="text-sm text-gray-500">زيادة</div>
                          <div className="font-medium text-green-600">
                            {audit.totalSurplusQty} قطعة
                          </div>
                          <div className="text-xs text-gray-500">
                            {audit.totalSurplusValue.toFixed(2)} ج.م
                          </div>
                        </div>
                      </div>

                      {audit.status === 'SETTLED' && (
                        <div className="col-span-2">
                          <div className="text-sm text-gray-500">تمت التسوية بواسطة</div>
                          <div className="font-medium">{audit.settledByUser?.fullName}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(audit.settledAt).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/audit/${audit.id}`)}
                  className="mr-4 text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Eye className="w-5 h-5" />
                  <span>عرض</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Audit Modal */}
      {showNewAuditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">إنشاء جرد جديد</h2>
            
            <form onSubmit={handleCreateAudit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفرع *
                  </label>
                  <select
                    value={newAudit.branchId}
                    onChange={(e) => setNewAudit({ ...newAudit, branchId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">اختر الفرع</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    value={newAudit.notes}
                    onChange={(e) => setNewAudit({ ...newAudit, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="أي ملاحظات عن الجرد..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  إنشاء الجرد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAuditModal(false);
                    setNewAudit({ branchId: '', notes: '' });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
