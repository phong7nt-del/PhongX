import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { X, Map as MapIcon, Loader2, Navigation, AlertTriangle, Route } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix typical React-Leaflet icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon with number
const createNumberedIcon = (num: number) => {
  return L.divIcon({
    className: 'custom-numbered-icon',
    html: `<div style="background-color: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px;">${num}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

// Map bounds updater component
const MapUpdater = ({ points }: { points: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

interface RouteOptimizerProps {
  customers: any[];
  onClose: () => void;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const RouteOptimizer: React.FC<RouteOptimizerProps> = ({ customers, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'geocoding' | 'routing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [geocodedPoints, setGeocodedPoints] = useState<any[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<any[]>([]);
  const [optimizedCustomers, setOptimizedCustomers] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const MAX_CUSTOMERS = 30; // Max allowed to prevent excessive API limits and lag
  const targetCustomers = useMemo(() => customers.slice(0, MAX_CUSTOMERS), [customers]);

  useEffect(() => {
    let isCancelled = false;

    const processRoute = async () => {
      setStatus('geocoding');
      setProgress({ current: 0, total: targetCustomers.length });
      
      const points = [];
      let currentIdx = 0;

      // 1. Geocoding
      for (const customer of targetCustomers) {
        if (isCancelled) return;
        currentIdx++;
        setProgress(p => ({ ...p, current: currentIdx }));

        const address = customer.DCHI_KHANG;
        if (!address) continue;

        // Clean address and force Vietnam context
        const queryAddress = address.replace(/(ấp|thôn|xóm)\s+/gi, '').trim() + ', Việt Nam';
        const cacheKey = `geo_v2_${queryAddress}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        let point = null;
        if (cached) {
          point = JSON.parse(cached);
        } else {
          try {
            await sleep(1100); // Nominatim limit: 1 request/second
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddress)}&limit=1&countrycodes=vn`);
            const data = await res.json();
            if (data && data.length > 0) {
              point = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
              sessionStorage.setItem(cacheKey, JSON.stringify(point));
            }
          } catch (e) {
            console.warn("Geocoding failed for:", address);
          }
        }

        if (point) {
          points.push({ customer, ...point });
        }
      }

      if (isCancelled) return;

      if (points.length < 2) {
        setErrorMsg('Không tìm đủ tọa độ địa chỉ cho ít nhất 2 khách hàng để vẽ lộ trình.');
        setStatus('error');
        return;
      }

      setGeocodedPoints(points);
      setStatus('routing');

      // 2. Routing & TSP Calculation via OSRM
      try {
        const coordsStr = points.map(p => `${p.lon},${p.lat}`).join(';');
        // Use OSRM trip API which basically solves TSP
        const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordsStr}?roundtrip=false&source=first&overview=full&geometries=geojson`);
        const tripData = await res.json();

        if (isCancelled) return;

        if (tripData.code === 'Ok' && tripData.waypoints && tripData.trips && tripData.trips.length > 0) {
          // waypoints array gives us the optimized order. It tells us point N is at waypoint_index X.
          const orderedPoints = new Array(points.length);
          tripData.waypoints.forEach((wp: any, i: number) => {
            orderedPoints[wp.waypoint_index] = points[i];
          });

          // OSRM trips[0].geometry.coordinates has [lon, lat] pairs. Leaflet uses [lat, lon].
          const routeLatLngs = tripData.trips[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          
          setOptimizedCustomers(orderedPoints);
          setRouteGeometry(routeLatLngs);
          setStatus('done');
        } else {
          throw new Error('Dữ liệu lộ trình không hợp lệ.');
        }
      } catch (err) {
        if (!isCancelled) {
          setErrorMsg('Lỗi tính toán lộ trình từ server bản đồ. Vui lòng thử lại sau.');
          setStatus('error');
        }
      }
    };

    processRoute();

    return () => { isCancelled = true; };
  }, [targetCustomers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Route className="h-6 w-6 text-red-600" />
              Lộ trình khuyến cáo (Tối ưu chặn đường)
            </h2>
            {customers.length > MAX_CUSTOMERS && (
              <p className="text-sm text-amber-600 font-medium flex items-center gap-1 mt-1">
                <AlertTriangle className="h-4 w-4" />
                Do giới hạn API bản đồ miễn phí, hệ thống chỉ hỗ trợ tính toán tối đa {MAX_CUSTOMERS} khách hàng đầu tiên.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Sử dụng thuật toán tối ưu TSP (Traveling Salesperson) cho Xe Máy</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-gray-50">
          
          {status === 'geocoding' && (
            <div className="text-center p-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Đang xác định tọa độ khách hàng...</h3>
              <p className="text-gray-500 text-sm mb-4">Mô phỏng vị trí bản đồ ({progress.current}/{progress.total})</p>
              <p className="text-xs text-amber-600 font-medium max-w-xs mx-auto">
                Chú ý: Dịch vụ bản đồ công cộng quy định giới hạn xử lý 1 địa chỉ/giây. Vui lòng chờ...
              </p>
            </div>
          )}

          {status === 'routing' && (
            <div className="text-center p-8">
              <Navigation className="h-12 w-12 animate-pulse text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Đang thuật toán hóa lộ trình ngắn nhất...</h3>
              <p className="text-gray-500 text-sm">Phân tích đường thủy, một chiều và các hẻm hẹp...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center p-8">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Không thể tạo lộ trình</h3>
              <p className="text-gray-600">{errorMsg}</p>
              <button 
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="absolute inset-0 flex flex-col lg:flex-row h-full w-full">
              {/* Map View */}
              <div className="flex-1 h-[50vh] lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 z-0 relative">
                <MapContainer center={[10.762622, 106.660172]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {optimizedCustomers.map((pt, i) => (
                    <Marker key={pt.customer.MA_KHANG} position={[pt.lat, pt.lon]} icon={createNumberedIcon(i + 1)}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold text-gray-900 mb-1">{i + 1}. {pt.customer.TEN_KHANG}</p>
                          <p className="text-gray-600 text-xs mb-1">Mã KH: {pt.customer.MA_KHANG}</p>
                          <p className="text-red-600 font-semibold mb-2">{formatCurrency(pt.customer.TONG_NO)}</p>
                          <p className="text-gray-500 text-xs">{pt.customer.DCHI_KHANG}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {routeGeometry.length > 0 && (
                    <Polyline positions={routeGeometry} color="#3b82f6" weight={5} opacity={0.7} />
                  )}
                  {geocodedPoints.length > 0 && <MapUpdater points={geocodedPoints} />}
                </MapContainer>
              </div>

              {/* Sidebar List */}
              <div className="w-full lg:w-96 h-[50vh] lg:h-full bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
                <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/50">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-blue-600" />
                    Thứ tự thu cước tối ưu nhất
                  </h3>
                  <p className="text-sm text-blue-600 mt-1">Đã tối ưu {optimizedCustomers.length} điểm dừng để tiết kiệm xăng & thời gian.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {optimizedCustomers.map((pt, i) => (
                    <div key={pt.customer.MA_KHANG} className={`group relative pl-10 pr-4 py-3 bg-white border ${i === 0 ? 'border-green-200 shadow-sm' : 'border-gray-100 hover:border-blue-200 hover:shadow-sm'} rounded-xl transition-all`}>
                      {/* Step Number Line */}
                      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-3 z-10 ${i === 0 ? 'bg-green-500 ring-4 ring-green-50' : 'bg-gray-400 group-hover:bg-blue-500'}`}>
                          {i + 1}
                        </div>
                        {i < optimizedCustomers.length - 1 && (
                          <div className="flex-1 w-[2px] bg-gray-100 mt-2 mb-[-1rem]"></div>
                        )}
                      </div>
                      
                      <div>
                        {i === 0 && <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded mb-1">Điểm Xuất Phát</span>}
                        <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{pt.customer.TEN_KHANG}</h4>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            {pt.customer.MA_KHANG}
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(pt.customer.TONG_NO)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 flex items-start gap-1 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
                          <MapIcon className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed line-clamp-2" title={pt.customer.DCHI_KHANG}>{pt.customer.DCHI_KHANG}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {targetCustomers.length > optimizedCustomers.length && (
                     <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                       <p className="font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Không thể định vị {targetCustomers.length - optimizedCustomers.length} địa chỉ</p>
                       <p className="text-xs mt-1">Một số địa chỉ có thể nhận diện sai hoặc quá chung chung nên đã được loại khỏi lộ trình vẽ.</p>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
