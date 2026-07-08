import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Loader2, Image as ImageIcon, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { InspectionRecord } from '../types';

interface InspectionFormProps {
  userEmail: string;
  onSubmit: (formData: Omit<InspectionRecord, 'photoUrl' | 'inspectorEmail'>, photoFile: File | null) => Promise<void>;
  isLoading: boolean;
  loadingStep: string;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({
  userEmail,
  onSubmit,
  isLoading,
  loadingStep,
}) => {
  const [transformerId, setTransformerId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [oilLevel, setOilLevel] = useState('ปกติ');
  const [temperature, setTemperature] = useState('ปกติ');
  const [sound, setSound] = useState('ปกติ');
  const [exterior, setExterior] = useState('ปกติ');
  const [overallResult, setOverallResult] = useState('ผ่านการตรวจสอบ');
  const [coordinates, setCoordinates] = useState('');
  const [remarks, setRemarks] = useState('');

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Set initial default timestamp on load
  useEffect(() => {
    const now = new Date();
    // Format to yyyy-MM-ddThh:mm for datetime-local input
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setTimestamp(localNow);
  }, []);

  // Set GPS location on load automatically if supported
  useEffect(() => {
    handleGetCurrentLocation();
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setGpsLoading(false);
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        let errorMsg = 'ไม่สามารถดึงพิกัดได้';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'ผู้ใช้ปฏิเสธการเข้าถึงพิกัดตำแหน่ง';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'ไม่สามารถระบุพิกัดได้ในขณะนี้';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'หมดเวลาในการค้นหาพิกัด';
        }
        setGpsError(errorMsg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transformerId.trim()) {
      alert('กรุณากรอก หมายเลขหม้อแปลง');
      return;
    }
    if (!timestamp) {
      alert('กรุณาเลือก วันและเวลาตรวจสอบ');
      return;
    }
    if (!photoFile) {
      alert('กรุณาแนบรูปถ่ายหน้างานจริง');
      return;
    }

    // Format timestamp for display (change "T" to " ")
    const formattedTimestamp = timestamp.replace('T', ' ');

    await onSubmit(
      {
        transformerId: transformerId.trim(),
        timestamp: formattedTimestamp,
        oilLevel,
        temperature,
        sound,
        exterior,
        overallResult,
        coordinates: coordinates || 'ไม่ได้ระบุพิกัด',
        remarks: remarks.trim() || '-',
      },
      photoFile
    );

    // Reset Form on Success
    setTransformerId('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemarks('');
    // Reset date to current
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setTimestamp(localNow);
    // Refresh GPS
    handleGetCurrentLocation();
  };

  return (
    <div id="inspection-form-container" className="bg-[#0e0e11] rounded-xs border-2 border-slate-800 p-6 md:p-8 shadow-2xl">
      <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight italic flex items-center gap-2.5">
        <span className="w-2.5 h-6 bg-yellow-400 inline-block transform -skew-x-12"></span>
        01. NEW PROTOCOL ENTRY
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transformer ID */}
        <div>
          <label htmlFor="transformer-id" className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-2">
            หมายเลขหม้อแปลง / TRANSFORMER ID <span className="text-yellow-400 font-bold">*</span>
          </label>
          <input
            id="transformer-id"
            type="text"
            required
            disabled={isLoading}
            placeholder="เช่น TX-1024, TF-500KVA"
            value={transformerId}
            onChange={(e) => setTransformerId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 focus:border-yellow-400 rounded-xs text-white font-mono placeholder-slate-700 focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Date & Time */}
        <div>
          <label htmlFor="inspection-time" className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-2">
            วันและเวลาในการบันทึก / TIMESTAMP <span className="text-yellow-400 font-bold">*</span>
          </label>
          <input
            id="inspection-time"
            type="datetime-local"
            required
            disabled={isLoading}
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 focus:border-yellow-400 rounded-xs text-white font-mono focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Status Parameters Group */}
        <div className="bg-slate-950 rounded-xs p-5 border-2 border-slate-900 space-y-4">
          <h3 className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2">
            ตรวจสอบแต่ละรายการ / SUB-COMPONENTS
          </h3>

          {/* Oil Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 md:gap-4 border-b border-slate-900 pb-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">ระดับน้ำมัน</span>
            <div className="col-span-2 flex bg-slate-900 p-1 rounded-xs border border-slate-800">
              {['ปกติ', 'ต่ำกว่าเกณฑ์', 'สูงเกินเกณฑ์'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setOilLevel(opt)}
                  className={`flex-1 text-center py-2 text-[10px] rounded-xs font-black transition-all ${
                    oilLevel === opt
                      ? 'bg-yellow-400 text-black font-black'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 md:gap-4 border-b border-slate-900 pb-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">อุณหภูมิ</span>
            <div className="col-span-2 flex bg-slate-900 p-1 rounded-xs border border-slate-800">
              {['ปกติ', 'ร้อนผิดปกติ'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setTemperature(opt)}
                  className={`flex-1 text-center py-2 text-[10px] rounded-xs font-black transition-all ${
                    temperature === opt
                      ? 'bg-yellow-400 text-black font-black'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Sound */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 md:gap-4 border-b border-slate-900 pb-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">เสียงทำงาน</span>
            <div className="col-span-2 flex bg-slate-900 p-1 rounded-xs border border-slate-800">
              {['ปกติ', 'เสียงดังผิดปกติ'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSound(opt)}
                  className={`flex-1 text-center py-2 text-[10px] rounded-xs font-black transition-all ${
                    sound === opt
                      ? 'bg-yellow-400 text-black font-black'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Exterior */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 md:gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">ตัวถังภายนอก</span>
            <div className="col-span-2 flex bg-slate-900 p-1 rounded-xs border border-slate-800">
              {['ปกติ', 'ขึ้นสนิม', 'ชำรุดแตกหัก'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setExterior(opt)}
                  className={`flex-1 text-center py-2 text-[10px] rounded-xs font-black transition-all ${
                    exterior === opt
                      ? 'bg-yellow-400 text-black font-black'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Verdict */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-2.5">
            ผลตรวจโดยรวม / OVERALL RESULT <span className="text-yellow-400 font-bold">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { val: 'ผ่านการตรวจสอบ', color: 'border-slate-800 text-slate-400 bg-slate-950/50 hover:border-slate-700', activeColor: 'bg-emerald-500 text-black border-emerald-500 font-black' },
              { val: 'ต้องบำรุงรักษา', color: 'border-slate-800 text-slate-400 bg-slate-950/50 hover:border-slate-700', activeColor: 'bg-amber-400 text-black border-amber-400 font-black' },
              { val: 'ชำรุดเสียหายด่วน', color: 'border-slate-800 text-slate-400 bg-slate-950/50 hover:border-slate-700', activeColor: 'bg-rose-600 text-white border-rose-600 font-black' }
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                disabled={isLoading}
                onClick={() => setOverallResult(opt.val)}
                className={`py-3 px-2 border-2 text-center text-xs font-black cursor-pointer transition-all duration-200 rounded-xs uppercase tracking-wide ${
                  overallResult === opt.val
                    ? opt.activeColor
                    : opt.color
                }`}
              >
                {opt.val}
              </button>
            ))}
          </div>
        </div>

        {/* Coordinates/Location */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="gps-coordinates" className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400">
              พิกัดตำแหน่ง / GPS COORDINATES
            </label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading || isLoading}
              className="text-[10px] uppercase tracking-wider font-black text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer"
            >
              {gpsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              ดึงพิกัดปัจจุบัน
            </button>
          </div>
          <div className="relative">
            <input
              id="gps-coordinates"
              type="text"
              placeholder="พิกัดละติจูด, ลองจิจูด เช่น 13.7563, 100.5018"
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border-2 border-slate-800 focus:border-yellow-400 rounded-xs text-white font-mono placeholder-slate-700 focus:outline-none transition-all duration-200"
            />
            <MapPin className="absolute left-4 top-3.5 text-slate-600 w-4 h-4" />
          </div>
          {gpsError && (
            <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-mono">
              <AlertCircle className="w-3 h-3" />
              {gpsError}
            </p>
          )}
        </div>

        {/* Photo Attachment */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-2">
            แนบรูปถ่ายหน้างานจริง / LIVE FIELD PHOTO <span className="text-yellow-400 font-bold">*</span>
          </label>
          <input
            id="photo-file-input"
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={isLoading}
          />

          {!photoPreview ? (
            <div
              onClick={triggerFileInput}
              className="border-2 border-dashed border-slate-800 hover:border-yellow-400 rounded-xs p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950 transition-all duration-200 flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className="w-12 h-12 bg-slate-900 rounded-xs flex items-center justify-center text-slate-500 mb-3 border border-slate-800">
                <Camera className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-300">คลิกเพื่อเปิดกล้อง หรือแนบรูปภาพ</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">CAMERA DEPLOY / FILE SELECT</p>
            </div>
          ) : (
            <div className="relative rounded-xs overflow-hidden border-2 border-slate-800 bg-slate-950 aspect-video group">
              <img
                src={photoPreview}
                alt="Inspection Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="p-3 bg-yellow-400 text-black rounded-none hover:bg-yellow-300 transition-all cursor-pointer shadow font-black uppercase text-xs"
                  title="เปลี่ยนรูปถ่าย"
                >
                  <Camera className="w-4 h-4 inline mr-1" /> RE-TAKE
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-3 bg-rose-600 text-white rounded-none hover:bg-rose-700 transition-all cursor-pointer shadow font-black uppercase text-xs"
                  title="ลบรูปถ่าย"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" /> DELETE
                </button>
              </div>
              {/* Filename display */}
              <div className="absolute bottom-0 inset-x-0 bg-black/80 px-4 py-2 text-xs text-slate-400 font-mono truncate">
                {photoFile?.name}
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label htmlFor="additional-remarks" className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-2">
            บันทึกเพิ่มเติม / ADDITIONAL REMARKS
          </label>
          <textarea
            id="additional-remarks"
            rows={3}
            placeholder="เช่น สภาพหน้างานปกติ, พบพงหญ้ารกชัน, หรือรายละเอียดอื่นๆ..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 focus:border-yellow-400 rounded-xs text-white placeholder-slate-700 focus:outline-none transition-all duration-200 resize-none font-sans text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          id="submit-form-button"
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 px-6 rounded-xs font-black uppercase tracking-[0.2em] text-black shadow-md transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 ${
            isLoading
              ? 'bg-slate-800 text-slate-500 border-2 border-slate-800 cursor-not-allowed shadow-none'
              : 'bg-yellow-400 border-2 border-yellow-400 hover:bg-yellow-300 hover:border-yellow-300 hover:shadow-lg hover:shadow-yellow-400/20 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{loadingStep || 'EXECUTION PROTOCOL...'}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 stroke-[2.5]" />
              <span>COMMIT REPORT & SUBMIT</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
