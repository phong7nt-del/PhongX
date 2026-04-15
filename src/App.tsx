import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, FileSpreadsheet, Users, Receipt, Search, Download, MapPin, Phone, MessageSquare, BarChart3, Star, Edit2, Check, X, ClipboardList } from 'lucide-react';
import { cn } from './lib/utils';

const SPREADSHEET_ID = '1ORxFm7PvaDSRvSoNCC5ksBKjk9BEwEfrrOkGIapl9H4';
const TON_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Ton`;
const CHIANHOM_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=ChiaNhom`;
const KHUVUC_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=KhuVuc`;
const CAPNHATSDT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=CapNhatSDT`;

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
  const [khuVucData, setKhuVucData] = useState<any[]>([]);
  const [capNhatSdtData, setCapNhatSdtData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5'>('tab1');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedGroupTab3, setSelectedGroupTab3] = useState<string>('');
  const [activeRegionTab, setActiveRegionTab] = useState<string>('Vũng Tàu');
  
  // Tab 4 Search State
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [searchExactInput, setSearchExactInput] = useState(false);
  const [searchParams, setSearchParams] = useState({ query: '', exact: false, hasSearched: false });
  
  // Phone Update State
  const [updatedPhones, setUpdatedPhones] = useState<Record<string, string>>({});
  const [phoneUpdateLog, setPhoneUpdateLog] = useState<any[]>([]);
  const [editingPhone, setEditingPhone] = useState<{ maKhang: string, currentPhone: string } | null>(null);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'Mới đề nghị' | 'Đã cập nhật'>('Mới đề nghị');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tonRes, chiaNhomRes, khuVucRes, capNhatSdtRes] = await Promise.all([
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
          }),
          new Promise<any[]>((resolve, reject) => {
            Papa.parse(KHUVUC_URL, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(normalizeData(results.data)),
              error: (err) => resolve([]), // Don't fail if sheet doesn't exist
            });
          }),
          new Promise<any[]>((resolve, reject) => {
            Papa.parse(CAPNHATSDT_URL, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(normalizeData(results.data)),
              error: (err) => resolve([]), // Don't fail if sheet doesn't exist
            });
          })
        ]);

        setTonData(tonRes);
        setChiaNhomData(chiaNhomRes);
        setKhuVucData(khuVucRes);
        setCapNhatSdtData(capNhatSdtRes);
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

  // Map Nhom to KhuVuc
  const nhomToKhuVuc = useMemo(() => {
    const map = new Map<string, string>();
    khuVucData.forEach(row => {
      const nhom = row['NHÓM'] || row['NHOM'] || row['TÊN NHÓM'];
      const khuVuc = row['KHU VỰC'] || row['KHUVUC'] || row['KHU_VUC'];
      if (nhom && khuVuc) {
        map.set(nhom, khuVuc);
      }
    });
    return map;
  }, [khuVucData]);

  // Combine fetched CapNhatSDT and current session phoneUpdateLog
  const allUpdates = useMemo(() => {
    const fetchedUpdates = capNhatSdtData.map(row => ({
      NHOM: row['NHÓM'] || row['NHOM'] || '',
      MA_KHANG: row['MÃ KHÁCH HÀNG'] || row['MA_KHANG'] || row['MÃ KHÁCH'] || '',
      TEN_KHANG: row['TÊN KHÁCH'] || row['TEN_KHANG'] || row['TÊN KHÁCH HÀNG'] || '',
      DCHI_KHANG: row['ĐỊA CHỈ'] || row['DIA_CHI'] || row['DCHI_KHANG'] || '',
      DTHOAI_CU: row['DTHOAI_DVU CU'] || row['ĐIỆN THOẠI CŨ'] || row['SDT_CU'] || row['DTHOAI_CU'] || '',
      DTHOAI_MOI: row['DTHOAI_DVU MOI'] || row['ĐIỆN THOẠI MỚI'] || row['SDT_MOI'] || row['DTHOAI_MOI'] || '',
      THOI_GIAN: row['TGIAN_CAPNHAT'] || row['THỜI GIAN CẬP NHẬT'] || row['THOI_GIAN'] || row['NGÀY'] || ''
    })).filter(row => row.MA_KHANG);

    const fetchedMaKhangs = new Set(fetchedUpdates.map(u => u.MA_KHANG));
    const sessionUpdates = phoneUpdateLog.filter(u => !fetchedMaKhangs.has(u.MA_KHANG));

    return [...fetchedUpdates, ...sessionUpdates].map(u => ({
      ...u,
      TRANG_THAI: statusUpdates[u.MA_KHANG] || u.TRANG_THAI || 'Mới đề nghị'
    }));
  }, [capNhatSdtData, phoneUpdateLog, statusUpdates]);

  // Group updates by Region
  const updatesByRegion = useMemo(() => {
    const grouped: Record<string, any[]> = {
      'Vũng Tàu': [],
      'Bà Rịa': [],
      'Phú Mỹ': [],
      'Côn Đảo': [],
      'Khác': []
    };

    allUpdates.filter(u => u.TRANG_THAI === statusFilter).forEach(update => {
      const region = nhomToKhuVuc.get(update.NHOM) || update.NHOM || 'Khác';
      const regionLower = region.toLowerCase();
      if (regionLower.includes('vũng tàu') || regionLower.includes('vung tau')) grouped['Vũng Tàu'].push(update);
      else if (regionLower.includes('bà rịa') || regionLower.includes('ba ria')) grouped['Bà Rịa'].push(update);
      else if (regionLower.includes('phú mỹ') || regionLower.includes('phu my')) grouped['Phú Mỹ'].push(update);
      else if (regionLower.includes('côn đảo') || regionLower.includes('con dao')) grouped['Côn Đảo'].push(update);
      else grouped['Khác'].push(update);
    });

    return grouped;
  }, [allUpdates, nhomToKhuVuc, statusFilter]);

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
    const tongNo = groupData.reduce((sum, item) => sum + item.TONG_NO, 0);

    return {
      summary: {
        NHOM: selectedGroup,
        KH_TON: groupData.length,
        HD_TON: hdTon,
        TONG_NO: tongNo,
      },
      details: detailedList
    };
  }, [selectedGroup, allAggregatedData]);

  // Process data for Tab 4 (Search)
  const searchResults = useMemo(() => {
    if (!searchParams.hasSearched || !searchParams.query.trim()) return [];
    
    const query = searchParams.exact ? searchParams.query.trim() : searchParams.query.trim().toLowerCase();
    
    return tonData.filter(row => {
      const ma = (row['MA_KHANG'] || '').toString();
      const ten = (row['TEN_KHANG'] || '').toString();
      const dchi = (row['DCHI_KHANG'] || '').toString();
      
      let matchMa = false;
      let matchTen = false;
      let matchDchi = false;

      if (searchParams.exact) {
        matchMa = ma === query;
        matchTen = ten === query;
        matchDchi = dchi === query;
      } else {
        matchMa = ma.toLowerCase().includes(query);
        matchTen = ten.toLowerCase().includes(query);
        matchDchi = dchi.toLowerCase().includes(query);
      }

      return matchMa || matchTen || matchDchi;
    }).map((row, index) => ({
      ...row,
      STT: index + 1,
      NHOM: khangToNhom.get(row['MA_KHANG']) || 'Không xác định',
      THANG_HD: row['THANG'] || row['Thang'] || row['thang'] || '',
      NAM_HD: row['NAM'] || row['Nam'] || row['nam'] || '',
      KY_HD: row['KY'] || row['Ky'] || row['ky'] || '',
      TONG_NO: parseFloat(row['TONG_NO'] || '0') || 0
    }));
  }, [tonData, searchParams, khangToNhom]);

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
    const tongNo = filteredData.reduce((sum, item) => sum + item.TONG_NO, 0);

    return {
      summary: {
        NHOM: selectedGroupTab3,
        KH_TON: filteredData.length,
        HD_TON: hdTon,
        TONG_NO: tongNo,
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

  const handleExportExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleUpdatePhone = async (row: any) => {
    if (!newPhoneInput.trim() || isUpdatingPhone) return;
    
    const newPhone = newPhoneInput.trim();
    const currentPhone = row.DTHOAI_DVU || '';
    
    setIsUpdatingPhone(true);
    
    try {
      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      
      const payload = {
        action: 'updatePhone',
        nhom: row.NHOM || '',
        maKhang: row.MA_KHANG || '',
        tenKhang: row.TEN_KHANG || '',
        diaChi: row.DCHI_KHANG || '',
        sdtCu: currentPhone,
        sdtMoi: newPhone,
        thoiGian: formattedDate,
        trangThai: 'Mới đề nghị'
      };

      // Call Google Apps Script Web App
      await fetch('https://script.google.com/macros/s/AKfycbxPNRJ24wCy7dgrSQ21E3_ZZTNzW8GvfHoA1_qH13qkVNV3IVOy7FPUmb0O0rj6MbGm/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });

      // Update local state
      setUpdatedPhones(prev => ({
        ...prev,
        [row.MA_KHANG]: newPhone
      }));
      
      // Add to log
      setPhoneUpdateLog(prev => [
        ...prev,
        {
          STT: prev.length + 1,
          NHOM: row.NHOM,
          MA_KHANG: row.MA_KHANG,
          TEN_KHANG: row.TEN_KHANG,
          DCHI_KHANG: row.DCHI_KHANG,
          DTHOAI_CU: currentPhone,
          DTHOAI_MOI: newPhone,
          THOI_GIAN: formattedDate,
          TRANG_THAI: 'Mới đề nghị'
        }
      ]);
      
      setEditingPhone(null);
      setNewPhoneInput('');
    } catch (error) {
      console.error('Error updating phone:', error);
      alert('Có lỗi xảy ra khi cập nhật số điện thoại. Vui lòng thử lại!');
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleUpdateStatus = async (update: any) => {
    try {
      const payload = {
        action: 'updateStatus',
        maKhang: update.MA_KHANG,
        trangThai: 'Đã cập nhật'
      };

      await fetch('https://script.google.com/macros/s/AKfycbxPNRJ24wCy7dgrSQ21E3_ZZTNzW8GvfHoA1_qH13qkVNV3IVOy7FPUmb0O0rj6MbGm/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });

      // Update local state
      setStatusUpdates(prev => ({
        ...prev,
        [update.MA_KHANG]: 'Đã cập nhật'
      }));
      
      alert(`Đã cập nhật trạng thái cho khách hàng ${update.TEN_KHANG}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái. Vui lòng thử lại!');
    }
  };

  const getPhoneActions = (phoneStr: string) => {
    if (!phoneStr) return null;
    const match = phoneStr.match(/(?:\+84|0)[0-9]{8,9}/);
    const phone = match ? match[0] : phoneStr.replace(/[^0-9+]/g, '');
    if (!phone) return null;

    return (
      <div className="flex items-center gap-1 mt-2">
        <a href={`tel:${phone}`} title="Gọi điện" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
          <Phone className="h-3.5 w-3.5" />
        </a>
        <a href={`sms:${phone}`} title="Nhắn tin SMS" className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors">
          <MessageSquare className="h-3.5 w-3.5" />
        </a>
        <a href={`https://zalo.me/${phone.replace(/^\+84/, '0')}`} target="_blank" rel="noopener noreferrer" title="Chat Zalo" className="px-2 py-1 text-xs font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
          Zalo
        </a>
      </div>
    );
  };

  const renderSearchTable = (details: any[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">STT</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nhóm</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mã Khách</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Tên Khách</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Kỳ HĐ</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tháng HĐ</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Năm HĐ</th>
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
                <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                  Không tìm thấy dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              details.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.STT}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.NHOM}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{row.MA_KHANG}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.TEN_KHANG}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.KY_HD}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.THANG_HD}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.NAM_HD}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right">{formatCurrency(row.TONG_NO)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingPhone?.maKhang === row.MA_KHANG ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newPhoneInput}
                          onChange={(e) => setNewPhoneInput(e.target.value)}
                          className="w-32 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nhập SĐT mới"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdatePhone(row);
                            if (e.key === 'Escape') setEditingPhone(null);
                          }}
                        />
                        <button onClick={() => handleUpdatePhone(row)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingPhone(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU}</div>
                          {getPhoneActions(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU)}
                        </div>
                        <button 
                          onClick={() => {
                            setEditingPhone({ maKhang: row.MA_KHANG, currentPhone: updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU });
                            setNewPhoneInput(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || '');
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          title="Cập nhật số điện thoại"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.MA_SOGCS}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.SO_TBI}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-start justify-between gap-2">
                      <span>{row.DCHI_KHANG}</span>
                      {row.DCHI_KHANG && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.DCHI_KHANG)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Chỉ đường trên Google Maps"
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-md shrink-0 transition-colors"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDetailsTable = (details: any[], showGroupColumn: boolean = false) => {
    return (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingPhone?.maKhang === row.MA_KHANG ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newPhoneInput}
                          onChange={(e) => setNewPhoneInput(e.target.value)}
                          className="w-32 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nhập SĐT mới"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdatePhone(row);
                            if (e.key === 'Escape') setEditingPhone(null);
                          }}
                        />
                        <button onClick={() => handleUpdatePhone(row)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingPhone(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU}</div>
                          {getPhoneActions(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU)}
                        </div>
                        <button 
                          onClick={() => {
                            setEditingPhone({ maKhang: row.MA_KHANG, currentPhone: updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU });
                            setNewPhoneInput(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || '');
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          title="Cập nhật số điện thoại"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.MA_SOGCS}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.SO_TBI}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-start justify-between gap-2">
                      <span>{row.DCHI_KHANG}</span>
                      {row.DCHI_KHANG && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.DCHI_KHANG)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Chỉ đường trên Google Maps"
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-md shrink-0 transition-colors"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-lg border-b border-blue-950 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Logo_EVN.svg/512px-Logo_EVN.svg.png" alt="EVN Logo" className="h-10 object-contain" onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = "https://evnhcmc.vn/images/logo.png";
                }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">Hệ Thống Quản Lý Tồn Nợ</h1>
                <p className="text-blue-200 text-sm font-medium mt-0.5">Công ty Điện lực Vũng Tàu</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-blue-100 font-medium text-sm">Nguyễn Thành Phong - Đội QLTG</div>
              <div className="text-blue-300 text-xs mt-0.5 font-mono">Version: 2026.4.1</div>
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
            <div className="pb-2 overflow-x-auto">
              <nav className="flex space-x-4 min-w-max px-1 pt-1" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('tab1')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-b-4",
                    activeTab === 'tab1'
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-700 shadow-md transform translate-y-0"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-blue-600 shadow-sm"
                  )}
                >
                  <Users className={cn("h-5 w-5", activeTab === 'tab1' ? "text-blue-100" : "text-blue-500")} />
                  Tab 1: Chi tiết theo nhóm
                </button>
                <button
                  onClick={() => setActiveTab('tab2')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-b-4",
                    activeTab === 'tab2'
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-700 shadow-md transform translate-y-0"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-emerald-600 shadow-sm"
                  )}
                >
                  <BarChart3 className={cn("h-5 w-5", activeTab === 'tab2' ? "text-emerald-100" : "text-emerald-500")} />
                  Tab 2: Thống kê tổng hợp
                </button>
                <button
                  onClick={() => setActiveTab('tab3')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-b-4",
                    activeTab === 'tab3'
                      ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-700 shadow-md transform translate-y-0"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-purple-600 shadow-sm"
                  )}
                >
                  <Star className={cn("h-5 w-5", activeTab === 'tab3' ? "text-purple-100" : "text-purple-500")} />
                  Tab 3: Khách hàng &ge; 5 triệu
                </button>
                <button
                  onClick={() => setActiveTab('tab4')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-b-4",
                    activeTab === 'tab4'
                      ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-700 shadow-md transform translate-y-0"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-orange-600 shadow-sm"
                  )}
                >
                  <Search className={cn("h-5 w-5", activeTab === 'tab4' ? "text-orange-100" : "text-orange-500")} />
                  Tab 4: Tìm kiếm
                </button>
                <button
                  onClick={() => setActiveTab('tab5')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-b-4 relative",
                    activeTab === 'tab5'
                      ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white border-pink-700 shadow-md transform translate-y-0"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-pink-600 shadow-sm"
                  )}
                >
                  <div className="relative">
                    <ClipboardList className={cn("h-5 w-5", activeTab === 'tab5' ? "text-pink-100" : "text-pink-500")} />
                    {allUpdates.length > 0 && (
                      <span className="absolute -top-2 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {allUpdates.length}
                      </span>
                    )}
                  </div>
                  Tab 5: Đề nghị cập nhật
                </button>
              </nav>
            </div>
            
            {/* Phone Update Export Button (Global) */}
            {phoneUpdateLog.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <Phone className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-amber-900 font-medium">Đã cập nhật {phoneUpdateLog.length} số điện thoại</h4>
                    <p className="text-amber-700 text-sm">Xuất file Excel để cập nhật vào sheet CapNhatSDT</p>
                  </div>
                </div>
                <button
                  onClick={() => handleExportExcel(phoneUpdateLog, `CapNhatSDT_${new Date().getTime()}`)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Xuất danh sách cập nhật
                </button>
              </div>
            )}

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
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                          <dd className="mt-2 text-2xl font-semibold text-blue-900">{tab1Data.summary.NHOM}</dd>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn</dt>
                          <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                            <Users className="h-5 w-5 opacity-70" />
                            {tab1Data.summary.KH_TON}
                          </dd>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn</dt>
                          <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                            <Receipt className="h-5 w-5 opacity-70" />
                            {tab1Data.summary.HD_TON}
                          </dd>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                          <dt className="text-sm font-medium text-red-800 truncate">Tổng Tiền</dt>
                          <dd className="mt-2 text-2xl font-semibold text-red-900 flex items-center gap-2">
                            {formatCurrency(tab1Data.summary.TONG_NO)}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Thông tin 2: Thống kê chi tiết */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 2: Chi tiết tồn của nhân viên</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tab1Data.details.length} bản ghi
                          </span>
                        </div>
                        <button
                          onClick={() => handleExportExcel(tab1Data.details, `ChiTietTon_${selectedGroup}`)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                        >
                          <Download className="h-4 w-4" />
                          Xuất Excel
                        </button>
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
                  <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Thống kê nợ của từng nhóm</h3>
                    <button
                      onClick={() => handleExportExcel([...tab2Data.groups, tab2Data.total], 'ThongKeTongHop')}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                      <Download className="h-4 w-4" />
                      Xuất Excel
                    </button>
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

            {/* Tab 4 Content */}
            {activeTab === 'tab4' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSearchParams({
                        query: searchQueryInput,
                        exact: searchExactInput,
                        hasSearched: true
                      });
                    }}
                    className="flex flex-col md:flex-row gap-4 items-end"
                  >
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Từ khóa tìm kiếm</label>
                      <input
                        type="text"
                        value={searchQueryInput}
                        onChange={(e) => setSearchQueryInput(e.target.value)}
                        placeholder="Nhập mã, tên hoặc địa chỉ..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kiểu tìm kiếm</label>
                      <select
                        value={searchExactInput ? 'exact' : 'partial'}
                        onChange={(e) => setSearchExactInput(e.target.value === 'exact')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      >
                        <option value="partial">Tìm gần đúng</option>
                        <option value="exact">Tìm chính xác</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 h-[42px]"
                    >
                      <Search className="h-4 w-4" />
                      Tìm kiếm
                    </button>
                  </form>
                </div>

                {searchParams.hasSearched && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Kết quả tìm kiếm</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {searchResults.length} bản ghi
                        </span>
                      </div>
                      <button
                        onClick={() => handleExportExcel(searchResults, `TimKiem_${searchParams.query}`)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                        disabled={searchResults.length === 0}
                      >
                        <Download className="h-4 w-4" />
                        Xuất Excel
                      </button>
                    </div>
                    {renderSearchTable(searchResults)}
                  </div>
                )}
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
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                          <dd className="mt-2 text-2xl font-semibold text-blue-900">{tab3Data.summary.NHOM}</dd>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn</dt>
                          <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                            <Users className="h-5 w-5 opacity-70" />
                            {tab3Data.summary.KH_TON}
                          </dd>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn</dt>
                          <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                            <Receipt className="h-5 w-5 opacity-70" />
                            {tab3Data.summary.HD_TON}
                          </dd>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                          <dt className="text-sm font-medium text-red-800 truncate">Tổng Tiền</dt>
                          <dd className="mt-2 text-2xl font-semibold text-red-900 flex items-center gap-2">
                            {formatCurrency(tab3Data.summary.TONG_NO)}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Thông tin 2: Thống kê chi tiết */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 2: Chi tiết tồn của nhân viên (&ge; 5 triệu)</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tab3Data.details.length} bản ghi
                          </span>
                        </div>
                        <button
                          onClick={() => handleExportExcel(tab3Data.details, `KhachHangTren5Trieu_${selectedGroupTab3}`)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                        >
                          <Download className="h-4 w-4" />
                          Xuất Excel
                        </button>
                      </div>
                      {renderDetailsTable(tab3Data.details, selectedGroupTab3 === 'Công ty')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5 Content */}
            {activeTab === 'tab5' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-pink-600" />
                    Thống kê danh sách đề nghị cập nhật SĐT
                  </h2>
                  
                  {/* Region Sub-tabs and Status Filter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 mb-6 pb-2">
                    <div className="flex space-x-2 overflow-x-auto">
                      {['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Côn Đảo'].map(region => (
                        <button
                          key={region}
                          onClick={() => setActiveRegionTab(region)}
                          className={cn(
                            "px-4 py-2 font-medium text-sm rounded-t-lg transition-colors border-b-2 whitespace-nowrap",
                            activeRegionTab === region
                              ? "border-pink-500 text-pink-600 bg-pink-50"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          Khu vực {region} ({updatesByRegion[region]?.length || 0})
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">Trạng thái:</label>
                      <select
                        id="statusFilter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'Mới đề nghị' | 'Đã cập nhật')}
                        className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 rounded-lg border appearance-none bg-white"
                      >
                        <option value="Mới đề nghị">Mới đề nghị</option>
                        <option value="Đã cập nhật">Đã cập nhật</option>
                      </select>
                    </div>
                  </div>

                  {/* Render selected region data */}
                  {(() => {
                    const data = updatesByRegion[activeRegionTab] || [];
                    const groupedByNhom = data.reduce((acc, curr) => {
                      if (!acc[curr.NHOM]) acc[curr.NHOM] = [];
                      acc[curr.NHOM].push(curr);
                      return acc;
                    }, {} as Record<string, any[]>);

                    return (
                      <div className="space-y-6">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleExportExcel(data, `DeNghiCapNhat_${activeRegionTab.replace(/\s+/g, '')}`)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                          >
                            <Download className="h-4 w-4" />
                            Xuất Excel Khu Vực {activeRegionTab}
                          </button>
                        </div>
                        
                        {Object.keys(groupedByNhom).length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-gray-500">Không có dữ liệu đề nghị cập nhật cho khu vực này.</p>
                          </div>
                        ) : (
                          Object.entries(groupedByNhom).map(([nhom, items]) => (
                            <div key={nhom} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <div className="px-6 py-4 border-b border-gray-200 bg-pink-50/50">
                                <h4 className="text-lg font-semibold text-gray-800">Nhóm: {nhom} <span className="text-sm font-normal text-gray-500 ml-2">({items.length} yêu cầu)</span></h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">STT</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mã Khách</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Tên Khách</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">Địa Chỉ</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SĐT Cũ</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SĐT Mới</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Thời Gian</th>
                                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.MA_KHANG}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.TEN_KHANG}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.DCHI_KHANG}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.DTHOAI_CU}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{item.DTHOAI_MOI}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.THOI_GIAN}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                          {statusFilter === 'Mới đề nghị' ? (
                                            <button
                                              onClick={() => handleUpdateStatus(item)}
                                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
                                            >
                                              Cập nhật
                                            </button>
                                          ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              Đã cập nhật
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

