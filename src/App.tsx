import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, FileSpreadsheet, Users, Receipt, Search, Download, MapPin, Phone, MessageSquare, BarChart3, Star, Edit2, Check, X, ClipboardList, Filter, Map as MapIcon, Route } from 'lucide-react';
import { cn } from './lib/utils';
import RouteOptimizer from './components/RouteOptimizer';

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

interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: string;
  render?: (row: any, index: number) => React.ReactNode;
}

interface FilterableTableProps {
  data: any[];
  columns: ColumnDef[];
  keyExtractor?: (row: any, index: number) => string | number;
  footerRow?: any;
  showFilter?: boolean;
  onDataChange?: (data: any[]) => void;
}

function FilterableTable({ data, columns, keyExtractor, footerRow, showFilter = false, onDataChange }: FilterableTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenFilter(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredData = useMemo(() => {
    let result = data.filter(row => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const val = String(row[key] || '').toLowerCase();
        return val.includes(String(filterValue).toLowerCase());
      });
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        // Handle numbers
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Handle strings
        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  const onDataChangeRef = React.useRef(onDataChange);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  useEffect(() => {
    if (onDataChangeRef.current) {
      onDataChangeRef.current(filteredData);
    }
  }, [filteredData]);

  return (
    <div className="space-y-4">
      {/* Mobile Filters */}
      {showFilter && (
        <div className="block md:hidden space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Bộ lọc dữ liệu</span>
                {Object.values(filters).filter(Boolean).length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </div>
              <div className={cn("transition-transform duration-200", showMobileFilters && "rotate-180")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </button>
            
            {showMobileFilters && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {columns.map(col => (
                    <div key={col.key} className="relative">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{col.label}</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-gray-50 focus:bg-white"
                          placeholder={`Lọc ${col.label.toLowerCase()}...`}
                          value={filters[col.key] || ''}
                          onChange={e => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                        />
                        {filters[col.key] && (
                          <button 
                            onClick={() => setFilters(prev => ({ ...prev, [col.key]: '' }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {Object.values(filters).filter(Boolean).length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setFilters({})}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table (Always visible, standard table for both mobile and desktop) */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50 border-b border-blue-100">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  scope="col" 
                  className={cn(
                    "px-4 py-3 text-xs font-bold text-blue-900 uppercase tracking-wider border-r border-blue-200 last:border-0 align-top relative",
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.minWidth ? col.minWidth : 'whitespace-nowrap'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer hover:text-blue-800 select-none"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex flex-col text-[10px] leading-none space-y-[1px]">
                        <span className={cn(sortConfig?.key === col.key && sortConfig.direction === 'asc' ? "text-blue-700 font-black" : "text-gray-300")}>▲</span>
                        <span className={cn(sortConfig?.key === col.key && sortConfig.direction === 'desc' ? "text-blue-700 font-black" : "text-gray-300")}>▼</span>
                      </div>
                      <span className={cn(sortConfig?.key === col.key ? "text-blue-800" : "")}>{col.label}</span>
                    </div>
                    {showFilter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilter(openFilter === col.key ? null : col.key);
                        }}
                        className={cn(
                          "p-1 rounded hover:bg-blue-200 transition-colors",
                          filters[col.key] ? "text-blue-600 bg-blue-100" : "text-gray-400"
                        )}
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {showFilter && openFilter === col.key && (
                    <div 
                      className="mt-2 p-2 bg-white rounded-lg shadow-sm border border-gray-200 min-w-[150px]"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 font-normal"
                        placeholder={`Lọc ${col.label}...`}
                        value={filters[col.key] || ''}
                        onChange={e => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  Không tìm thấy dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={keyExtractor ? keyExtractor(row, idx) : idx} className="hover:bg-blue-50/50 transition-colors">
                  {columns.map(col => (
                    <td 
                      key={col.key} 
                      className={cn(
                        "px-4 py-3 text-sm text-gray-700",
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        !col.minWidth && 'whitespace-nowrap'
                      )}
                    >
                      {col.render ? col.render(row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {footerRow && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                {columns.map(col => (
                  <td 
                    key={col.key} 
                    className={cn(
                      "px-4 py-3 text-sm font-bold text-gray-900",
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      !col.minWidth && 'whitespace-nowrap'
                    )}
                  >
                    {col.render ? col.render(footerRow, -1) : footerRow[col.key]}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

const parseNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = val.toString().trim();
  
  // If string contains both . and ,
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastDot > lastComma) {
      // 1,000.00 -> US format
      str = str.replace(/,/g, '');
    } else {
      // 1.000,00 -> VN format
      str = str.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (str.includes('.')) {
    // Only dots. Could be 1.000.000 (VN) or 1000.50 (US)
    if ((str.match(/\./g) || []).length > 1) {
      str = str.replace(/\./g, '');
    } else {
      // One dot. If exactly 3 digits after it, assume VN thousands separator for VND
      if (/\.\d{3}$/.test(str)) {
        str = str.replace(/\./g, '');
      }
    }
  } else if (str.includes(',')) {
    // Only commas. Could be 1,000,000 (US) or 1000,50 (VN)
    if ((str.match(/,/g) || []).length > 1) {
      str = str.replace(/,/g, '');
    } else {
      if (/,\d{3}$/.test(str)) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(/,/g, '.');
      }
    }
  }
  
  return parseFloat(str) || 0;
};

export default function App() {
  const [tonData, setTonData] = useState<any[]>([]);
  const [chiaNhomData, setChiaNhomData] = useState<any[]>([]);
  const [khuVucData, setKhuVucData] = useState<any[]>([]);
  const [capNhatSdtData, setCapNhatSdtData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5'>('tab1');
  const [activeTab2SubTab, setActiveTab2SubTab] = useState<'nhom' | 'phien'>('nhom');
  const [activeTab3SubTab, setActiveTab3SubTab] = useState<'lonHon5M' | 'noKhoDoi' | 'noNhieuKy'>('lonHon5M');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedGroupTab3, setSelectedGroupTab3] = useState<string>('');
  const [soKyMinFilter, setSoKyMinFilter] = useState<string>('2');
  const [activeRegionTab, setActiveRegionTab] = useState<string>('Vũng Tàu');
  
  // Tab 4 Search State
  const [activeTab4SubTab, setActiveTab4SubTab] = useState<'timKiem' | 'locTheoPhien' | 'locTheoKyHD'>('timKiem');
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [searchExactInput, setSearchExactInput] = useState(false);
  const [searchParams, setSearchParams] = useState({ query: '', exact: false, hasSearched: false });
  
  // Tab 4 Lọc theo phiên State
  const [phienFilterInput, setPhienFilterInput] = useState('');
  const [phienFilterMode, setPhienFilterMode] = useState<'group' | 'detail'>('group');
  const [phienFilterResult, setPhienFilterResult] = useState<any[]>([]);
  const [hasFilteredPhien, setHasFilteredPhien] = useState(false);

  // Tab 4 Lọc theo kỳ HĐ State
  const [kyHDFilterMonth, setKyHDFilterMonth] = useState<string>('');
  const [kyHDFilterYear, setKyHDFilterYear] = useState<string>('');
  const [selectedGroupTab4KyHD, setSelectedGroupTab4KyHD] = useState<string>('');
  
  // Phone Update State
  const [updatedPhones, setUpdatedPhones] = useState<Record<string, string>>({});
  const [phoneUpdateLog, setPhoneUpdateLog] = useState<any[]>([]);
  const [editingPhone, setEditingPhone] = useState<{ maKhang: string, currentPhone: string } | null>(null);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'Mới đề nghị' | 'Đã cập nhật'>('Mới đề nghị');
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);

  const [currentFilteredDetails, setCurrentFilteredDetails] = useState<any[] | null>(null);

  useEffect(() => {
    setCurrentFilteredDetails(null);
  }, [activeTab, selectedGroup, selectedGroupTab3, activeTab3SubTab, selectedGroupTab4KyHD, kyHDFilterMonth, kyHDFilterYear]);

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
      THOI_GIAN: row['TGIAN_CAPNHAT'] || row['THỜI GIAN CẬP NHẬT'] || row['THOI_GIAN'] || row['NGÀY'] || '',
      TRANG_THAI: row['TRẠNG THÁI'] || row['TRANG_THAI'] || row['Trạng thái'] || row['Trạng Thái'] || ''
    })).filter(row => row.MA_KHANG);

    const fetchedMaKhangs = new Set(fetchedUpdates.map(u => u.MA_KHANG));
    const sessionUpdates = phoneUpdateLog.filter(u => !fetchedMaKhangs.has(u.MA_KHANG));

    return [...fetchedUpdates, ...sessionUpdates].map(u => ({
      ...u,
      TRANG_THAI: statusUpdates[u.MA_KHANG] || u.TRANG_THAI || 'Mới đề nghị'
    }));
  }, [capNhatSdtData, phoneUpdateLog, statusUpdates]);

  // Get count of pending updates for the badge
  const pendingUpdatesCount = useMemo(() => {
    return allUpdates.filter(u => u.TRANG_THAI === 'Mới đề nghị').length;
  }, [allUpdates]);

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
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    tonData.forEach(row => {
      const maKhang = row['MA_KHANG'];
      const tongNo = parseNumber(row['TONG_NO']);
      const nhom = khangToNhom.get(maKhang) || 'Không xác định';
      
      const nam = parseInt(row['NAM'] || row['Nam'] || row['nam'] || '0', 10);
      const thang = parseInt(row['THANG'] || row['Thang'] || row['thang'] || '0', 10);
      let isOldDebt = false;
      if (nam > 0 && thang > 0) {
        const monthsDiff = (currentYear - nam) * 12 + (currentMonth - thang);
        if (monthsDiff >= 6) {
          isOldDebt = true;
        }
      }
      
      if (aggregated.has(maKhang)) {
        const existing = aggregated.get(maKhang);
        existing.SO_KY += 1;
        existing.TONG_NO += tongNo;
        existing.HD_TON += 1;
        if (isOldDebt) existing.hasOldDebt = true;
      } else {
        aggregated.set(maKhang, {
          MA_KVUC: row['MA_KVUC'] || '',
          STT_TON: row['STT'] || '',
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
          hasOldDebt: isOldDebt
        });
      }
    });
    return Array.from(aggregated.values());
  }, [tonData, khangToNhom]);

  // Process data for Tab 1 (Selected Group)
  const tab1Data = useMemo(() => {
    if (!selectedGroup) return null;

    let groupData = allAggregatedData;
    if (selectedGroup !== 'Công ty') {
      groupData = allAggregatedData.filter(item => item.NHOM === selectedGroup);
    }

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
        DOANHSO: `${item.MA_KVUC} - ${item.STT_TON}`,
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
      const maSo = (row['MA_SOGCS'] || '').toString();
      
      let matchMa = false;
      let matchTen = false;
      let matchDchi = false;
      let matchMaSo = false;

      if (searchParams.exact) {
        matchMa = ma === query;
        matchTen = ten === query;
        matchDchi = dchi === query;
        matchMaSo = maSo === query;
      } else {
        matchMa = ma.toLowerCase().includes(query);
        matchTen = ten.toLowerCase().includes(query);
        matchDchi = dchi.toLowerCase().includes(query);
        matchMaSo = maSo.toLowerCase().includes(query);
      }

      return matchMa || matchTen || matchDchi || matchMaSo;
    }).map((row, index) => ({
      ...row,
      STT: index + 1,
      NHOM: khangToNhom.get(row['MA_KHANG']) || 'Không xác định',
      THANG_HD: row['THANG'] || row['Thang'] || row['thang'] || '',
      NAM_HD: row['NAM'] || row['Nam'] || row['nam'] || '',
      KY_HD: row['KY'] || row['Ky'] || row['ky'] || '',
      TONG_NO: parseNumber(row['TONG_NO'])
    }));
  }, [tonData, searchParams, khangToNhom]);

  const handleFilterPhien = () => {
    if (!phienFilterInput.trim()) {
      setPhienFilterResult([]);
      setHasFilteredPhien(true);
      return;
    }

    const query = phienFilterInput.trim().toLowerCase();
    const queryLength = query.length;
    
    const filteredTonData = tonData.filter(row => {
      const maSogcs = (row['MA_SOGCS'] || '').toString().toLowerCase();
      return maSogcs.substring(0, queryLength) === query;
    });

    if (phienFilterMode === 'detail') {
      const details = filteredTonData.map((row, index) => ({
        ...row,
        STT: index + 1,
        NHOM: khangToNhom.get(row['MA_KHANG']) || 'Không xác định',
        THANG_HD: row['THANG'] || row['Thang'] || row['thang'] || '',
        NAM_HD: row['NAM'] || row['Nam'] || row['nam'] || '',
        KY_HD: row['KY'] || row['Ky'] || row['ky'] || '',
        DOANHSO: `${row['MA_KVUC'] || ''} - ${row['STT'] || ''}`,
        TONG_NO: parseNumber(row['TONG_NO'])
      }));
      setPhienFilterResult(details);
    } else {
      // Group mode
      const grouped = new Map<string, any>();
      filteredTonData.forEach(row => {
        const maKhang = row['MA_KHANG'];
        if (!grouped.has(maKhang)) {
          grouped.set(maKhang, {
            ...row,
            SO_KY: 1,
            TONG_NO: parseNumber(row['TONG_NO']),
            NHOM: khangToNhom.get(maKhang) || 'Không xác định',
            DOANHSO: `${row['MA_KVUC'] || ''} - ${row['STT'] || ''}`
          });
        } else {
          const existing = grouped.get(maKhang);
          existing.SO_KY += 1;
          existing.TONG_NO += parseNumber(row['TONG_NO']);
        }
      });
      
      const result = Array.from(grouped.values()).map((row, index) => ({
        ...row,
        STT: index + 1
      }));
      setPhienFilterResult(result);
    }
    setHasFilteredPhien(true);
  };

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
        DOANHSO: `${item.MA_KVUC} - ${item.STT_TON}`,
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

  // Process data for Tab 3 (Nợ khó đòi >= 6 months)
  const tab3NoKhoDoiData = useMemo(() => {
    if (!selectedGroupTab3) return null;

    let filteredData = allAggregatedData.filter(item => item.hasOldDebt);

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
        DOANHSO: `${item.MA_KVUC} - ${item.STT_TON}`,
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

  // Process data for Tab 3 (Nợ nhiều kỳ)
  const tab3NoNhieuKyData = useMemo(() => {
    if (!selectedGroupTab3) return null;
    
    let soKy = parseInt(soKyMinFilter, 10);
    if (isNaN(soKy)) soKy = 1;

    let filteredData = allAggregatedData.filter(item => item.SO_KY >= soKy);

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
        DOANHSO: `${item.MA_KVUC} - ${item.STT_TON}`,
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
  }, [selectedGroupTab3, allAggregatedData, soKyMinFilter]);

  const currentTab3Data = activeTab3SubTab === 'lonHon5M' 
    ? tab3Data 
    : activeTab3SubTab === 'noKhoDoi' 
      ? tab3NoKhoDoiData 
      : tab3NoNhieuKyData;

  // Process data for Tab 4 (Lọc theo kỳ HĐ)
  const tab4KyHDData = useMemo(() => {
    if (!selectedGroupTab4KyHD || !kyHDFilterMonth || !kyHDFilterYear) return null;

    const targetMonth = parseInt(kyHDFilterMonth, 10);
    const targetYear = parseInt(kyHDFilterYear, 10);

    // Filter tonData directly to find customers with invoices matching the selected month and year
    const matchingCustomers = new Set<string>();
    tonData.forEach(row => {
      const rowMonth = parseInt(row['THANG'] || row['Thang'] || row['thang'] || '0', 10);
      const rowYear = parseInt(row['NAM'] || row['Nam'] || row['nam'] || '0', 10);
      
      if (rowMonth === targetMonth && rowYear === targetYear) {
        matchingCustomers.add(row['MA_KHANG']);
      }
    });

    let filteredData = allAggregatedData.filter(item => matchingCustomers.has(item.MA_KHANG));

    if (selectedGroupTab4KyHD !== 'Công ty') {
      filteredData = filteredData.filter(item => item.NHOM === selectedGroupTab4KyHD);
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
        DOANHSO: `${item.MA_KVUC} - ${item.STT_TON}`,
        ...item
      };
    });

    const hdTon = filteredData.reduce((sum, item) => sum + item.HD_TON, 0);
    const tongNo = filteredData.reduce((sum, item) => sum + item.TONG_NO, 0);

    return {
      summary: {
        NHOM: selectedGroupTab4KyHD,
        KH_TON: filteredData.length,
        HD_TON: hdTon,
        TONG_NO: tongNo,
      },
      details: detailedList
    };
  }, [selectedGroupTab4KyHD, allAggregatedData, tonData, kyHDFilterMonth, kyHDFilterYear]);

  // Process data for Tab 2 (All Groups Summary)
  const tab2Data = useMemo(() => {
    const summaryByGroup = new Map<string, { KH_TON: Set<string>, HD_TON: number, TONG_NO: number }>();
    
    groups.forEach(g => {
      summaryByGroup.set(g, { KH_TON: new Set(), HD_TON: 0, TONG_NO: 0 });
    });

    tonData.forEach(row => {
      const maKhang = row['MA_KHANG'];
      const nhom = khangToNhom.get(maKhang);
      const tongNo = parseNumber(row['TONG_NO']);
      
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

  // Tab 2 Data: Thống kê tồn các phiên
  const tab2PhienData = useMemo(() => {
    const phienMap = new Map<string, {
      PHIEN: string;
      KH_SET: Set<string>;
      HD_TON: number;
      TONG_TIEN: number;
      TONG_THUE: number;
      TONG_VC: number;
      TONG_THUE_VC: number;
      CUSTOMER_STATS: Map<string, { TONG_TIEN: number; SO_HD: number }>;
    }>();

    tonData.forEach(row => {
      const maSoGCS = row['MA_SOGCS'] || '';
      const phien = maSoGCS.substring(0, 3) || 'Khác';
      const maKhang = row['MA_KHANG'];
      const tongTien = parseNumber(row['TONG_NO']);
      const tongThue = parseNumber(row['THUE_PSINH']);
      const tongVC = parseNumber(row['TIEN_VC']);
      const tongThueVC = parseNumber(row['THUE_VC']);

      if (!phienMap.has(phien)) {
        phienMap.set(phien, {
          PHIEN: phien,
          KH_SET: new Set(),
          HD_TON: 0,
          TONG_TIEN: 0,
          TONG_THUE: 0,
          TONG_VC: 0,
          TONG_THUE_VC: 0,
          CUSTOMER_STATS: new Map()
        });
      }

      const phienStat = phienMap.get(phien)!;
      if (maKhang) {
        phienStat.KH_SET.add(maKhang);
        
        if (!phienStat.CUSTOMER_STATS.has(maKhang)) {
          phienStat.CUSTOMER_STATS.set(maKhang, { TONG_TIEN: 0, SO_HD: 0 });
        }
        const custStat = phienStat.CUSTOMER_STATS.get(maKhang)!;
        custStat.TONG_TIEN += tongTien;
        custStat.SO_HD += 1;
      }
      
      phienStat.HD_TON += 1;
      phienStat.TONG_TIEN += tongTien;
      phienStat.TONG_THUE += tongThue;
      phienStat.TONG_VC += tongVC;
      phienStat.TONG_THUE_VC += tongThueVC;
    });

    const result = Array.from(phienMap.values()).map(stat => {
      let khLonHon5M = 0;
      let khTu1Den5M = 0;
      let khCo2HD = 0;
      let khCoTu3HD = 0;

      stat.CUSTOMER_STATS.forEach(cust => {
        if (cust.TONG_TIEN > 5000000) khLonHon5M++;
        else if (cust.TONG_TIEN >= 1000000 && cust.TONG_TIEN <= 5000000) khTu1Den5M++;

        if (cust.SO_HD === 2) khCo2HD++;
        else if (cust.SO_HD >= 3) khCoTu3HD++;
      });

      return {
        PHIEN: stat.PHIEN,
        TONG_KH: stat.KH_SET.size,
        TONG_HD: stat.HD_TON,
        TONG_TIEN: stat.TONG_TIEN,
        TONG_THUE: stat.TONG_THUE,
        TONG_VC: stat.TONG_VC,
        TONG_THUE_VC: stat.TONG_THUE_VC,
        KH_LON_HON_5M: khLonHon5M,
        KH_1_DEN_5M: khTu1Den5M,
        KH_2_HD: khCo2HD,
        KH_TU_3_HD: khCoTu3HD
      };
    });

    result.sort((a, b) => a.PHIEN.localeCompare(b.PHIEN));

    const total = result.reduce((acc, curr) => ({
      PHIEN: 'TỔNG CỘNG',
      TONG_KH: acc.TONG_KH + curr.TONG_KH,
      TONG_HD: acc.TONG_HD + curr.TONG_HD,
      TONG_TIEN: acc.TONG_TIEN + curr.TONG_TIEN,
      TONG_THUE: acc.TONG_THUE + curr.TONG_THUE,
      TONG_VC: acc.TONG_VC + curr.TONG_VC,
      TONG_THUE_VC: acc.TONG_THUE_VC + curr.TONG_THUE_VC,
      KH_LON_HON_5M: acc.KH_LON_HON_5M + curr.KH_LON_HON_5M,
      KH_1_DEN_5M: acc.KH_1_DEN_5M + curr.KH_1_DEN_5M,
      KH_2_HD: acc.KH_2_HD + curr.KH_2_HD,
      KH_TU_3_HD: acc.KH_TU_3_HD + curr.KH_TU_3_HD
    }), {
      PHIEN: 'TỔNG CỘNG',
      TONG_KH: 0, TONG_HD: 0, TONG_TIEN: 0, TONG_THUE: 0, TONG_VC: 0, TONG_THUE_VC: 0,
      KH_LON_HON_5M: 0, KH_1_DEN_5M: 0, KH_2_HD: 0, KH_TU_3_HD: 0
    });

    return { data: result, total };
  }, [tonData]);

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

  const getPhoneActions = (phoneStr: string, onEdit?: () => void) => {
    let phone = '';
    if (phoneStr) {
      const match = phoneStr.match(/(?:\+84|0)[0-9]{8,9}/);
      phone = match ? match[0] : phoneStr.replace(/[^0-9+]/g, '');
    }

    return (
      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
        {phone && (
          <>
            <a href={`tel:${phone}`} title="Gọi điện" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center justify-center">
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a href={`https://zalo.me/${phone.replace(/^\+84/, '0')}`} target="_blank" rel="noopener noreferrer" title="Chat Zalo" className="px-2 py-1 text-xs font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center justify-center">
              Zalo
            </a>
          </>
        )}
        {onEdit && (
          <button 
            onClick={onEdit}
            className="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors flex items-center justify-center"
            title="Sửa số điện thoại"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  const renderSearchTable = (details: any[]) => {
    if (details.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
          Không tìm thấy dữ liệu phù hợp.
        </div>
      );
    }

    const columns: ColumnDef[] = [
      { key: 'STT', label: 'STT', minWidth: 'w-[1%] whitespace-nowrap' },
      { key: 'NHOM', label: 'Nhóm' },
      { key: 'MA_KHANG', label: 'Mã Khách', render: (row: any) => <span className="text-blue-600 font-medium">{row.MA_KHANG}</span> },
      { key: 'TEN_KHANG', label: 'Tên Khách', minWidth: 'min-w-[200px]' },
      { key: 'KY_HD', label: 'Kỳ HĐ', align: 'right' },
      { key: 'THANG_HD', label: 'Tháng HĐ', align: 'right' },
      { key: 'NAM_HD', label: 'Năm HĐ', align: 'right' },
      { key: 'TONG_NO', label: 'Tổng Nợ', align: 'right', render: (row: any) => <span className="font-semibold text-red-600">{formatCurrency(row.TONG_NO)}</span> },
      { key: 'DTHOAI_DVU', label: 'Điện Thoại', render: (row: any) => (
        editingPhone?.maKhang === row.MA_KHANG ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newPhoneInput}
              onChange={(e) => setNewPhoneInput(e.target.value)}
              className="w-28 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              placeholder="SĐT mới"
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
          <div className="flex items-center">
            <div>
              <div className="font-medium text-gray-900">{updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU}</div>
              {getPhoneActions(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU, () => {
                setEditingPhone({ maKhang: row.MA_KHANG, currentPhone: updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU });
                setNewPhoneInput(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || '');
              })}
            </div>
          </div>
        )
      )},
      { key: 'MA_SOGCS', label: 'Mã Sổ GCS', minWidth: 'w-[1%] whitespace-nowrap' },
      { key: 'SO_TBI', label: 'Số TBI' },
      { key: 'DCHI_KHANG', label: 'Địa Chỉ', minWidth: 'min-w-[250px]', render: (row: any) => (
        <div className="flex items-start gap-2">
          {row.DCHI_KHANG && (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.DCHI_KHANG)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              title="Chỉ đường trên Google Maps"
              className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-md shrink-0 transition-colors mt-0.5"
            >
              <MapPin className="h-4 w-4" />
            </a>
          )}
          <span>{row.DCHI_KHANG}</span>
        </div>
      )}
    ];

    const renderMobileCard = (row: any, idx: number) => (
      <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">STT: {row.STT} • Nhóm: {row.NHOM}</div>
            <div className="font-bold text-blue-600 text-lg">{row.MA_KHANG}</div>
            <div className="font-medium text-gray-900">{row.TEN_KHANG}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-red-600 text-lg">{formatCurrency(row.TONG_NO)}</div>
            <div className="text-sm text-gray-500">Kỳ: {row.KY_HD}/{row.THANG_HD}/{row.NAM_HD}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg">
          <div><span className="text-gray-400">Sổ GCS:</span> {row.MA_SOGCS}</div>
          <div><span className="text-gray-400">Số TBI:</span> {row.SO_TBI}</div>
        </div>

        <div className="text-sm text-gray-700 mb-4 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{row.DCHI_KHANG}</span>
        </div>

        <div className="border-t border-gray-100 pt-3">
          {editingPhone?.maKhang === row.MA_KHANG ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPhoneInput}
                onChange={(e) => setNewPhoneInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập SĐT mới"
                autoFocus
              />
              <button onClick={() => handleUpdatePhone(row)} className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setEditingPhone(null)} className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Điện thoại liên hệ</div>
                <div className="font-medium text-gray-900">{updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || 'Chưa có số'}</div>
                {getPhoneActions(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU, () => {
                  setEditingPhone({ maKhang: row.MA_KHANG, currentPhone: updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU });
                  setNewPhoneInput(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || '');
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    return <FilterableTable data={details} columns={columns} />;
  };

    const renderDetailsTable = (details: any[], showGroupColumn: boolean = false) => {
    if (details.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
          Không có dữ liệu tồn nợ cho nhóm này.
        </div>
      );
    }

    const columns: ColumnDef[] = [
      { key: 'STT', label: 'STT', minWidth: 'w-[1%] whitespace-nowrap' },
      { key: 'DOANHSO', label: 'Doanh số', minWidth: 'w-[1%] whitespace-nowrap' },
      ...(showGroupColumn ? [{ key: 'NHOM', label: 'Nhóm' }] : []),
      { key: 'MA_KHANG', label: 'Mã Khách', render: (row: any) => <span className="text-blue-600 font-medium">{row.MA_KHANG}</span> },
      { key: 'TEN_KHANG', label: 'Tên Khách', minWidth: 'min-w-[200px]' },
      { key: 'SO_KY', label: 'Số Kỳ', align: 'right', minWidth: 'w-[1%] whitespace-nowrap' },
      { key: 'TONG_NO', label: 'Tổng Nợ', align: 'right', render: (row: any) => <span className="font-semibold text-red-600">{formatCurrency(row.TONG_NO)}</span> },
      { key: 'DTHOAI_DVU', label: 'Điện Thoại', render: (row: any) => (
        editingPhone?.maKhang === row.MA_KHANG ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newPhoneInput}
              onChange={(e) => setNewPhoneInput(e.target.value)}
              className="w-28 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              placeholder="SĐT mới"
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
          <div className="flex items-center">
            <div>
              <div className="font-medium text-gray-900">{updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU}</div>
              {getPhoneActions(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU, () => {
                setEditingPhone({ maKhang: row.MA_KHANG, currentPhone: updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU });
                setNewPhoneInput(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || '');
              })}
            </div>
          </div>
        )
      )},
      { key: 'MA_SOGCS', label: 'Mã Sổ GCS', minWidth: 'w-[1%] whitespace-nowrap' },
      { key: 'SO_TBI', label: 'Số TBI' },
      { key: 'DCHI_KHANG', label: 'Địa Chỉ', minWidth: 'min-w-[250px]', render: (row: any) => (
        <div className="flex items-start gap-2">
          {row.DCHI_KHANG && (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.DCHI_KHANG)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              title="Chỉ đường trên Google Maps"
              className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-md shrink-0 transition-colors mt-0.5"
            >
              <MapPin className="h-4 w-4" />
            </a>
          )}
          <span>{row.DCHI_KHANG}</span>
        </div>
      )}
    ];

    const renderMobileCard = (row: any, idx: number) => (
      <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">STT: {row.STT} {showGroupColumn && `• Nhóm: ${row.NHOM}`}</div>
            <div className="font-bold text-blue-600 text-lg">{row.MA_KHANG}</div>
            <div className="font-medium text-gray-900">{row.TEN_KHANG}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-red-600 text-lg">{formatCurrency(row.TONG_NO)}</div>
            <div className="text-sm text-gray-500">{row.SO_KY} kỳ nợ</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg">
          <div><span className="text-gray-400">Doanh số:</span> {row.DOANHSO}</div>
          <div><span className="text-gray-400">Sổ GCS:</span> {row.MA_SOGCS}</div>
          <div className="col-span-2"><span className="text-gray-400">Số TBI:</span> {row.SO_TBI}</div>
        </div>

        <div className="text-sm text-gray-700 mb-4 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{row.DCHI_KHANG}</span>
        </div>

        <div className="border-t border-gray-100 pt-3">
          {editingPhone?.maKhang === row.MA_KHANG ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPhoneInput}
                onChange={(e) => setNewPhoneInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập SĐT mới"
                autoFocus
              />
              <button onClick={() => handleUpdatePhone(row)} className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setEditingPhone(null)} className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Điện thoại liên hệ</div>
                <div className="font-medium text-gray-900">{updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || 'Chưa có số'}</div>
                {getPhoneActions(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU, () => {
                  setEditingPhone({ maKhang: row.MA_KHANG, currentPhone: updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU });
                  setNewPhoneInput(updatedPhones[row.MA_KHANG] || row.DTHOAI_DVU || '');
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    return <FilterableTable data={details} columns={columns} showFilter={true} onDataChange={setCurrentFilteredDetails} />;
  };

  const getDynamicSummary = (baseData: any, groupName: string) => {
    if (!baseData) return null;
    const source = currentFilteredDetails || baseData.details;
    const hdTon = source.reduce((sum: number, item: any) => sum + (item.HD_TON || 1), 0);
    const tongNo = source.reduce((sum: number, item: any) => sum + (item.TONG_NO || 0), 0);
    return {
      NHOM: groupName,
      KH_TON: source.length,
      HD_TON: hdTon,
      TONG_NO: tongNo,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-lg border-b border-blue-950 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 min-h-[5rem]">
            <div className="flex-1 flex flex-col items-start gap-1">
              <div className="bg-white px-2 py-1.5 rounded-lg shadow-sm inline-flex items-center justify-center">
                <img src="https://kinhdoanh.hcmpc.com.vn/dieuhanh/Images/logoEVNHCMPC.png" alt="EVN Logo" className="h-8 md:h-9 object-contain" referrerPolicy="no-referrer" onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Logo_EVN.svg/512px-Logo_EVN.svg.png";
                }} />
              </div>
              <div className="text-blue-100 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap tracking-wide uppercase">Công ty Điện lực Vũng Tàu</div>
            </div>
            
            <div className="flex-shrink-0 px-2 sm:px-4 text-center">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-sm uppercase">Hệ Thống Quản Lý Tồn Nợ</h1>
            </div>

            <div className="flex-1 hidden md:flex flex-col items-end">
              <div className="text-blue-100 font-medium text-sm">Nguyễn Thành Phong - Đội QLTG</div>
              <div className="text-blue-300 text-xs mt-0.5 font-mono">Version: 2026.4.1</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="w-full space-y-6 mt-2 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[104px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-center">
                  <div className="h-4 bg-gray-200 rounded-full w-2/3 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-1/3"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-h-[600px] overflow-hidden">
              <div className="flex gap-4 border-b border-gray-100 pb-4 mb-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-200 rounded-lg w-28"></div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="h-12 bg-gray-100/80 rounded-xl w-full"></div>
                ))}
              </div>
            </div>
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
                  Tab 3: Khách hàng cần quan tâm
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
                  Tab 4: Tìm kiếm và Lọc
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
                    {pendingUpdatesCount > 0 && (
                      <span className="absolute -top-2 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {pendingUpdatesCount}
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
                      <option value="Công ty" className="font-bold text-blue-600">Công ty (Tất cả)</option>
                      {groups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {selectedGroup && tab1Data && (() => {
                  const info1Summary = getDynamicSummary(tab1Data, selectedGroup) || tab1Data.summary;
                  return (
                  <div className="space-y-6">
                    {/* Thông tin 1: Tổng quát tồn */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 1: Tổng quát tồn</h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                          <dd className="mt-2 text-2xl font-semibold text-blue-900">{info1Summary.NHOM}</dd>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn</dt>
                          <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                            <Users className="h-5 w-5 opacity-70" />
                            {info1Summary.KH_TON}
                          </dd>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn</dt>
                          <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                            <Receipt className="h-5 w-5 opacity-70" />
                            {info1Summary.HD_TON}
                          </dd>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                          <dt className="text-sm font-medium text-red-800 truncate">Tổng Tiền</dt>
                          <dd className="mt-2 text-2xl font-semibold text-red-900 flex items-center gap-2">
                            {formatCurrency(info1Summary.TONG_NO)}
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowRouteOptimizer(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-sm rounded-lg transition-colors border border-transparent"
                            title="Lộ trình khuyến cáo di chuyển trên bản đồ"
                          >
                            <MapIcon className="h-4 w-4" />
                            Lộ trình khuyến cáo
                          </button>
                          <button
                            onClick={() => handleExportExcel(tab1Data.details, `ChiTietTon_${selectedGroup}`)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                          >
                            <Download className="h-4 w-4" />
                            Xuất Excel
                          </button>
                        </div>
                      </div>
                      {renderDetailsTable(tab1Data.details, selectedGroup === 'Công ty')}
                    </div>
                  </div>
                  );
                })()}
              </div>
            )}

            {/* Tab 2 Content */}
            {activeTab === 'tab2' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                      <button
                        onClick={() => setActiveTab2SubTab('nhom')}
                        className={cn(
                          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                          activeTab2SubTab === 'nhom'
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        )}
                      >
                        Theo Nhóm
                      </button>
                      <button
                        onClick={() => setActiveTab2SubTab('phien')}
                        className={cn(
                          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                          activeTab2SubTab === 'phien'
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        )}
                      >
                        Theo Phiên
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (activeTab2SubTab === 'nhom') {
                          handleExportExcel([...tab2Data.groups, tab2Data.total], 'ThongKeTheoNhom');
                        } else {
                          handleExportExcel([...tab2PhienData.data, tab2PhienData.total], 'ThongKeTheoPhien');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                      <Download className="h-4 w-4" />
                      Xuất Excel
                    </button>
                  </div>

                  {activeTab2SubTab === 'nhom' ? (
                    <FilterableTable
                      showFilter={true}
                      data={tab2Data.groups}
                      columns={[
                        { key: 'NHOM', label: 'Nhóm' },
                        { key: 'KH_TON', label: 'KH Tồn', align: 'right' },
                        { key: 'HD_TON', label: 'HĐ Tồn', align: 'right' },
                        { key: 'TONG_NO', label: 'Tổng Nợ', align: 'right', render: (row: any) => <span className="font-semibold text-red-600">{formatCurrency(row.TONG_NO)}</span> }
                      ]}
                      footerRow={tab2Data.total}
                    />
                  ) : (
                    <FilterableTable
                      showFilter={true}
                      data={tab2PhienData.data}
                      columns={[
                        { key: 'PHIEN', label: 'Phiên' },
                        { key: 'TONG_KH', label: 'KH Tồn', align: 'right' },
                        { key: 'TONG_HD', label: 'HĐ Tồn', align: 'right' },
                        { key: 'TONG_TIEN', label: 'Tiền Tồn', align: 'right', render: (row: any) => <span className="font-semibold text-red-600">{formatCurrency(row.TONG_TIEN)}</span> },
                        { key: 'TONG_THUE', label: 'Thuế Tồn', align: 'right', render: (row: any) => formatCurrency(row.TONG_THUE) },
                        { key: 'TONG_VC', label: 'VC Tồn', align: 'right', render: (row: any) => formatCurrency(row.TONG_VC) },
                        { key: 'TONG_THUE_VC', label: 'Thuế VC Tồn', align: 'right', render: (row: any) => formatCurrency(row.TONG_THUE_VC) },
                        { key: 'KH_LON_HON_5M', label: 'KH > 5tr', align: 'right' },
                        { key: 'KH_1_DEN_5M', label: 'KH 1-5tr', align: 'right' },
                        { key: 'KH_2_HD', label: 'KH có 2 HĐ', align: 'right' },
                        { key: 'KH_TU_3_HD', label: 'KH ≥ 3 HĐ', align: 'right' }
                      ]}
                      footerRow={tab2PhienData.total}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Tab 4 Content */}
            {activeTab === 'tab4' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 w-fit">
                    <button
                      onClick={() => setActiveTab4SubTab('timKiem')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab4SubTab === 'timKiem'
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Tìm kiếm chung
                    </button>
                    <button
                      onClick={() => setActiveTab4SubTab('locTheoPhien')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab4SubTab === 'locTheoPhien'
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Lọc theo phiên
                    </button>
                    <button
                      onClick={() => setActiveTab4SubTab('locTheoKyHD')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab4SubTab === 'locTheoKyHD'
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Lọc theo kỳ HĐ
                    </button>
                  </div>

                  {activeTab4SubTab === 'timKiem' && (
                    <>
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

                      {searchParams.hasSearched && (
                        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                    </>
                  )}

                  {activeTab4SubTab === 'locTheoPhien' && (
                    <>
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nhập hoặc chọn phiên</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={phienFilterInput}
                              onChange={(e) => setPhienFilterInput(e.target.value)}
                              placeholder="Ví dụ: B1, B2, 20..."
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  setPhienFilterInput(e.target.value);
                                }
                              }}
                              className="w-32 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                              <option value="">Chọn...</option>
                              <option value="B1">B1</option>
                              <option value="B2">B2</option>
                              <option value="B3">B3</option>
                              <option value="20">20</option>
                            </select>
                          </div>
                        </div>
                        <div className="w-full md:w-48">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chế độ xem</label>
                          <select
                            value={phienFilterMode}
                            onChange={(e) => setPhienFilterMode(e.target.value as 'group' | 'detail')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option value="group">Group theo khách hàng</option>
                            <option value="detail">Xem chi tiết</option>
                          </select>
                        </div>
                        <button
                          onClick={handleFilterPhien}
                          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 h-[42px]"
                        >
                          <Search className="h-4 w-4" />
                          Lọc
                        </button>
                      </div>

                      {hasFilteredPhien && (
                        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-medium leading-6 text-gray-900">
                                Kết quả lọc phiên: {phienFilterInput} ({phienFilterMode === 'group' ? 'Group theo KH' : 'Chi tiết'})
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {phienFilterResult.length} bản ghi
                              </span>
                            </div>
                            <button
                              onClick={() => handleExportExcel(phienFilterResult, `LocPhien_${phienFilterInput}_${phienFilterMode}`)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                              disabled={phienFilterResult.length === 0}
                            >
                              <Download className="h-4 w-4" />
                              Xuất Excel
                            </button>
                          </div>
                          {phienFilterMode === 'group' ? (
                            renderDetailsTable(phienFilterResult, true)
                          ) : (
                            renderSearchTable(phienFilterResult)
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {activeTab4SubTab === 'locTheoKyHD' && (
                    <>
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1 max-w-[200px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                          <select
                            value={kyHDFilterMonth}
                            onChange={(e) => setKyHDFilterMonth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option value="">Chọn tháng</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>Tháng {m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 max-w-[200px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                          <select
                            value={kyHDFilterYear}
                            onChange={(e) => setKyHDFilterYear(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option value="">Chọn năm</option>
                            {[2023, 2024, 2025, 2026].map(y => (
                              <option key={y} value={y}>Năm {y}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label htmlFor="group-select-tab4-kyhd" className="block text-sm font-medium text-gray-700 mb-2">
                        Chọn nhóm quản lý (Lọc theo kỳ HĐ)
                      </label>
                      <div className="relative max-w-md mb-6">
                        <select
                          id="group-select-tab4-kyhd"
                          value={selectedGroupTab4KyHD}
                          onChange={(e) => setSelectedGroupTab4KyHD(e.target.value)}
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

                      {selectedGroupTab4KyHD && tab4KyHDData && (
                        <div className="space-y-6">
                          {/* Thông tin 1: Tổng quát tồn */}
                          {(() => {
                            const dynamicSummary = getDynamicSummary(tab4KyHDData, selectedGroupTab4KyHD) || tab4KyHDData.summary;
                            return (
                              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                                  <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 1: Tổng quát tồn (Lọc theo kỳ HĐ)</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                    <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                                    <dd className="mt-2 text-2xl font-semibold text-blue-900">{dynamicSummary.NHOM}</dd>
                                  </div>
                                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                    <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn</dt>
                                    <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                                      <Users className="h-5 w-5 opacity-70" />
                                      {dynamicSummary.KH_TON}
                                    </dd>
                                  </div>
                                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                    <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn</dt>
                                    <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                                      <Receipt className="h-5 w-5 opacity-70" />
                                      {dynamicSummary.HD_TON}
                                    </dd>
                                  </div>
                                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                    <dt className="text-sm font-medium text-red-800 truncate">Tổng Tiền</dt>
                                    <dd className="mt-2 text-2xl font-semibold text-red-900 flex items-center gap-2">
                                      {formatCurrency(dynamicSummary.TONG_NO)}
                                    </dd>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Thông tin 2: Thống kê chi tiết */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 2: Chi tiết tồn của nhân viên (Lọc theo kỳ HĐ)</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {tab4KyHDData.details.length} bản ghi
                                </span>
                              </div>
                              <button
                                onClick={() => handleExportExcel(tab4KyHDData.details, `LocTheoKyHD_${selectedGroupTab4KyHD}`)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                              >
                                <Download className="h-4 w-4" />
                                Xuất Excel
                              </button>
                            </div>
                            {renderDetailsTable(tab4KyHDData.details, selectedGroupTab4KyHD === 'Công ty')}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3 Content */}
            {activeTab === 'tab3' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 w-fit">
                    <button
                      onClick={() => setActiveTab3SubTab('lonHon5M')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab3SubTab === 'lonHon5M'
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Khách hàng lớn hơn 5 triệu
                    </button>
                    <button
                      onClick={() => setActiveTab3SubTab('noKhoDoi')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab3SubTab === 'noKhoDoi'
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Khách hàng nợ khó đòi
                    </button>
                    <button
                      onClick={() => setActiveTab3SubTab('noNhieuKy')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab3SubTab === 'noNhieuKy'
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Khách hàng nợ nhiều kỳ
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl text-left">
                    <div>
                      <label htmlFor="group-select-tab3" className="block text-sm font-medium text-gray-700 mb-2">
                        Chọn nhóm quản lý ({activeTab3SubTab === 'lonHon5M' ? 'Khách hàng nợ ≥ 5 triệu' : activeTab3SubTab === 'noKhoDoi' ? 'Khách hàng nợ khó đòi' : 'Khách hàng nợ nhiều kỳ'})
                      </label>
                      <div className="relative">
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

                    {activeTab3SubTab === 'noNhieuKy' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Số kỳ (Hóa đơn tồn) tối thiểu
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={soKyMinFilter}
                          onChange={e => setSoKyMinFilter(e.target.value)}
                          className="block w-full px-3 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border"
                          placeholder="Nhập số kỳ (ví dụ: 2)"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {selectedGroupTab3 && currentTab3Data && (
                  <div className="space-y-6">
                    {/* Thông tin 1: Tổng quát tồn */}
                    {(() => {
                      const dynamicSummary = getDynamicSummary(currentTab3Data, selectedGroupTab3) || currentTab3Data.summary;
                      return (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 1: Tổng quát tồn ({activeTab3SubTab === 'lonHon5M' ? '≥ 5 triệu' : activeTab3SubTab === 'noKhoDoi' ? 'Nợ khó đòi' : `Nợ ≥ ${soKyMinFilter} kỳ`})</h3>
                          </div>
                          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                              <dt className="text-sm font-medium text-blue-800 truncate">Nhóm</dt>
                              <dd className="mt-2 text-2xl font-semibold text-blue-900">{dynamicSummary.NHOM}</dd>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                              <dt className="text-sm font-medium text-green-800 truncate">Số Khách Hàng Tồn</dt>
                              <dd className="mt-2 text-2xl font-semibold text-green-900 flex items-center gap-2">
                                <Users className="h-5 w-5 opacity-70" />
                                {dynamicSummary.KH_TON}
                              </dd>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                              <dt className="text-sm font-medium text-purple-800 truncate">Số Hóa Đơn Tồn</dt>
                              <dd className="mt-2 text-2xl font-semibold text-purple-900 flex items-center gap-2">
                                <Receipt className="h-5 w-5 opacity-70" />
                                {dynamicSummary.HD_TON}
                              </dd>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                              <dt className="text-sm font-medium text-red-800 truncate">Tổng Tiền</dt>
                              <dd className="mt-2 text-2xl font-semibold text-red-900 flex items-center gap-2">
                                {formatCurrency(dynamicSummary.TONG_NO)}
                              </dd>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Thông tin 2: Thống kê chi tiết */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium leading-6 text-gray-900">Thông tin 2: Chi tiết tồn của nhân viên ({activeTab3SubTab === 'lonHon5M' ? '≥ 5 triệu' : activeTab3SubTab === 'noKhoDoi' ? 'Nợ khó đòi' : `Nợ ≥ ${soKyMinFilter} kỳ`})</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {currentTab3Data.details.length} bản ghi
                          </span>
                        </div>
                        <button
                          onClick={() => handleExportExcel(currentTab3Data.details, activeTab3SubTab === 'lonHon5M' ? `KhachHangTren5Trieu_${selectedGroupTab3}` : activeTab3SubTab === 'noKhoDoi' ? `KhachHangNoKhoDoi_${selectedGroupTab3}` : `KhachHangNoNhieuKy_${selectedGroupTab3}`)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                        >
                          <Download className="h-4 w-4" />
                          Xuất Excel
                        </button>
                      </div>
                      {renderDetailsTable(currentTab3Data.details, selectedGroupTab3 === 'Công ty')}
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
                          Object.entries(groupedByNhom).map(([nhom, items]: [string, any]) => (
                            <div key={nhom} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-200 bg-pink-50/50">
                                <h4 className="text-lg font-semibold text-gray-800">Nhóm: {nhom} <span className="text-sm font-normal text-gray-500 ml-2">({items.length} yêu cầu)</span></h4>
                              </div>
                              
                              <FilterableTable
                                data={items.map((item, idx) => ({ ...item, STT: idx + 1 }))}
                                columns={[
                                  { key: 'STT', label: 'STT', minWidth: 'w-[1%] whitespace-nowrap text-center' },
                                  { key: 'MA_KHANG', label: 'Mã Khách', render: (row: any) => <span className="text-blue-600 font-medium">{row.MA_KHANG}</span> },
                                  { key: 'TEN_KHANG', label: 'Tên Khách', minWidth: 'min-w-[200px]' },
                                  { key: 'DCHI_KHANG', label: 'Địa Chỉ', minWidth: 'min-w-[300px]' },
                                  { key: 'DTHOAI_CU', label: 'SĐT Cũ' },
                                  { key: 'DTHOAI_MOI', label: 'SĐT Mới', render: (row: any) => <span className="font-medium text-green-600">{row.DTHOAI_MOI}</span> },
                                  { key: 'THOI_GIAN', label: 'Thời Gian' },
                                  { key: 'ACTION', label: 'Thao tác', align: 'center', render: (row: any) => (
                                    statusFilter === 'Mới đề nghị' ? (
                                      <button
                                        onClick={() => handleUpdateStatus(row)}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
                                      >
                                        Cập nhật
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Đã cập nhật
                                      </span>
                                    )
                                  )}
                                ]}
                              />
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

      {showRouteOptimizer && (
        <RouteOptimizer 
          customers={activeTab === 'tab1' && tab1Data ? tab1Data.details : []} 
          onClose={() => setShowRouteOptimizer(false)} 
        />
      )}
    </div>
  );
}

