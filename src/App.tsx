import { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, RefreshCw, AlertCircle, Sparkles, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, logout } from './firebase';
import {
  getSpreadsheetSheets,
  checkAndInitHeaders,
  uploadPhotoToDrive,
  appendInspectionRecord,
  fetchInspectionRecords,
} from './services/googleWorkspace';
import { InspectionForm } from './components/InspectionForm';
import { InspectionHistory } from './components/InspectionHistory';
import { RecordDetailsModal } from './components/RecordDetailsModal';
import type { InspectionRecord } from './types';
import type { User } from 'firebase/auth';

const SPREADSHEET_ID = '1NfNVey16Nc7F1v-cUUzGJzivMj68EJsgNO9N-SwKPRw';
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sheets data states
  const [sheetName, setSheetName] = useState<string>('Sheet1');
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submission load states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected record state for Modal
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Sheets & Records when authenticated
  useEffect(() => {
    if (token && user) {
      loadWorkspaceData();
    }
  }, [token, user]);

  const loadWorkspaceData = async () => {
    if (!token) return;
    setLoadingRecords(true);
    setErrorMsg(null);

    try {
      // 1. Get sheets list from spreadsheet
      const sheets = await getSpreadsheetSheets(token);
      setSheetOptions(sheets);

      // Default to the first sheet
      const activeSheet = sheets[0] || 'Sheet1';
      setSheetName(activeSheet);

      // 2. Initialize headers if they don't exist
      await checkAndInitHeaders(token, activeSheet);

      // 3. Fetch initial inspection rows
      const rows = await fetchInspectionRecords(token, activeSheet);
      setRecords(rows);
    } catch (err: any) {
      console.error('Error loading Google Workspace data:', err);
      setErrorMsg('ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ กรุณาเชื่อมต่อบัญชีใหม่อีกครั้ง');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleRefreshRecords = async () => {
    if (!token || !sheetName) return;
    setLoadingRecords(true);
    setErrorMsg(null);
    try {
      const rows = await fetchInspectionRecords(token, sheetName);
      setRecords(rows);
    } catch (err) {
      setErrorMsg('การรีเฟรชข้อมูลล้มเหลว');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMsg('การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setRecords([]);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleFormSubmit = async (
    formData: Omit<InspectionRecord, 'photoUrl' | 'inspectorEmail'>,
    photoFile: File | null
  ) => {
    if (!token || !user) {
      setErrorMsg('กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูล');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMsg(null);

    try {
      let finalPhotoUrl = '-';

      if (photoFile) {
        setSubmitStep('กำลังอัปโหลดรูปภาพลง Google Drive...');
        finalPhotoUrl = await uploadPhotoToDrive(token, photoFile, formData.transformerId);
      }

      setSubmitStep('กำลังบันทึกรายงานลง Google Sheet...');
      const fullRecord: InspectionRecord = {
        ...formData,
        photoUrl: finalPhotoUrl,
        inspectorEmail: user.email || 'unknown',
      };

      await appendInspectionRecord(token, sheetName, fullRecord);

      // Trigger history refresh
      setSubmitStep('กำลังอัปเดตประวัติรายการล่าสุด...');
      const updatedRows = await fetchInspectionRecords(token, sheetName);
      setRecords(updatedRows);

      setSuccessMessage('บันทึกข้อมูลและอัปโหลดรูปภาพเสร็จสิ้นสำเร็จ!');
      // Hide success notification after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMsg(err.message || 'การบันทึกข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
      setSubmitStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-50 antialiased font-sans flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Dynamic Success Alert Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500 text-black font-black py-3 px-6 rounded-none shadow-2xl border-2 border-emerald-400 flex items-center gap-2.5 text-sm uppercase tracking-wider"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Professional Header */}
      <header className="h-20 border-b border-slate-800 sticky top-0 z-40 bg-[#0A0A0B] px-4 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-400 flex items-center justify-center rounded-xs">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">
              GridGuard <span className="text-yellow-400 text-lg md:text-xl font-mono not-italic ml-1">TX-REPORT</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-bold hidden sm:block mt-1">
              Field Inspection Protocol v4.0.12
            </p>
          </div>
        </div>

        {/* User Profile Bar / System Status */}
        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">System Status</p>
            <p className="text-emerald-400 text-xs font-mono font-bold">● GOOGLE_WORKSPACE_ACTIVE</p>
          </div>

          {!needsAuth && user ? (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 pl-3 pr-1.5 rounded-sm">
              <div className="text-right hidden md:block">
                <p className="text-xs font-black text-slate-200 leading-tight">
                  {user.displayName || 'Inspector'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {user.email}
                </p>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full border border-slate-700 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-sm border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Protocol Link</p>
              <p className="text-amber-400 text-xs font-mono font-bold">● REQUIRE_AUTH</p>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-10 flex flex-col justify-center">
        {needsAuth ? (
          /* Landing & Login Screen */
          <div className="max-w-md w-full mx-auto py-12 md:py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-[#0e0e11] rounded-xs p-8 md:p-10 border-2 border-slate-800 shadow-2xl flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-yellow-400 flex items-center justify-center text-black mb-6 rounded-xs">
                <FileSpreadsheet className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h2 className="text-3xl font-black tracking-tight uppercase text-white mb-3 italic">
                00. Authenticate
              </h2>
              <p className="text-xs text-slate-400 tracking-wide leading-relaxed mb-8 px-2 uppercase font-medium">
                โปรดเข้าสู่ระบบด้วยบัญชี Google เพื่อให้ระบบสามารถบันทึกรายงานผลตรวจสอบลงใน Google Sheets และอัปโหลดรูปภาพลง Google Drive ที่กำหนดไว้
              </p>

              {/* Login error if any */}
              {errorMsg && (
                <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xs flex items-start gap-2.5 text-xs text-rose-300 text-left w-full">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* GSI Login Button */}
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className={`relative inline-flex items-center justify-center bg-yellow-400 border-2 border-yellow-400 hover:bg-yellow-300 hover:border-yellow-300 text-black py-4 px-6 text-base font-black uppercase tracking-[0.2em] transition-all duration-200 cursor-pointer w-full active:scale-[0.98] rounded-xs shadow-md ${
                  isLoggingIn ? 'opacity-70 cursor-not-allowed shadow-none' : ''
                }`}
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center justify-center gap-3 w-full">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0 bg-white p-1 rounded-sm">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Google Sign In</span>
                  </div>
                )}
              </button>

              {/* Informative credentials card */}
              <div className="mt-8 border-t border-slate-800 pt-6 text-left w-full space-y-3">
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">เป้าหมายข้อมูลปลายทาง</span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 p-2.5 rounded-sm border border-slate-800">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">Sheet_ID: 1NfNVey16Nc...</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 p-2.5 rounded-sm border border-slate-800">
                    <UserIcon className="w-4 h-4 text-amber-400" />
                    <span className="truncate">Folder_ID: 1fMhr0K45...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Inspection Console Screen */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-5">
              {errorMsg && (
                <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-sm flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <InspectionForm
                userEmail={user?.email || 'unknown'}
                onSubmit={handleFormSubmit}
                isLoading={isSubmitting}
                loadingStep={submitStep}
              />
            </div>

            {/* History List Column */}
            <div className="lg:col-span-7 h-full">
              <InspectionHistory
                records={records}
                onRefresh={handleRefreshRecords}
                isRefreshing={loadingRecords}
                onSelectRecord={(rec) => setSelectedRecord(rec)}
                sheetUrl={GOOGLE_SHEET_URL}
              />
            </div>
          </div>
        )}
      </main>

      {/* Record details View Modal */}
      <RecordDetailsModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      {/* Footer */}
      <footer className="h-16 border-t border-slate-800 bg-[#0A0A0B] flex items-center px-4 md:px-10 justify-between text-xs text-slate-500 font-mono">
        <div className="flex gap-4 items-center overflow-hidden">
          <span className="truncate hidden md:inline">Sheet_ID: {SPREADSHEET_ID.substring(0, 18)}...</span>
          <span className="text-slate-800 hidden md:inline">|</span>
          <span className="truncate">Drive_Folder: 1fMhr0K45...</span>
        </div>
        <div className="text-right font-black uppercase text-slate-400 tracking-wider">
          Sam Promratana © 2026
        </div>
      </footer>
    </div>
  );
}
