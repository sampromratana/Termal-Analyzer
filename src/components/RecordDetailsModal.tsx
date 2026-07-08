import React from 'react';
import { X, MapPin, Calendar, User, FileText, CheckCircle2, AlertTriangle, ExternalLink, ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { InspectionRecord } from '../types';

interface RecordDetailsModalProps {
  record: InspectionRecord | null;
  onClose: () => void;
}

export const RecordDetailsModal: React.FC<RecordDetailsModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const getStatusBadge = (val: string) => {
    switch (val) {
      case 'ผ่านการตรวจสอบ':
      case 'ปกติ':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50';
      case 'ต้องบำรุงรักษา':
      case 'ต่ำกว่าเกณฑ์':
      case 'สูงเกินเกณฑ์':
      case 'ขึ้นสนิม':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/50';
      case 'ชำรุดเสียหายด่วน':
      case 'ร้อนผิดปกติ':
      case 'เสียงดังผิดปกติ':
      case 'ชำรุดแตกหัก':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/50';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  const getOverallIcon = (val: string) => {
    switch (val) {
      case 'ผ่านการตรวจสอบ':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />;
    }
  };

  // Convert GPS coordinates to a Google Maps search link if valid
  const getMapsLink = (coords: string) => {
    if (!coords || coords === 'ไม่ได้ระบุพิกัด') return null;
    const parts = coords.split(',');
    if (parts.length === 2) {
      const lat = parts[0].trim();
      const lng = parts[1].trim();
      if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      }
    }
    return null;
  };

  const mapsLink = getMapsLink(record.coordinates);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#0e0e11] rounded-xs max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-800"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b-2 border-slate-800 flex justify-between items-center bg-[#0a0a0c]">
          <div>
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">
              REPORT INSPECTION ENTRY
            </span>
            <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
              หม้อแปลงไฟฟ้า: {record.transformerId}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-900 rounded-full text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overall Verdict Status */}
          <div className="flex items-center gap-4 p-4 rounded-xs bg-slate-950 border-2 border-slate-900">
            {getOverallIcon(record.overallResult)}
            <div className="flex-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">สรุปภาพรวมผลลัพธ์ / VERDICT</span>
              <span className="text-lg font-black text-white">{record.overallResult}</span>
            </div>
            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-xs border ${getStatusBadge(record.overallResult)}`}>
              {record.overallResult === 'ผ่านการตรวจสอบ' ? 'OK' : 'FAIL'}
            </span>
          </div>

          {/* Core Parameters Checklist */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              รายละเอียดพารามิเตอร์ตรวจสอบ / SYSTEM TELEMETRY
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'ระดับน้ำมัน', value: record.oilLevel },
                { label: 'อุณหภูมิ', value: record.temperature },
                { label: 'เสียงการทำงาน', value: record.sound },
                { label: 'สภาพตัวถังภายนอก', value: record.exterior }
              ].map((item) => (
                <div key={item.label} className="p-3.5 bg-slate-950 rounded-xs border border-slate-900 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">{item.label}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-black rounded-xs border ${getStatusBadge(item.value)}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date & User */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-600 mt-1" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">วันและเวลาที่ตรวจสอบ</span>
                  <span className="text-sm font-medium text-slate-300">{record.timestamp}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-600 mt-1" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ผู้ตรวจสอบ / ENGINEER</span>
                  <span className="text-sm font-mono text-slate-300 break-all">{record.inspectorEmail}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-600 mt-1" />
                <div className="flex-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">พิกัดสถานที่ (GPS)</span>
                  <span className="text-sm font-mono text-slate-300 break-all">{record.coordinates}</span>
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-yellow-400 hover:text-yellow-300 mt-2.5 flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      <span>นำทางใน Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-slate-950 p-4 rounded-xs border border-slate-900">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">บันทึกเพิ่มเติม / Remarks</span>
            <p className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
              {record.remarks}
            </p>
          </div>

          {/* Attached Photo */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-600" />
              รูปถ่ายหน้างานจริง / FIELD CAPTURE
            </h4>
            {record.photoUrl && record.photoUrl.startsWith('http') ? (
              <div className="relative rounded-xs overflow-hidden border-2 border-slate-900 aspect-video bg-slate-950">
                <img
                  src={record.photoUrl}
                  alt={`Transformer ${record.transformerId}`}
                  className="w-full h-full object-cover"
                />
                <a
                  href={record.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] font-black py-2 px-3 rounded-none shadow border border-yellow-500 flex items-center gap-1.5 transition-all uppercase tracking-wider"
                >
                  <span>VIEW ORIGINAL IN DRIVE</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed border-slate-900 rounded-xs text-center text-slate-600 font-mono text-xs">
                NO PHOTO ATTACHED
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-800 bg-[#0a0a0c] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-900 border-2 border-slate-800 hover:border-slate-700 rounded-xs text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            CLOSE PROTOCOL
          </button>
        </div>
      </motion.div>
    </div>
  );
};
