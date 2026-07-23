import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

export default function FabricTypes() {
  const { token } = useAuthStore();
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    pricePerMeter: '',
    description: ''
  });

  useEffect(() => {
    fetchFabricTypes();
  }, []);

  const fetchFabricTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/fabric/types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFabricTypes(response.data.data);
    } catch (error) {
      console.error('Error fetching fabric types:', error);
      alert('فشل في جلب أنواع الخامات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/fabric/types/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('تم تحديث الخامة بنجاح');
      } else {
        await axios.post(`${API_URL}/fabric/types`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('تم إضافة الخامة بنجاح');
      }
      setShowModal(false);
      setFormData({ name: '', pricePerMeter: '', description: '' });
      setEditingId(null);
      fetchFabricTypes();
    } catch (error) {
      console.error('Error saving fabric type:', error);
      alert(error.response?.data?.message || 'فشل في حفظ الخامة');
    }
  };

  const handleEdit = (fabricType) => {
    setEditingId(fabricType.id);
    setFormData({
      name: fabricType.name,
      pricePerMeter: fabricType.pricePerMeter,
      description: fabricType.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخامة؟')) return;
    
    try {
      await axios.delete(`${API_URL}/fabric/types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم حذف الخامة بنجاح');
      fetchFabricTypes();
    } catch (error) {
      console.error('Error deleting fabric type:', error);
      alert(error.response?.data?.message || 'فشل في حذف الخامة');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">أنواع الخامات</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', pricePerMeter: '', description: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + إضافة خامة جديدة
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم الخامة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">سعر المتر</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتاح (متر)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fabricTypes.map((fabric) => (
              <tr key={fabric.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{fabric.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{fabric.pricePerMeter} ج</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {fabric.fabricStock?.availableMeters?.toFixed(2) || 0} متر
                </td>
                <td className="px-6 py-4">{fabric.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    fabric.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {fabric.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(fabric)}
                    className="text-blue-600 hover:text-blue-900 ml-4"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(fabric.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'تعديل الخامة' : 'إضافة خامة جديدة'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">اسم الخامة *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">سعر المتر (ج) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerMeter}
                  onChange={(e) => setFormData({ ...formData, pricePerMeter: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows="3"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: '', pricePerMeter: '', description: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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
