import type { InspectionRecord } from '../types';

const SPREADSHEET_ID = '1NfNVey16Nc7F1v-cUUzGJzivMj68EJsgNO9N-SwKPRw';
const FOLDER_ID = '1fMhr0K45LvBk5kqTefi_4wPAwqMXjLfI';

/**
 * Fetch list of sheet names from the spreadsheet.
 */
export async function getSpreadsheetSheets(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet metadata: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.sheets || data.sheets.length === 0) {
      return ['Sheet1'];
    }

    return data.sheets.map((sheet: any) => sheet.properties.title);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return ['Sheet1']; // Fallback
  }
}

/**
 * Check if the target sheet has headers; if not, initialize them.
 */
export async function checkAndInitHeaders(accessToken: string, sheetName: string): Promise<void> {
  const headers = [
    'หมายเลขหม้อแปลง',
    'วันและเวลาที่ตรวจสอบ',
    'ระดับน้ำมัน',
    'อุณหภูมิ',
    'เสียงการทำงาน',
    'สภาพตัวถังภายนอก',
    'ผลการตรวจสอบโดยรวม',
    'พิกัดตำแหน่ง (GPS)',
    'ลิงก์รูปถ่าย (Google Drive)',
    'อีเมลผู้ตรวจสอบ',
    'บันทึกเพิ่มเติม'
  ];

  try {
    // Read the first row
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:K1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.status === 404) {
      // Sheet might be new/empty, let's create it by writing headers
    } else if (!res.ok) {
      throw new Error(`Failed to check headers: ${res.statusText}`);
    } else {
      const data = await res.json();
      if (data.values && data.values.length > 0 && data.values[0][0]) {
        // Headers already exist
        return;
      }
    }

    // Write headers
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:K1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
        }),
      }
    );

    if (!writeRes.ok) {
      throw new Error(`Failed to write headers: ${writeRes.statusText}`);
    }
  } catch (error) {
    console.error('Error checking or initializing headers:', error);
  }
}

/**
 * Upload an image file to Google Drive inside the specified Folder ID.
 * Sets permission to "anyone" "reader" so anyone with the link can view it,
 * and returns a shareable web-view link.
 */
export async function uploadPhotoToDrive(
  accessToken: string,
  file: File,
  transformerId: string
): Promise<string> {
  try {
    // Formulate descriptive filename
    const safeId = transformerId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `TX_${safeId}_${timestampStr}.jpg`;

    const metadata = {
      name: filename,
      mimeType: file.type || 'image/jpeg',
      parents: [FOLDER_ID],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    // 1. Upload file metadata + content
    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload error ${uploadRes.status}: ${errText}`);
    }

    const fileData = await uploadRes.json();
    const fileId = fileData.id;

    if (!fileId) {
      throw new Error('No file ID returned from Google Drive upload');
    }

    // 2. Set permission so anyone with the link can view (reader)
    try {
      const permRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      );
      if (!permRes.ok) {
        console.warn('Failed to set file permissions, links may be private to uploader');
      }
    } catch (permErr) {
      console.error('Error setting file permissions:', permErr);
    }

    // Return the standard view link (or fallback direct link)
    return `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
  } catch (error: any) {
    console.error('Error in uploadPhotoToDrive:', error);
    throw new Error(`อัปโหลดรูปภาพล้มเหลว: ${error.message || error}`);
  }
}

/**
 * Append an inspection record row to the Google Sheet.
 */
export async function appendInspectionRecord(
  accessToken: string,
  sheetName: string,
  record: InspectionRecord
): Promise<void> {
  const row = [
    record.transformerId,
    record.timestamp,
    record.oilLevel,
    record.temperature,
    record.sound,
    record.exterior,
    record.overallResult,
    record.coordinates,
    record.photoUrl,
    record.inspectorEmail,
    record.remarks,
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:K:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Append row failed ${res.status}: ${errText}`);
  }
}

/**
 * Fetch and parse all inspection records from Google Sheets.
 * Reads columns A to K starting from row 2 (skipping header).
 */
export async function fetchInspectionRecords(
  accessToken: string,
  sheetName: string
): Promise<InspectionRecord[]> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A2:K1000`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Failed to fetch values: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.values || data.values.length === 0) {
      return [];
    }

    // Map rows to InspectionRecord objects
    const records: InspectionRecord[] = data.values.map((row: any[]) => ({
      transformerId: row[0] || '',
      timestamp: row[1] || '',
      oilLevel: row[2] || '',
      temperature: row[3] || '',
      sound: row[4] || '',
      exterior: row[5] || '',
      overallResult: row[6] || '',
      coordinates: row[7] || '',
      photoUrl: row[8] || '',
      inspectorEmail: row[9] || '',
      remarks: row[10] || '',
    }));

    // Return reversed list so the newest is first
    return records.reverse();
  } catch (error) {
    console.error('Error fetching inspection records:', error);
    return [];
  }
}
