const axios = require('axios');

// 기상청 기본 Base URL
const KMA_BASE_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

/**
 * 2자리 0패딩 문자열 반환
 */
function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * 현재 한국 시간(KST) Date 객체
 */
function getKSTDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 60 * 60 * 1000));
}

/**
 * 초단기실황(getUltraSrtNcst) 기준 BaseDate, BaseTime 계산
 * (매 시 40분에 발표되므로, 45분 이전이면 1시간 전 데이터 요청)
 */
function getUltraSrtNcstBaseDateTime() {
  const kst = getKSTDate();
  const minutes = kst.getMinutes();

  if (minutes < 45) {
    kst.setHours(kst.getHours() - 1);
  }

  const baseDate = `${kst.getFullYear()}${padZero(kst.getMonth() + 1)}${padZero(kst.getDate())}`;
  const baseTime = `${padZero(kst.getHours())}00`;

  return { baseDate, baseTime };
}

/**
 * 단기예보(getVilageFcst) 기준 BaseDate, BaseTime 계산
 * 발표시각: 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00 (각 10분 후 제공)
 */
function getVilageFcstBaseDateTime() {
  const kst = getKSTDate();
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
  const curHour = kst.getHours();
  const curMin = kst.getMinutes();

  let targetHour = -1;

  for (let i = baseHours.length - 1; i >= 0; i--) {
    const h = baseHours[i];
    if (curHour > h || (curHour === h && curMin >= 15)) {
      targetHour = h;
      break;
    }
  }

  if (targetHour === -1) {
    // 전날 23시 기준
    kst.setDate(kst.getDate() - 1);
    targetHour = 23;
  }

  const baseDate = `${kst.getFullYear()}${padZero(kst.getMonth() + 1)}${padZero(kst.getDate())}`;
  const baseTime = `${padZero(targetHour)}00`;

  return { baseDate, baseTime };
}

/**
 * PTY (강수형태) 한글 및 아이콘 변환
 */
function parsePty(ptyCode) {
  switch (String(ptyCode)) {
    case '1': return { text: '비', icon: 'rain' };
    case '2': return { text: '비/눈', icon: 'sleet' };
    case '3': return { text: '눈', icon: 'snow' };
    case '4': return { text: '소나기', icon: 'shower' };
    case '5': return { text: '빗방울', icon: 'drizzle' };
    case '6': return { text: '빗방울/눈날림', icon: 'sleet' };
    case '7': return { text: '눈날림', icon: 'snow' };
    default: return { text: '없음', icon: 'none' };
  }
}

/**
 * SKY (하늘상태) 한글 및 아이콘 변환
 */
function parseSky(skyCode, isNight = false) {
  switch (String(skyCode)) {
    case '1': return { text: '맑음', icon: isNight ? 'clear-night' : 'clear-day' };
    case '3': return { text: '구름많음', icon: isNight ? 'cloudy-night' : 'cloudy-day' };
    case '4': return { text: '흐림', icon: 'overcast' };
    default: return { text: '맑음', icon: isNight ? 'clear-night' : 'clear-day' };
  }
}

/**
 * 체감온도 계산 (간이 공식)
 */
function calculateSensoryTemp(temp, windSpeed) {
  // temp in C, wind in m/s -> km/h = m/s * 3.6
  if (temp <= 10 && windSpeed >= 1.3) {
    const v = Math.pow(windSpeed * 3.6, 0.16);
    const twc = 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v;
    return Math.round(twc * 10) / 10;
  }
  return temp;
}

/**
 * 모의(Mock) 데이터 생성기: API 키가 없거나 테스트할 때 사용
 */
function generateMockWeather(regionName, nx, ny) {
  const kst = getKSTDate();
  const currentHour = kst.getHours();
  const isNight = currentHour < 6 || currentHour >= 19;

  // 지역 좌표 기반 시드 느낌으로 자연스러운 기온 생성
  const baseT = 14 + ((nx + ny) % 8) - 4;
  const currentTemp = baseT + (Math.sin((currentHour - 6) / 24 * Math.PI * 2) * 6);
  const roundedTemp = Math.round(currentTemp * 10) / 10;

  const skyTypes = [
    { sky: '1', pty: '0', text: '맑음', icon: isNight ? 'clear-night' : 'clear-day' },
    { sky: '3', pty: '0', text: '구름많음', icon: isNight ? 'cloudy-night' : 'cloudy-day' },
    { sky: '4', pty: '0', text: '흐림', icon: 'overcast' },
    { sky: '4', pty: '1', text: '비', icon: 'rain' }
  ];
  const chosenCondition = skyTypes[(nx + ny) % skyTypes.length];

  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const fHour = (currentHour + i) % 24;
    const fDate = new Date(kst.getTime() + i * 3600 * 1000);
    const fDateStr = `${fDate.getFullYear()}-${padZero(fDate.getMonth() + 1)}-${padZero(fDate.getDate())}`;
    const t = Math.round((baseT + Math.sin((fHour - 6) / 24 * Math.PI * 2) * 6) * 10) / 10;
    const isHourlyNight = fHour < 6 || fHour >= 19;

    let hSky = '1';
    let hPty = '0';
    let hStatus = '맑음';
    let hIcon = isHourlyNight ? 'clear-night' : 'clear-day';

    if (i > 6 && i < 14) {
      hSky = '3';
      hStatus = '구름많음';
      hIcon = isHourlyNight ? 'cloudy-night' : 'cloudy-day';
    } else if (i >= 14 && i < 18) {
      hSky = '4';
      hStatus = '흐림';
      hIcon = 'overcast';
    }

    hourly.push({
      date: fDateStr,
      time: `${padZero(fHour)}:00`,
      temp: t,
      sky: hSky,
      pty: hPty,
      statusText: hStatus,
      icon: hIcon,
      pop: (i >= 12 && i <= 18) ? 30 : 10,
      humidity: 50 + ((i * 3) % 35)
    });
  }

  return {
    isMock: true,
    region: regionName,
    nx,
    ny,
    updatedAt: kst.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    current: {
      temp: roundedTemp,
      sensoryTemp: calculateSensoryTemp(roundedTemp, 2.5),
      condition: chosenCondition.text,
      icon: chosenCondition.icon,
      humidity: 55,
      windSpeed: 2.3,
      windDirection: '북서풍',
      precipitation: 0,
      pop: 10,
      minTemp: Math.round((baseT - 4) * 10) / 10,
      maxTemp: Math.round((baseT + 6) * 10) / 10
    },
    hourly
  };
}

/**
 * 실제 기상청 API 호출 및 데이터 가공
 */
async function fetchKmaWeather(serviceKey, regionName, nx, ny) {
  if (!serviceKey || serviceKey.trim() === '') {
    return generateMockWeather(regionName, nx, ny);
  }

  try {
    const { baseDate: ncstDate, baseTime: ncstTime } = getUltraSrtNcstBaseDateTime();
    const { baseDate: fcstDate, baseTime: fcstTime } = getVilageFcstBaseDateTime();

    // 1. 초단기실황 호출 (현재 실시간 날씨)
    const ncstParams = {
      serviceKey: decodeURIComponent(serviceKey),
      pageNo: 1,
      numOfRows: 20,
      dataType: 'JSON',
      base_date: ncstDate,
      base_time: ncstTime,
      nx,
      ny
    };

    // 2. 단기예보 호출 (시간별 예보 및 최고/최저 기온)
    const fcstParams = {
      serviceKey: decodeURIComponent(serviceKey),
      pageNo: 1,
      numOfRows: 300,
      dataType: 'JSON',
      base_date: fcstDate,
      base_time: fcstTime,
      nx,
      ny
    };

    const [ncstRes, fcstRes] = await Promise.allSettled([
      axios.get(`${KMA_BASE_URL}/getUltraSrtNcst`, { params: ncstParams, timeout: 6000 }),
      axios.get(`${KMA_BASE_URL}/getVilageFcst`, { params: fcstParams, timeout: 7000 })
    ]);

    // 실황 데이터 파싱
    let ncstItems = [];
    if (ncstRes.status === 'fulfilled' && ncstRes.value.data?.response?.body?.items?.item) {
      ncstItems = ncstRes.value.data.response.body.items.item;
    }

    // 예보 데이터 파싱
    let fcstItems = [];
    if (fcstRes.status === 'fulfilled' && fcstRes.value.data?.response?.body?.items?.item) {
      fcstItems = fcstRes.value.data.response.body.items.item;
    }

    // 두 API 모두 응답이 정상이 아닐 경우 에러 체크
    if (ncstItems.length === 0 && fcstItems.length === 0) {
      let errorMsg = '기상청 API 응답을 가져올 수 없습니다.';
      if (ncstRes.status === 'fulfilled' && ncstRes.value.data?.response?.header?.resultMsg) {
        errorMsg = ncstRes.value.data.response.header.resultMsg;
      } else if (fcstRes.status === 'fulfilled' && fcstRes.value.data?.response?.header?.resultMsg) {
        errorMsg = fcstRes.value.data.response.header.resultMsg;
      }
      console.warn(`[KMA API Warning] ${errorMsg} -> 데모 모드로 자동 폴백합니다.`);
      const mock = generateMockWeather(regionName, nx, ny);
      mock.apiNotice = `기상청 응답 오류 (${errorMsg})로 데모 데이터가 표시되었습니다.`;
      return mock;
    }

    // 실황 데이터 매핑
    const ncstMap = {};
    ncstItems.forEach(item => {
      ncstMap[item.category] = item.obsrValue;
    });

    const kst = getKSTDate();
    const currentHour = kst.getHours();
    const isNight = currentHour < 6 || currentHour >= 19;

    const currentTemp = ncstMap['T1H'] ? parseFloat(ncstMap['T1H']) : null;
    const currentHumidity = ncstMap['REH'] ? parseInt(ncstMap['REH']) : 50;
    const currentWindSpeed = ncstMap['WSD'] ? parseFloat(ncstMap['WSD']) : 0;
    const currentPrecip = ncstMap['RN1'] ? parseFloat(ncstMap['RN1']) : 0;
    const currentPty = ncstMap['PTY'] || '0';

    // 단기예보 데이터 시간대별 그룹핑
    const fcstByTime = {};
    let minTemp = null;
    let maxTemp = null;

    fcstItems.forEach(item => {
      const key = `${item.fcstDate}_${item.fcstTime}`;
      if (!fcstByTime[key]) {
        fcstByTime[key] = {
          date: `${item.fcstDate.slice(0, 4)}-${item.fcstDate.slice(4, 6)}-${item.fcstDate.slice(6, 8)}`,
          time: `${item.fcstTime.slice(0, 2)}:00`,
          rawTime: parseInt(item.fcstTime.slice(0, 2))
        };
      }
      fcstByTime[key][item.category] = item.fcstValue;

      if (item.category === 'TMN' && item.fcstValue) {
        const val = parseFloat(item.fcstValue);
        if (minTemp === null || val < minTemp) minTemp = val;
      }
      if (item.category === 'TMX' && item.fcstValue) {
        const val = parseFloat(item.fcstValue);
        if (maxTemp === null || val > maxTemp) maxTemp = val;
      }
    });

    // 시간순 정렬 및 예보 리스트 구성
    const sortedKeys = Object.keys(fcstByTime).sort();
    const hourly = [];
    let currentSky = '1';
    let currentPop = 0;

    sortedKeys.slice(0, 24).forEach((key, idx) => {
      const data = fcstByTime[key];
      const hHour = data.rawTime;
      const isHNight = hHour < 6 || hHour >= 19;
      const ptyInfo = parsePty(data['PTY'] || '0');
      const skyInfo = parseSky(data['SKY'] || '1', isHNight);

      let statusText = skyInfo.text;
      let icon = skyInfo.icon;
      if (ptyInfo.text !== '없음') {
        statusText = ptyInfo.text;
        icon = ptyInfo.icon;
      }

      if (idx === 0) {
        currentSky = data['SKY'] || '1';
        currentPop = data['POP'] ? parseInt(data['POP']) : 0;
      }

      hourly.push({
        date: data.date,
        time: data.time,
        temp: data['TMP'] ? parseFloat(data['TMP']) : currentTemp,
        sky: data['SKY'] || '1',
        pty: data['PTY'] || '0',
        statusText,
        icon,
        pop: data['POP'] ? parseInt(data['POP']) : 0,
        humidity: data['REH'] ? parseInt(data['REH']) : 50
      });
    });

    // 현재 상태 종합
    const ptyInfo = parsePty(currentPty);
    const skyInfo = parseSky(currentSky, isNight);
    let conditionText = skyInfo.text;
    let iconName = skyInfo.icon;

    if (ptyInfo.text !== '없음') {
      conditionText = ptyInfo.text;
      iconName = ptyInfo.icon;
    }

    const finalTemp = currentTemp !== null ? currentTemp : (hourly[0]?.temp || 15);

    return {
      isMock: false,
      region: regionName,
      nx,
      ny,
      updatedAt: kst.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      current: {
        temp: finalTemp,
        sensoryTemp: calculateSensoryTemp(finalTemp, currentWindSpeed),
        condition: conditionText,
        icon: iconName,
        humidity: currentHumidity,
        windSpeed: currentWindSpeed,
        windDirection: '풍속 ' + currentWindSpeed + 'm/s',
        precipitation: currentPrecip,
        pop: currentPop,
        minTemp: minTemp !== null ? minTemp : finalTemp - 3,
        maxTemp: maxTemp !== null ? maxTemp : finalTemp + 4
      },
      hourly
    };
  } catch (err) {
    console.error('[KMA API Error]', err.message);
    const mock = generateMockWeather(regionName, nx, ny);
    mock.apiNotice = `API 호출 중 오류(${err.message})가 발생하여 데모 모드로 전환되었습니다.`;
    return mock;
  }
}

module.exports = {
  fetchKmaWeather,
  generateMockWeather
};
