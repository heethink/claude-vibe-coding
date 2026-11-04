const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { REGIONS } = require('./data/regions');
const { dfs_xy_conv } = require('./utils/gridConverter');
const { fetchKmaWeather, generateMockWeather } = require('./services/kmaService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. 전국 지역 목록 API
app.get('/api/regions', (req, res) => {
  res.json({
    success: true,
    data: REGIONS
  });
});

// 2. 현재 서버 설정 상태 확인 (API 키 등록 여부)
app.get('/api/config', (req, res) => {
  const hasServerKey = Boolean(process.env.KMA_SERVICE_KEY && process.env.KMA_SERVICE_KEY.trim());
  res.json({
    success: true,
    hasServerKey
  });
});

// 3. 위경도 -> 기상청 격자 변환 API
app.get('/api/convert-grid', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, message: '올바른 lat, lon 값을 전달해주세요.' });
  }

  const grid = dfs_xy_conv('toXY', lat, lon);
  res.json({
    success: true,
    data: grid
  });
});

// 4. 기상청 날씨 조회 API
app.get('/api/weather', async (req, res) => {
  try {
    let nx = parseInt(req.query.nx);
    let ny = parseInt(req.query.ny);
    const regionName = req.query.region || '선택 지역';
    const isDemo = req.query.demo === 'true';

    // lat, lon이 전달된 경우 nx, ny 자동 계산
    if ((isNaN(nx) || isNaN(ny)) && req.query.lat && req.query.lon) {
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      const grid = dfs_xy_conv('toXY', lat, lon);
      nx = grid.nx;
      ny = grid.ny;
    }

    // 기본 좌표: 서울 종로구 (60, 127)
    if (isNaN(nx) || isNaN(ny)) {
      nx = 60;
      ny = 127;
    }

    // 클라이언트가 UI에서 입력한 키가 있으면 사용, 없으면 서버 환경변수 키 사용
    const clientKey = req.headers['x-kma-service-key'] || req.query.serviceKey;
    const serviceKey = clientKey || process.env.KMA_SERVICE_KEY;

    if (isDemo || !serviceKey || serviceKey.trim() === '') {
      const mockData = generateMockWeather(regionName, nx, ny);
      return res.json({
        success: true,
        data: mockData,
        message: isDemo ? '데모 모드로 동작 중입니다.' : 'API 키가 없어 모의 데이터를 표시합니다.'
      });
    }

    const weatherData = await fetchKmaWeather(serviceKey, regionName, nx, ny);
    res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      message: '날씨 정보를 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 루트 및 모든 라우트 정적 서빙
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🌤️  기상청 날씨 웹 애플리케이션 실행 완료!`);
    console.log(`🔗  로컬 주소: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
