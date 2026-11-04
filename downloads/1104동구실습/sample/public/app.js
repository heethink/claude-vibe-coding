// 날씨 아이콘 SVG 생성 함수
function getWeatherIconSvg(iconName) {
  switch (iconName) {
    case 'clear-day':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
          <g stroke="#f59e0b" stroke-width="3" stroke-linecap="round">
            <line x1="32" y1="6" x2="32" y2="12" />
            <line x1="32" y1="52" x2="32" y2="58" />
            <line x1="6" y1="32" x2="12" y2="32" />
            <line x1="52" y1="32" x2="58" y2="32" />
            <line x1="14" y1="14" x2="18" y2="18" />
            <line x1="46" y1="46" x2="50" y2="50" />
            <line x1="14" y1="50" x2="18" y2="46" />
            <line x1="46" y1="18" x2="50" y2="14" />
          </g>
        </svg>
      `;
    case 'clear-night':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M42 36A18 18 0 1 1 28 22a14 14 0 0 0 14 14z" fill="#fcd34d" stroke="#f59e0b" stroke-width="2"/>
          <circle cx="48" cy="20" r="1.5" fill="#fef08a"/>
          <circle cx="44" cy="14" r="1" fill="#fef08a"/>
        </svg>
      `;
    case 'cloudy-day':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="26" cy="24" r="10" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
          <path d="M22 46h24a10 10 0 0 0 2-19.8 14 14 0 0 0-26.6-3.2A10 10 0 0 0 22 46z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="2"/>
        </svg>
      `;
    case 'cloudy-night':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M34 26A12 12 0 1 1 24 16a9 9 0 0 0 10 10z" fill="#fcd34d"/>
          <path d="M22 46h24a10 10 0 0 0 2-19.8 14 14 0 0 0-26.6-3.2A10 10 0 0 0 22 46z" fill="#64748b" stroke="#94a3b8" stroke-width="2"/>
        </svg>
      `;
    case 'overcast':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M26 34h20a8 8 0 0 0 1-15.9 11 11 0 0 0-20.8-2.6A8 8 0 0 0 26 34z" fill="#64748b" stroke="#94a3b8" stroke-width="2"/>
          <path d="M18 48h28a10 10 0 0 0 2-19.8 14 14 0 0 0-26.6-3.2A10 10 0 0 0 18 48z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
        </svg>
      `;
    case 'rain':
    case 'shower':
    case 'drizzle':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M18 40h28a10 10 0 0 0 2-19.8 14 14 0 0 0-26.6-3.2A10 10 0 0 0 18 40z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
          <g stroke="#38bdf8" stroke-width="3" stroke-linecap="round">
            <line x1="22" y1="46" x2="18" y2="54" />
            <line x1="32" y1="46" x2="28" y2="54" />
            <line x1="42" y1="46" x2="38" y2="54" />
          </g>
        </svg>
      `;
    case 'snow':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M18 40h28a10 10 0 0 0 2-19.8 14 14 0 0 0-26.6-3.2A10 10 0 0 0 18 40z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
          <g fill="#e0f2fe">
            <circle cx="20" cy="50" r="2.5"/>
            <circle cx="32" cy="52" r="2.5"/>
            <circle cx="44" cy="50" r="2.5"/>
          </g>
        </svg>
      `;
    case 'sleet':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M18 40h28a10 10 0 0 0 2-19.8 14 14 0 0 0-26.6-3.2A10 10 0 0 0 18 40z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
          <line x1="22" y1="46" x2="18" y2="54" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <circle cx="36" cy="50" r="2.5" fill="#e0f2fe"/>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
        </svg>
      `;
  }
}

// 상태 변수
let regionsData = [];
let selectedSido = '';
let selectedDistrict = null;
let customApiKey = localStorage.getItem('kma_api_key') || '';
let isDemoMode = localStorage.getItem('kma_demo_mode') === 'true';
let hasServerKey = false;

// DOM 요소
const sidoSelect = document.getElementById('sidoSelect');
const districtSelect = document.getElementById('districtSelect');
const btnFetchWeather = document.getElementById('btnFetchWeather');
const quickChipsContainer = document.getElementById('quickChipsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const weatherContent = document.getElementById('weatherContent');
const noticeBanner = document.getElementById('noticeBanner');
const noticeText = document.getElementById('noticeText');
const btnGeo = document.getElementById('btnGeo');

// 메인 날씨 표시 요소
const currentRegionText = document.getElementById('currentRegionText');
const dataSourceTag = document.getElementById('dataSourceTag');
const updateTimeText = document.getElementById('updateTimeText');
const weatherIconContainer = document.getElementById('weatherIconContainer');
const weatherConditionText = document.getElementById('weatherConditionText');
const currentTempText = document.getElementById('currentTempText');
const minTempText = document.getElementById('minTempText');
const maxTempText = document.getElementById('maxTempText');
const sensoryTempText = document.getElementById('sensoryTempText');
const humidityText = document.getElementById('humidityText');
const popText = document.getElementById('popText');
const windSpeedText = document.getElementById('windSpeedText');
const gridCoordText = document.getElementById('gridCoordText');
const hourlyList = document.getElementById('hourlyList');

// 모달 요소
const btnSettings = document.getElementById('btnSettings');
const btnBannerSettings = document.getElementById('btnBannerSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const demoToggle = document.getElementById('demoToggle');
const btnSaveKey = document.getElementById('btnSaveKey');
const settingsBtnLabel = document.getElementById('settingsBtnLabel');

// 주요 거점 빠른 선택 칩
const QUICK_REGIONS = [
  { label: '서울 종로', sido: '서울특별시', district: '종로구', nx: 60, ny: 127 },
  { label: '서울 강남', sido: '서울특별시', district: '강남구', nx: 61, ny: 126 },
  { label: '부산 해운대', sido: '부산광역시', district: '해운대구', nx: 99, ny: 75 },
  { label: '인천 송도', sido: '인천광역시', district: '연수구 (송도)', nx: 55, ny: 123 },
  { label: '대구 동성로', sido: '대구광역시', district: '중구 (동성로)', nx: 89, ny: 90 },
  { label: '대전 둔산', sido: '대전광역시', district: '서구 (둔산)', nx: 67, ny: 100 },
  { label: '광주 상무', sido: '광주광역시', district: '서구 (상무지구)', nx: 59, ny: 74 },
  { label: '강원 강릉', sido: '강원특별자치도', district: '강릉시', nx: 92, ny: 131 },
  { label: '제주공항', sido: '제주특별자치도', district: '제주시 (공항)', nx: 52, ny: 38 }
];

// 초기화
async function initApp() {
  await checkServerConfig();
  await loadRegions();
  renderQuickChips();
  setupEventListeners();

  // 저장된 이전 선택 지역 불러오기 (기본값: 서울 종로구)
  const savedSido = localStorage.getItem('kma_saved_sido');
  const savedDistrict = localStorage.getItem('kma_saved_district');

  if (savedSido && savedDistrict) {
    sidoSelect.value = savedSido;
    handleSidoChange(savedSido, savedDistrict);
  } else {
    // 기본 서울 종로구
    sidoSelect.value = '서울특별시';
    handleSidoChange('서울특별시', '종로구');
  }

  fetchWeather();
}

// 서버 키 설정 확인
async function checkServerConfig() {
  try {
    const res = await fetch('/api/config');
    const json = await res.json();
    hasServerKey = json.hasServerKey;
    updateSettingsStatus();
  } catch (e) {
    console.error('Config fetch failed', e);
  }
}

function updateSettingsStatus() {
  if (hasServerKey || customApiKey) {
    settingsBtnLabel.textContent = isDemoMode ? '데모 모드' : 'API 연동됨';
  } else {
    settingsBtnLabel.textContent = 'API 설정';
  }
}

// 전국 지역 데이터 로드
async function loadRegions() {
  try {
    const res = await fetch('/api/regions');
    const json = await res.json();
    if (json.success) {
      regionsData = json.data;
      populateSidoSelect();
    }
  } catch (err) {
    console.error('Regions load error', err);
  }
}

// 시/도 셀렉트박스 채우기
function populateSidoSelect() {
  sidoSelect.innerHTML = '<option value="">시/도를 선택하세요</option>';
  regionsData.forEach(region => {
    const opt = document.createElement('option');
    opt.value = region.sido;
    opt.textContent = region.sido;
    sidoSelect.appendChild(opt);
  });
}

// 시/도 변경 핸들러
function handleSidoChange(sidoName, defaultDistrictName = null) {
  selectedSido = sidoName;
  districtSelect.innerHTML = '<option value="">시/군/구를 선택하세요</option>';

  const region = regionsData.find(r => r.sido === sidoName);
  if (!region) {
    districtSelect.disabled = true;
    selectedDistrict = null;
    return;
  }

  region.districts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = d.name;
    districtSelect.appendChild(opt);
  });

  districtSelect.disabled = false;

  if (defaultDistrictName) {
    districtSelect.value = defaultDistrictName;
    selectedDistrict = region.districts.find(d => d.name === defaultDistrictName);
  } else if (region.districts.length > 0) {
    districtSelect.value = region.districts[0].name;
    selectedDistrict = region.districts[0];
  }
}

// 빠른 선택 칩 렌더링
function renderQuickChips() {
  quickChipsContainer.innerHTML = '';
  QUICK_REGIONS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      sidoSelect.value = item.sido;
      handleSidoChange(item.sido, item.district);
      fetchWeather();
    });
    quickChipsContainer.appendChild(btn);
  });
}

// 날씨 정보 요청
async function fetchWeather(customCoords = null) {
  loadingSpinner.style.display = 'block';
  weatherContent.style.opacity = '0.4';

  let regionName = '';
  let nx = 60;
  let ny = 127;

  if (customCoords) {
    regionName = customCoords.regionName || '현재 내 위치';
    nx = customCoords.nx;
    ny = customCoords.ny;
  } else {
    if (!selectedDistrict) {
      const sidoObj = regionsData.find(r => r.sido === sidoSelect.value);
      if (sidoObj && sidoObj.districts.length > 0) {
        selectedDistrict = sidoObj.districts[0];
      }
    }
    if (selectedDistrict) {
      regionName = `${selectedSido} ${selectedDistrict.name}`;
      nx = selectedDistrict.nx;
      ny = selectedDistrict.ny;
      localStorage.setItem('kma_saved_sido', selectedSido);
      localStorage.setItem('kma_saved_district', selectedDistrict.name);
    }
  }

  const queryParams = new URLSearchParams({
    nx,
    ny,
    region: regionName,
    demo: isDemoMode ? 'true' : 'false'
  });

  const headers = {};
  if (customApiKey && !isDemoMode) {
    headers['x-kma-service-key'] = customApiKey;
  }

  try {
    const res = await fetch(`/api/weather?${queryParams.toString()}`, { headers });
    const json = await res.json();

    if (json.success && json.data) {
      renderWeatherData(json.data);
    } else {
      alert(json.message || '날씨 정보를 가져오는 데 실패했습니다.');
    }
  } catch (err) {
    console.error('Fetch weather failed', err);
    alert('기상청 서버와 통신 중 문제가 발생했습니다.');
  } finally {
    loadingSpinner.style.display = 'none';
    weatherContent.style.opacity = '1';
  }
}

// 날씨 데이터 렌더링
function renderWeatherData(data) {
  currentRegionText.textContent = data.region;
  updateTimeText.textContent = `발표 기준: ${data.updatedAt}`;

  if (data.isMock) {
    dataSourceTag.textContent = '체험 데모 모드 (모의 데이터)';
    dataSourceTag.style.background = 'rgba(234, 179, 8, 0.2)';
    dataSourceTag.style.color = '#fde047';
    noticeBanner.style.display = 'flex';
    noticeText.textContent = data.apiNotice || '현재 데모 모드로 동작 중입니다. 공공데이터포털 API 키를 등록하면 실제 기상청 실시간 데이터를 조회합니다.';
  } else {
    dataSourceTag.textContent = '기상청 실시간 단기예보';
    dataSourceTag.style.background = 'rgba(59, 130, 246, 0.2)';
    dataSourceTag.style.color = '#93c5fd';
    noticeBanner.style.display = 'none';
  }

  // 실시간 기온 및 지표
  const c = data.current;
  currentTempText.textContent = Math.round(c.temp);
  weatherConditionText.textContent = c.condition;
  weatherIconContainer.innerHTML = getWeatherIconSvg(c.icon);

  minTempText.textContent = `${Math.round(c.minTemp)}°`;
  maxTempText.textContent = `${Math.round(c.maxTemp)}°`;
  sensoryTempText.textContent = `${c.sensoryTemp}°C`;

  humidityText.textContent = `${c.humidity}%`;
  popText.textContent = `${c.pop}%`;
  windSpeedText.textContent = `${c.windSpeed} m/s`;
  gridCoordText.textContent = `X: ${data.nx}, Y: ${data.ny}`;

  // 시간대별 예보 렌더링
  hourlyList.innerHTML = '';
  if (data.hourly && data.hourly.length > 0) {
    data.hourly.forEach(h => {
      const item = document.createElement('div');
      item.className = 'hourly-item';
      item.innerHTML = `
        <span class="hourly-time">${h.time}</span>
        <div class="hourly-icon">${getWeatherIconSvg(h.icon)}</div>
        <span class="hourly-temp">${Math.round(h.temp)}°</span>
        <span class="hourly-pop">💧 ${h.pop}%</span>
      `;
      hourlyList.appendChild(item);
    });
  }
}

// Geolocation 현재 위치 조회
function handleGeoLocation() {
  if (!navigator.geolocation) {
    alert('사용 중인 브라우저가 위치 정보를 지원하지 않습니다.');
    return;
  }

  btnGeo.disabled = true;
  btnGeo.innerHTML = `<span>위치 찾는 중...</span>`;

  navigator.geolocation.getCurrentPosition(
    async position => {
      btnGeo.disabled = false;
      btnGeo.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y1="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
        <span>내 위치</span>
      `;
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const res = await fetch(`/api/convert-grid?lat=${lat}&lon=${lon}`);
        const json = await res.json();
        if (json.success) {
          fetchWeather({
            regionName: '📍 현재 내 위치',
            nx: json.data.nx,
            ny: json.data.ny
          });
        }
      } catch (err) {
        console.error(err);
        alert('좌표 변환 중 오류가 발생했습니다.');
      }
    },
    error => {
      btnGeo.disabled = false;
      btnGeo.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y1="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
        <span>내 위치</span>
      `;
      alert('위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.');
    },
    { timeout: 8000 }
  );
}

// 이벤트 리스너 설정
function setupEventListeners() {
  sidoSelect.addEventListener('change', e => {
    handleSidoChange(e.target.value);
  });

  districtSelect.addEventListener('change', e => {
    const region = regionsData.find(r => r.sido === selectedSido);
    if (region) {
      selectedDistrict = region.districts.find(d => d.name === e.target.value);
    }
  });

  btnFetchWeather.addEventListener('click', () => {
    fetchWeather();
  });

  btnGeo.addEventListener('click', handleGeoLocation);

  // 모달 제어
  const openModal = () => {
    apiKeyInput.value = customApiKey;
    demoToggle.checked = isDemoMode;
    settingsModal.style.display = 'flex';
  };

  btnSettings.addEventListener('click', openModal);
  btnBannerSettings.addEventListener('click', openModal);

  btnCloseModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsModal.addEventListener('click', e => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  btnSaveKey.addEventListener('click', () => {
    customApiKey = apiKeyInput.value.trim();
    isDemoMode = demoToggle.checked;

    localStorage.setItem('kma_api_key', customApiKey);
    localStorage.setItem('kma_demo_mode', isDemoMode ? 'true' : 'false');

    settingsModal.style.display = 'none';
    updateSettingsStatus();
    fetchWeather();
  });
}

// 앱 실행
document.addEventListener('DOMContentLoaded', initApp);
