import React, { useState } from 'react';
import { Search, RotateCw, ExternalLink, SlidersHorizontal, Calendar, Eye, FileSpreadsheet } from 'lucide-react';
import type { InspectionRecord } from '../types';

interface InspectionHistoryProps {
  records: InspectionRecord[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectRecord: (record: InspectionRecord) => void;
  sheetUrl: string;
}

export const InspectionHistory: React.FC<InspectionHistoryProps> = ({
  records,
  onRefresh,
  isRefreshing,
  onSelectRecord,
  sheetUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch = rec.transformerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rec.remarks.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ทั้งหมด' || rec.overallResult === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ผ่านการตรวจสอบ':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50';
      case 'ต้องบำรุงรักษา':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/50';
      case 'ชำรุดเสียหายด่วน':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/50';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div id="inspection-history-container" className="bg-[#0e0e11] rounded-xs border-2 border-slate-800 p-6 flex flex-col h-full shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5 uppercase tracking-tight italic">
            <span className="w-2.5 h-6 bg-yellow-400 inline-block transform -skew-x-12"></span>
            02. RECENT LOGS
          </h2>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Real-time telemetry synced with Google Sheets</p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          {/* Link to actual Google Sheet */}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-slate-950 hover:bg-slate-900 rounded-xs transition-all border-2 border-slate-800 hover:border-emerald-500/40"
            title="เปิด Google Sheets จริง"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>OPEN SHEET</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-yellow-400 bg-slate-950 hover:bg-slate-900 rounded-xs transition-all border-2 border-slate-800 hover:border-yellow-400/40 cursor-pointer flex items-center justify-center"
            title="ดึงข้อมูลใหม่"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-yellow-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ค้นหา หมายเลขหม้อแปลง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border-2 border-slate-800 focus:border-yellow-400 rounded-xs text-xs text-slate-200 placeholder-slate-700 focus:outline-none transition-all duration-200 font-mono"
          />
          <Search className="absolute left-3.5 top-3 text-slate-600 w-3.5 h-3.5" />
        </div>

        {/* Status selection */}
        <div className="flex bg-slate-950 p-1 rounded-xs border-2 border-slate-900 overflow-x-auto whitespace-nowrap">
          {['ทั้งหมด', 'ผ่านการตรวจสอบ', 'ต้องบำรุงรักษา', 'ชำรุดเสียหายด่วน'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-yellow-400 text-black font-black'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table & List View */}
      <div className="flex-1 overflow-y-auto max-h-[600px] border-2 border-slate-900 rounded-xs">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <SlidersHorizontal className="w-10 h-10 mb-3 text-slate-700" />
            <p className="text-xs uppercase tracking-widest font-black text-slate-400">NO INVENTORIES RECORDED</p>
            <p className="text-[10px] text-slate-600 mt-1 uppercase">Please submit a new transformer inspect log</p>
          </div>
        ) : (
          <div className="hidden sm:block">
            {/* Desktop Table View */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b-2 border-slate-800">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-black text-slate-500">หม้อแปลง</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-black text-slate-500">วัน/เวลาตรวจสอบ</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-black text-slate-500">ผลการตรวจสอบ</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-black text-slate-500">พิกัด GPS</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-black text-slate-500">รูปภาพ</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-black text-slate-500 text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredRecords.map((rec, index) => (
                  <tr
                    key={`${rec.transformerId}-${index}`}
                    className="hover:bg-slate-900/30 transition-colors group cursor-pointer border-b border-slate-900"
                    onClick={() => onSelectRecord(rec)}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-white text-sm font-mono group-hover:text-yellow-400 transition-colors">
                        {rec.transformerId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        {rec.timestamp}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xs border ${getStatusBadgeClass(rec.overallResult)}`}>
                        {rec.overallResult}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono truncate max-w-[120px]">
                      {rec.coordinates}
                    </td>
                    <td className="px-4 py-3.5">
                      {rec.photoUrl && rec.photoUrl.startsWith('http') ? (
                        <span className="text-[10px] font-black uppercase text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10 px-2 py-0.5 rounded-xs border border-yellow-400/30 transition-all flex items-center gap-1 w-max">
                          IMAGE_ATTACHED
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button className="p-1.5 hover:bg-slate-900 rounded-xs text-slate-600 hover:text-yellow-400 transition-all inline-flex items-center justify-center border border-transparent hover:border-slate-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile List View */}
        <div className="sm:hidden space-y-3 p-1">
          {filteredRecords.map((rec, index) => (
            <div
              key={`mob-${rec.transformerId}-${index}`}
              onClick={() => onSelectRecord(rec)}
              className="p-4 bg-[#0d0d10] hover:bg-slate-900 border-2 border-slate-900 hover:border-slate-800 rounded-xs transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <span className="font-black text-white text-base font-mono">{rec.transformerId}</span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-xs border ${getStatusBadgeClass(rec.overallResult)}`}>
                  {rec.overallResult}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                <div>
                  <span className="text-slate-600 block text-[9px] uppercase tracking-wider">วันเวลาตรวจสอบ</span>
                  <span className="font-medium text-xs">{rec.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[9px] uppercase tracking-wider">พิกัดตำแหน่ง</span>
                  <span className="text-xs truncate block">{rec.coordinates}</span>
                </div>
              </div>

              {rec.remarks && rec.remarks !== '-' && (
                <p className="text-xs text-slate-400 italic bg-slate-950 p-2.5 rounded-xs border border-slate-900 truncate">
                  {rec.remarks}
                </p>
              )}

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                <span>BY: {rec.inspectorEmail.split('@')[0].toUpperCase()}</span>
                <span className="text-yellow-400 font-black uppercase tracking-wider flex items-center gap-1">
                  VIEW REPORT <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
