import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Loader2, AlertCircle, FileSpreadsheet, Users, Receipt, Search } from 'lucide-react';
import { cn } from './lib/utils';

const SPREADSHEET_ID = '1ORxFm7PvaDSRvSoNCC5ksBKjk9BEwEfrrOkGIapl9H4';
const TON_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Ton`;
const CHIANHOM_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=ChiaNhom`;

// Normalize keys to uppercase and trim
const normalizeData = (data: any[]) => {
  return data.map(row => {
    const newRow: any = {};
    for (const key in row) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        newRow[key.trim().toUpperCase()] = row[key];
      }
    }
    return newRow;
  });
};

export default function App() {
  const [tonData, setTonData] = useState<any[]>([]);
  const [chiaNhomData, setChiaNhomData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedGroupTab3, setSelectedGroupTab3] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tonRes, chiaNhomRes] = await Promise.all([
          new Promise<any[]>((resolve, reject) => {
            Papa.parse(TON_URL, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(normalizeData(results.data)),
              error: (err) => reject(err),
            });
          }),
          new Promise<any[]>((resolve, reject) => {
            Papa.parse(CHIANHOM_URL, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(normalizeData(results.data)),
              error: (err) => reject(err),
            });
          })
        ]);

        setTonData(tonRes);
        setChiaNhomData(chiaNhomRes);
      } catch (err: any) {
        console.error(err);
        setError('Không thể tải dữ liệu từ Google Sheets. Vui lòng kiểm tra lại quyền truy cập của link (cần chia sẻ "Bất kỳ ai có liên kết đều có thể xem").');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extract unique groups
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    chiaNhomData.forEach(row => {
      const nhom = row['NHÓM'] || row['NHOM'];
      if (nhom) groupSet.add(nhom);
    });
    return Array.from(groupSet).sort();
  }, [chiaNhomData]);

  // Map Ma_Khang to Nhom
  const khangToNhom = useMemo(() => {
    const map = new Map<string, string>();
    chiaNhomData.forEach(row => {
      const maKhang = row['MA_KHANG'];
      const nhom = row['NHÓM'] || row['NHOM'];
      if (maKhang && nhom) {
        map.set(maKhang, nhom);
      }
    });
    return map;
  }, [chiaNhomData]);

  // Aggregate ALL data by Ma_Khang first
  const allAggregatedData = useMemo(() => {
    const aggregated = new Map<string, any>();
    
    tonData.forEach(row => {
      const maKhang = row['MA_KHANG'];
      const tongNo = parseFloat(row['TONG_NO'] || '0') || 0;
      const nhom = khangToNhom.get(maKhang) || 'Không xác định';
      
      if (aggregated.has(maKhang)) {
        const existing = aggregated.get(maKhang);
        existing.SO_KY += 1;
        existing.TONG_NO += tongNo;
        existing.HD_TON += 1;
      } else {
        aggregated.set(maKhang, {
          MA_KVUC: row['MA_KVUC'] || '',
          NHOM: nhom,
          MA_KHANG: maKhang,
          TEN_KHANG: row['TEN_KHANG'] || '',
          SO_KY: 1,
          TONG_NO: tongNo,
          HD_TON: 1,
          DTHOAI_DVU: row['DTHOAI_DVU'] || '',
          MA_SOGCS: row['MA_SOGCS'] || '',
          SO_TBI: row['SO_TBI'] || '',
          DCHI_KHANG: row['DCHI_KHANG'] || '',
        });
      }
    });
    return Array.from(aggregated.values());
  }, [tonData, khangToNhom]);

  // Process data for Tab 1 (Selected Group)
  const tab1Data = useMemo(() => {
    if (!selectedGroup) return null;

    const groupData = allAggregatedData.filter(item => item.NHOM === selectedGroup);

    const sortedData = [...groupData].sort((a, b) => {
      if (a.SO_KY !== b.SO_KY) {
        return b.SO_KY - a.SO_KY;
      }
      return b.TONG_NO - a.TONG_NO;
    });

    const detailedList = sortedData.map((item, index) => {
      const stt = index + 1;
      return {
        STT: stt,
        DANHSO: `${item.MA_KVUC}${stt}`,
        ...item
      };
    });

    const hdTon = groupData.reduce((sum, item) => sum + item.HD_TON, 0);

    return {
      summary: {
        NHOM: selectedGroup,
        KH_TON: groupData.length,
        HD_TON: hdTon,
      },
      details: detailedList
    };
  }, [selectedGroup, allAggregatedData]);

  // Process data for Tab 3 (>= 5M)
  const tab3Data = useMemo(() => {
    if (!selectedGroupTab3) return null;

    let filteredData = allAggregatedData.filter(item => item.TONG_NO >= 5000000);

    if (selectedGroupTab3 !== 'Công ty') {
      filteredData = filteredData.filter(item => item.NHOM === selectedGroupTab3);
    }

    const sortedData = [...filteredData].sort((a, b) => {
      if (a.SO_KY !== b.SO_KY) {
        return b.SO_KY - a.SO_KY;
      }
      return b.TONG_NO - a.TONG_NO;
    });

    const detailedList = sortedData.map((item, index) => {
      const stt = index + 1;
      return {
        STT: stt,
        DANHSO: `${item.MA_KVUC}${stt}`,
        ...item
      };
    });

    const hdTon = filteredData.reduce((sum, item) => sum + item.HD_TON, 0);

    return {
      summary: {
        NHOM: selectedGroupTab3,
        KH_TON: filteredData.length,
        HD_TON: hdTon,
      },
      details: detailedList
    };
  }, [selectedGroupTab3, allAggregatedData]);

  // Process data for Tab 2 (All Groups Summary)
  const tab2Data = useMemo(() => {
    const summaryByGroup = new Map<string, { KH_TON: Set<string>, HD_TON: number, TONG_NO: number }>();
    
    groups.forEach(g => {
      summaryByGroup.set(g, { KH_TON: new Set(), HD_TON: 0, TONG_NO: 0 });
    });

    tonData.forEach(row => {
      const maKhang = row['MA_KHANG'];
      const nhom = khangToNhom.get(maKhang);
      const tongNo = parseFloat(row['TONG_NO'] || '0') || 0;
      
      if (nhom && summaryByGroup.has(nhom)) {
        const groupStat = summaryByGroup.get(nhom)!;
        groupStat.KH_TON.add(maKhang);
        groupStat.HD_TON += 1;
        groupStat.TONG_NO += tongNo;
      }
    });

    const result = Array.from(summaryByGroup.entries()).map(([nhom, stats]) => ({
      NHOM: nhom,
      KH_TON: stats.KH_TON.size,
      HD_TON: stats.HD_TON,
      TONG_NO: stats.TONG_NO
    }));

    const total = result.reduce((acc, curr) => ({
      NHOM: 'TỔNG CỘNG',
      KH_TON: acc.KH_TON + curr.KH_TON,
      HD_TON: acc.HD_TON + curr.HD_TON,
      TONG_NO: acc.TONG_NO + curr.TONG_NO
    }), { NHOM: 'TỔNG CỘNG', KH_TON: 0, HD_TON: 0, TONG_NO: 0 });

    return {
      groups: result,
      total
    };
  }, [tonData, khangToNhom, groups]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const renderDetailsTable = (details: any[], showGroupColumn: boolean = false) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">STT</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">DANHSO</th>
            {showGroupColumn && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nhóm</th>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mã Khách</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Tên Khách</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Số Kỳ</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tổng Nợ</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Điện Thoại</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mã Sổ GCS</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Số TBI</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">Địa Chỉ</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {details.length === 0 ? (
            <tr>
              <td colSpan={showGroupColumn ? 11 : 10} className="px-6 py-8 text-center text-gray-500">
                Không có dữ liệu tồn nợ cho nhóm này.
              </td>
            </tr>
          ) : (
            details.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.STT}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.DANHSO}</td>
                {showGroupColumn && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.NHOM}</td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{row.MA_KHANG}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.TEN_KHANG}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.SO_KY}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right">{formatCurrency(row.TONG_NO)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.DTHOAI_DVU}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.MA_SOGCS}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.SO_TBI}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{row.DCHI_KHANG}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Thống Kê Tồn Nợ</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-500">Đang tải dữ liệu từ Google Sheets...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium text-lg">Lỗi tải dữ liệu</h3>
              <p className="text-red-600 mt-1">{error}</p>
              <p className="text-red-600 mt-2 text-sm">
                Hướng dẫn: Mở Google Sheet &gt; Nhấn nút "Chia sẻ" (Share) ở góc trên bên phải &gt; Trong phần "Quyền truy cập chung" (General access), chọn "Bất kỳ ai có liên kết" (Anyone with the link) &gt; Nhấn "Xong" (Done).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('tab1')}
                  className={cn(
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === 'tab1'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Tab 1: Chi tiết theo nhóm
                </button>
                <button
                  onClick={() => setActiveTab('tab2')}
                  className={cn(
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === 'tab2'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Tab 2: Thống kê tổng hợp
                </button>
                <button
                  onClick={() => setActiveTab('tab3')}
                  className={cn(
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === 'tab3'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Tab 3: Khách hàng từ 5 triệu
                </button>
              </nav>
            </div>

            {/* Tab 1 Content */}
            {activeTab === 'tab1' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn nhóm quản lý
                  </label>
                  <div className="relative max-w-md">
                    <select
                      id="group-select"
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border appearance-none bg-white"
                    >
                      <option value="">-- Chọn một nhóm --</option>
                      {groups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {selectedGroup && tab1Data && (
                  <div className="space-y-6">
                    {/* Thông tin 1: Tổng quát tồn */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 1: Tổng quát tồn</h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                          <dd className="mt-2 text-2xl font-semibold text-blue-900">{tab1Data.summary.NHOM}</dd>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn (KH_Ton)</dt>
                          <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                            <Users className="h-5 w-5 opacity-70" />
                            {tab1Data.summary.KH_TON}
                          </dd>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn (HD_Ton)</dt>
                          <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                            <Receipt className="h-5 w-5 opacity-70" />
                            {tab1Data.summary.HD_TON}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Thông tin 2: Thống kê chi tiết */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 2: Chi tiết tồn của nhân viên</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tab1Data.details.length} bản ghi
                        </span>
                      </div>
                      {renderDetailsTable(tab1Data.details, false)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2 Content */}
            {activeTab === 'tab2' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Thống kê nợ của từng nhóm</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số Khách Hàng Tồn (KH_Ton)</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số Hóa Đơn Tồn (HD_Ton)</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Nợ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tab2Data.groups.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.NHOM}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.KH_TON}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.HD_TON}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right">{formatCurrency(row.TONG_NO)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{tab2Data.total.NHOM}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{tab2Data.total.KH_TON}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{tab2Data.total.HD_TON}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(tab2Data.total.TONG_NO)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3 Content */}
            {activeTab === 'tab3' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <label htmlFor="group-select-tab3" className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn nhóm quản lý (Khách hàng nợ &ge; 5 triệu)
                  </label>
                  <div className="relative max-w-md">
                    <select
                      id="group-select-tab3"
                      value={selectedGroupTab3}
                      onChange={(e) => setSelectedGroupTab3(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border appearance-none bg-white"
                    >
                      <option value="">-- Chọn một nhóm --</option>
                      <option value="Công ty" className="font-semibold text-blue-600">Công ty (Tất cả khách hàng)</option>
                      {groups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {selectedGroupTab3 && tab3Data && (
                  <div className="space-y-6">
                    {/* Thông tin 1: Tổng quát tồn */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 1: Tổng quát tồn (&ge; 5 triệu)</h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                          <dd className="mt-2 text-2xl font-semibold text-blue-900">{tab3Data.summary.NHOM}</dd>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn (KH_Ton)</dt>
                          <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                            <Users className="h-5 w-5 opacity-70" />
                            {tab3Data.summary.KH_TON}
                          </dd>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn (HD_Ton)</dt>
                          <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                            <Receipt className="h-5 w-5 opacity-70" />
                            {tab3Data.summary.HD_TON}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Thông tin 2: Thống kê chi tiết */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 2: Chi tiết tồn của nhân viên (&ge; 5 triệu)</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tab3Data.details.length} bản ghi
                        </span>
                      </div>
                      {renderDetailsTable(tab3Data.details, selectedGroupTab3 === 'Công ty')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

