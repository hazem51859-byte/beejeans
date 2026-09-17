import { useQuery } from '@tanstack/react-query';
import { Package, Scissors, Droplet, Box, Gauge } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

export default function ProductionDashboard() {
  const { token } = useAuthStore();

  // Fetch fabric stock
  const { data: fabricData } = useQuery({
    queryKey: ['fabric-stock'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/production/fabric/stock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data || [];
    }
  });

  // Fetch manufacturing orders
  const { data: manufacturingData } = useQuery({
    queryKey: ['manufacturing-orders'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/production/manufacturing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data || [];
    }
  });

  // Fetch washing orders
  const { data: washingData } = useQuery({
    queryKey: ['washing-orders'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/production/washing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data || [];
    }
  });

  // Fetch main warehouse inventory
  const { data: inventoryData } = useQuery({
    queryKey: ['main-inventory'],
    queryFn: async () => {
      const branches = await axios.get(`${API_URL}/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mainBranch = branches.data.data?.find(b => b.code === 'MAIN');
      
      if (mainBranch) {
        const inv = await axios.get(`${API_URL}/inventory/branch/${mainBranch.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return inv.data.data || [];
      }
      return [];
    }
  });

  // Calculate totals
  const totalFabricMeters = fabricData?.reduce((sum, f) => sum + (f.availableMeters || 0), 0) || 0;
  
  const inManufacturing = manufacturingData?.filter(m => m.status === 'SENT').reduce((sum, m) => sum + (m.piecesToProduce || 0), 0) || 0;
  const inManufacturingMeters = manufacturingData?.filter(m => m.status === 'SENT').reduce((sum, m) => {
    const orderMeters = m.fabrics && m.fabrics.length > 0
      ? m.fabrics.reduce((s, f) => s + (f.metersUsed || 0), 0)
      : (m.metersUsed || 0);
    return sum + orderMeters;
  }, 0) || 0;
  
  const inWashing = washingData?.filter(w => w.status === 'SENT').reduce((sum, w) => sum + (w.manufacturingOrder?.piecesReceived || 0), 0) || 0;
  
  const availableInWarehouse = inventoryData?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">لوحة الإنتاج</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Fabric Stock */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Gauge className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              القماش
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{totalFabricMeters.toFixed(0)} متر</p>
            <p className="text-blue-100 text-sm">متاح في المخزن</p>
          </div>
        </div>

        {/* In Manufacturing */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Scissors className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              التصنيع
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{inManufacturing} قطعة</p>
            <p className="text-orange-100 text-sm">{inManufacturingMeters.toFixed(0)} متر قيد التصنيع</p>
          </div>
        </div>

        {/* In Washing */}
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Droplet className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              الغسيل
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{inWashing} قطعة</p>
            <p className="text-cyan-100 text-sm">قيد الغسيل</p>
          </div>
        </div>

        {/* Available in Warehouse */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Box className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              المخزن
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{availableInWarehouse} قطعة</p>
            <p className="text-green-100 text-sm">متاح للبيع والتوريد</p>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fabric Stock Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            مخزون القماش
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-sm font-medium">النوع</th>
                  <th className="px-4 py-2 text-right text-sm font-medium">المتاح</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fabricData?.map(fabric => (
                  <tr key={fabric.id}>
                    <td className="px-4 py-2">{fabric.fabricType?.name}</td>
                    <td className="px-4 py-2 font-semibold text-blue-600">
                      {(fabric.availableMeters || 0).toFixed(2)} متر
                    </td>
                  </tr>
                ))}
                {(!fabricData || fabricData.length === 0) && (
                  <tr>
                    <td colSpan="2" className="px-4 py-4 text-center text-gray-500">
                      لا يوجد قماش
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Products in Warehouse */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            المنتجات في المخزن الرئيسي
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-sm font-medium">المنتج</th>
                  <th className="px-4 py-2 text-right text-sm font-medium">الكمية</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventoryData?.map(inv => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2">{inv.product?.name}</td>
                    <td className="px-4 py-2 font-semibold text-green-600">
                      {inv.quantity} قطعة
                    </td>
                  </tr>
                ))}
                {(!inventoryData || inventoryData.length === 0) && (
                  <tr>
                    <td colSpan="2" className="px-4 py-4 text-center text-gray-500">
                      لا يوجد منتجات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
