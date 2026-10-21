const { put, list } = require('@vercel/blob');
const seedAssignments = require('./seed.json');

const ASSIGNMENTS_KEY = 'assignments.json';

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
}

// Fetch all assignments from Vercel Blob, fallback to seed
async function getStoredAssignments() {
  try {
    const blobs = await list({ prefix: ASSIGNMENTS_KEY });
    const target = blobs.blobs.find(b => b.pathname === ASSIGNMENTS_KEY);
    if (target && target.url) {
      const res = await fetch(`${target.url}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    }
  } catch (err) {
    console.error('Error reading assignments from blob:', err);
  }

  // If not yet saved in blob, initialize with seed
  try {
    await put(ASSIGNMENTS_KEY, JSON.stringify(seedAssignments, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
  } catch (e) {
    console.error('Error initializing seed in blob:', e);
  }
  return seedAssignments;
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Return all assignments
  if (req.method === 'GET') {
    try {
      const assignments = await getStoredAssignments();
      return res.status(200).json({
        success: true,
        count: assignments.length,
        assignments
      });
    } catch (err) {
      console.error('GET error:', err);
      return res.status(500).json({ success: false, error: err.message, assignments: seedAssignments });
    }
  }

  // 2. POST: Add a new assignment
  if (req.method === 'POST') {
    try {
      let item = req.body;
      if (typeof item === 'string') {
        try { item = JSON.parse(item); } catch (e) {}
      }

      if (!item || !item.name) {
        return res.status(400).json({ success: false, error: '수강생 이름이 필요합니다.' });
      }

      // If there is HTML fileData, upload it as a standalone live HTML website in blob storage
      if (item.fileData && (item.isHtml || (item.fileName && item.fileName.endsWith('.html')))) {
        try {
          const safeName = (item.fileName || 'index.html').replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileBlob = await put(`files/${item.id}_${safeName}`, item.fileData, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'text/html; charset=utf-8'
          });
          item.fileUrl = fileBlob.url;
        } catch (fileErr) {
          console.error('HTML blob upload error:', fileErr);
        }
      } else if (item.isImage && item.fileData && item.fileData.startsWith('data:')) {
        // If image base64, save image blob to keep assignments.json small
        try {
          const matches = item.fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mime = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const safeName = (item.fileName || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
            const imgBlob = await put(`files/${item.id}_${safeName}`, buffer, {
              access: 'public',
              addRandomSuffix: false,
              contentType: mime
            });
            item.fileUrl = imgBlob.url;
            item.fileData = imgBlob.url;
          }
        } catch (imgErr) {
          console.error('Image blob upload error:', imgErr);
        }
      }

      // Get current assignments list
      const currentList = await getStoredAssignments();

      // Check if item already exists by ID
      const existingIdx = currentList.findIndex(it => it.id === item.id);
      if (existingIdx >= 0) {
        currentList[existingIdx] = { ...currentList[existingIdx], ...item };
      } else {
        currentList.unshift(item);
      }

      // Save updated list back to Vercel Blob
      await put(ASSIGNMENTS_KEY, JSON.stringify(currentList, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });

      return res.status(200).json({
        success: true,
        assignment: item,
        total: currentList.length
      });
    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 3. DELETE: Remove assignment by ID
  if (req.method === 'DELETE') {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ success: false, error: '삭제할 ID가 필요합니다.' });
      }

      const numId = Number(id);
      const currentList = await getStoredAssignments();
      const updatedList = currentList.filter(it => it.id !== numId && it.id != id);

      await put(ASSIGNMENTS_KEY, JSON.stringify(updatedList, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });

      return res.status(200).json({
        success: true,
        total: updatedList.length
      });
    } catch (err) {
      console.error('DELETE error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
