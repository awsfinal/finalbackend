require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5007;

// 미들웨어
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// ngrok 브라우저 경고 페이지 우회
app.use((req, res, next) => {
  res.header('ngrok-skip-browser-warning', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 서버 상태 확인
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '관광지 API 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// GPS 기반 가까운 관광지 조회
app.get('/api/tourist-spots/nearby', async (req, res) => {
  try {
    const { latitude, longitude, limit = 3 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'GPS 좌표가 필요합니다.'
      });
    }

    console.log(`🔍 가까운 관광지 조회 요청: ${latitude}, ${longitude}`);
    
    const serviceKey = process.env.TOUR_API_KEY;
    
    if (!serviceKey) {
      console.error('❌ TOUR_API_KEY가 설정되지 않았습니다.');
      return res.status(500).json({
        success: false,
        message: 'API 키가 설정되지 않았습니다.'
      });
    }

    console.log('🔑 API 키 확인:', serviceKey.substring(0, 20) + '...');

    // 관광공사 API 호출 (올바른 엔드포인트 사용)
    const apiUrl = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';
    const params = {
      serviceKey: serviceKey, // 인코딩된 키 그대로 사용
      numOfRows: parseInt(limit) * 5, // 더 많이 가져와서 필터링 (5배)
      pageNo: 1,
      MobileOS: 'ETC',
      MobileApp: 'TourApp',
      arrange: 'E', // 거리순 정렬
      mapX: longitude,
      mapY: latitude,
      radius: 30000, // 30km 반경으로 확대
      contentTypeId: 12, // 관광지만 (12: 관광지, 14: 문화시설, 15: 축제공연행사)
      _type: 'json'
    };

    console.log('🌐 관광공사 API 호출 중...');
    console.log('📋 요청 URL:', apiUrl);
    console.log('📋 요청 파라미터:', { ...params, serviceKey: params.serviceKey.substring(0, 20) + '...' });
    
    const response = await axios.get(apiUrl, { 
      params,
      timeout: 15000, // 15초 타임아웃
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('📋 API 응답 상태:', response.status);
    console.log('📋 API 응답 데이터 구조:', JSON.stringify(response.data, null, 2));

    // 응답 구조 안전하게 확인
    if (response.data && response.data.response && response.data.response.header) {
      if (response.data.response.header.resultCode === '0000') {
        const items = response.data.response.body?.items?.item || [];
        
        let spots = [];
        if (Array.isArray(items)) {
          spots = items.map(item => ({
            contentId: item.contentid,
            title: item.title,
            addr1: item.addr1,
            addr2: item.addr2,
            mapX: item.mapx,
            mapY: item.mapy,
            firstImage: item.firstimage,
            firstImage2: item.firstimage2,
            distance: item.dist ? parseFloat(item.dist) / 1000 : 0, // 미터를 킬로미터로 변환
            contentTypeId: item.contenttypeid
          }));
        } else if (items && typeof items === 'object') {
          // 단일 아이템인 경우
          spots = [{
            contentId: items.contentid,
            title: items.title,
            addr1: items.addr1,
            addr2: items.addr2,
            mapX: items.mapx,
            mapY: items.mapy,
            firstImage: items.firstimage,
            firstImage2: items.firstimage2,
            distance: items.dist ? parseFloat(items.dist) / 1000 : 0,
            contentTypeId: items.contenttypeid
          }];
        }

        // 주요 관광지 키워드로 필터링 (더 관대한 필터링)
        const majorAttractionKeywords = [
          '궁', '문', '탑', '성', '박물관', '공원', '광장', '시장', '다리', '산', '강', '호수', '섬', '마을', '거리', '길',
          '사찰', '절', '교회', '성당', '학교', '대학', '센터', '빌딩', '타워', '전망대', '놀이공원', '동물원', '식물원',
          'Palace', 'Gate', 'Tower', 'Castle', 'Museum', 'Park', 'Square', 'Market', 'Bridge', 'Mountain',
          'Temple', 'Church', 'University', 'Center', 'Building', 'Observatory', 'Zoo', 'Garden'
        ];

        // 제외할 키워드 (행사, 축제, 체험 등) - 더 구체적으로
        const excludeKeywords = [
          '교대의식', '축전', '축제', '행사', '체험', '투어', '프로그램', '공연', '전시회', '이벤트', '워크숍', '세미나',
          '콘서트', '쇼', '페스티벌', '대회', '경연', '시연', '데모', '런닝', '마라톤', '걷기', '산책', '트레킹',
          'Festival', 'Event', 'Tour', 'Program', 'Performance', 'Exhibition', 'Experience', 'Workshop',
          'Concert', 'Show', 'Competition', 'Demo', 'Running', 'Marathon', 'Walking', 'Trekking'
        ];

        const filteredSpots = spots.filter(spot => {
          const title = spot.title.toLowerCase();
          
          // 제외 키워드가 포함된 경우 제외
          const hasExcludeKeyword = excludeKeywords.some(keyword => 
            title.includes(keyword.toLowerCase())
          );
          
          if (hasExcludeKeyword) {
            console.log(`❌ 제외된 관광지: ${spot.title} (제외 키워드 포함)`);
            return false;
          }

          // 주요 관광지 키워드가 포함된 경우 포함
          const hasMajorKeyword = majorAttractionKeywords.some(keyword => 
            title.includes(keyword.toLowerCase())
          );

          // 또는 유명한 관광지 이름이 포함된 경우
          const famousAttractions = [
            '경복궁', '창덕궁', '덕수궁', '창경궁', '종묘', '숭례문', '흥인지문', '보신각',
            '명동', '인사동', '북촌', '남산', '한강', '여의도', '강남', '홍대', '이태원', '동대문', '남대문',
            '청계천', '광화문', '시청', '을지로', '종로', '압구정', '신사동', '가로수길', '삼청동', '서촌',
            'Gyeongbokgung', 'Changdeokgung', 'Deoksugung', 'Changgyeonggung', 'Jongmyo',
            'Sungnyemun', 'Heunginjimun', 'Bosingak', 'Myeongdong', 'Insadong', 'Bukchon',
            'Namsan', 'Hangang', 'Yeouido', 'Gangnam', 'Hongdae', 'Itaewon'
          ];

          const isFamousAttraction = famousAttractions.some(attraction => 
            title.includes(attraction)
          );

          const isIncluded = hasMajorKeyword || isFamousAttraction;
          
          if (isIncluded) {
            console.log(`✅ 포함된 관광지: ${spot.title}`);
          } else {
            console.log(`⚠️ 필터링된 관광지: ${spot.title} (키워드 매칭 안됨)`);
          }

          return isIncluded;
        });

        // 요청된 개수만큼 반환
        let finalSpots = filteredSpots.slice(0, parseInt(limit));

        // 필터링된 결과가 부족하면 문화시설(14)도 추가로 조회
        if (finalSpots.length < parseInt(limit)) {
          console.log(`⚠️ 관광지 결과 부족 (${finalSpots.length}/${limit}), 문화시설 추가 조회`);
          
          try {
            const culturalParams = {
              ...params,
              contentTypeId: 14, // 문화시설
              numOfRows: parseInt(limit) * 3
            };

            const culturalResponse = await axios.get(apiUrl, { 
              params: culturalParams,
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (culturalResponse.data?.response?.header?.resultCode === '0000') {
              const culturalItems = culturalResponse.data.response.body?.items?.item || [];
              let culturalSpots = [];
              
              if (Array.isArray(culturalItems)) {
                culturalSpots = culturalItems.map(item => ({
                  contentId: item.contentid,
                  title: item.title,
                  addr1: item.addr1,
                  addr2: item.addr2,
                  mapX: item.mapx,
                  mapY: item.mapy,
                  firstImage: item.firstimage,
                  firstImage2: item.firstimage2,
                  distance: item.dist ? parseFloat(item.dist) / 1000 : 0,
                  contentTypeId: item.contenttypeid
                }));
              }

              // 문화시설도 같은 필터링 적용
              const filteredCulturalSpots = culturalSpots.filter(spot => {
                const title = spot.title.toLowerCase();
                const hasExcludeKeyword = excludeKeywords.some(keyword => 
                  title.includes(keyword.toLowerCase())
                );
                return !hasExcludeKeyword;
              });

              // 부족한 만큼 추가
              const needed = parseInt(limit) - finalSpots.length;
              finalSpots = [...finalSpots, ...filteredCulturalSpots.slice(0, needed)];
            }
          } catch (culturalError) {
            console.error('문화시설 조회 오류:', culturalError.message);
          }
        }

        console.log(`✅ 관광공사 API에서 ${finalSpots.length}개 주요 관광지 발견`);
        
        res.json({
          success: true,
          message: '가까운 관광지 조회 완료',
          data: finalSpots,
          count: finalSpots.length
        });
      } else {
        console.error('❌ 관광공사 API 오류:', response.data.response.header.resultMsg);
        res.status(500).json({
          success: false,
          message: '관광공사 API 오류',
          error: response.data.response.header.resultMsg
        });
      }
    } else {
      console.error('❌ 예상하지 못한 API 응답 구조:', response.data);
      res.status(500).json({
        success: false,
        message: '예상하지 못한 API 응답 구조',
        error: 'Invalid response structure'
      });
    }
  } catch (error) {
    console.error('가까운 관광지 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '가까운 관광지 조회 실패',
      error: error.message
    });
  }
});

// 관광지 상세 정보 조회 (contentId 기반) - 실제 API 사용
app.get('/api/tourist-spots/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    if (!contentId) {
      return res.status(400).json({
        success: false,
        message: 'contentId가 필요합니다.'
      });
    }

    console.log(`🔍 관광지 상세 정보 조회: ${contentId}`);
    
    const serviceKey = process.env.TOUR_API_KEY;
    
    if (!serviceKey) {
      return res.status(500).json({
        success: false,
        message: 'API 키가 설정되지 않았습니다.'
      });
    }

    // 관광공사 API - 공통정보조회 (detailCommon)
    const detailUrl = `https://apis.data.go.kr/B551011/KorService2/detailCommon2`;
    
    const params = {
      serviceKey: serviceKey,
      numOfRows: 10,
      pageNo: 1,
      MobileOS: 'ETC',
      MobileApp: 'TourApp',
      contentId: contentId,
      _type: 'json'
    };

    console.log('🌐 상세 정보 API 호출 중...');
    const response = await axios.get(detailUrl, { 
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('📋 상세 API 응답:', JSON.stringify(response.data, null, 2));

    // 응답 구조 확인
    if (response.data && response.data.response && response.data.response.header) {
      if (response.data.response.header.resultCode === '0000') {
        const body = response.data.response.body;
        const items = body?.items?.item;
        
        if (items && items.length > 0) {
          const spot = items[0];
          
          // 소개정보조회 API 호출 (추가 정보)
          let introData = null;
          try {
            const introUrl = `https://apis.data.go.kr/B551011/KorService2/detailIntro2`;
            const introParams = {
              serviceKey: serviceKey,
              numOfRows: 10,
              pageNo: 1,
              MobileOS: 'ETC',
              MobileApp: 'TourApp',
              contentId: contentId,
              contentTypeId: spot.contenttypeid,
              _type: 'json'
            };

            const introResponse = await axios.get(introUrl, { 
              params: introParams,
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (introResponse.data?.response?.header?.resultCode === '0000') {
              const introItems = introResponse.data.response.body?.items?.item;
              if (introItems && introItems.length > 0) {
                introData = introItems[0];
              }
            }
          } catch (introError) {
            console.error('소개정보 조회 오류:', introError.message);
          }

          // 상세 정보 구성
          const detailInfo = {
            contentId: spot.contentid,
            title: spot.title || '제목 없음',
            address: spot.addr1 || '주소 정보 없음',
            addressDetail: spot.addr2 || '',
            tel: spot.tel || introData?.infocenter || '전화번호 정보 없음',
            overview: spot.overview || '상세 설명이 없습니다.',
            image: spot.firstimage || spot.firstimage2 || '',
            mapX: spot.mapx || '0',
            mapY: spot.mapy || '0',
            contentTypeId: spot.contenttypeid || '',
            
            // 추가 정보 (소개정보에서)
            usetime: introData?.usetime || '이용시간 정보 없음',
            restdate: introData?.restdate || '휴무일 정보 없음',
            parking: introData?.parking || '주차 정보 없음',
            usefee: introData?.usefee || '이용요금 정보 없음',
            homepage: introData?.homepage || ''
          };

          console.log('✅ 상세 정보 구성 완료:', detailInfo.title);

          res.json({
            success: true,
            message: '관광지 상세 정보 조회 완료',
            data: detailInfo
          });
        } else {
          res.status(404).json({
            success: false,
            message: '해당 관광지 정보를 찾을 수 없습니다.'
          });
        }
      } else {
        console.error('❌ API 오류:', response.data.response.header);
        res.status(500).json({
          success: false,
          message: 'API 호출 실패',
          error: response.data.response.header.resultMsg || 'Unknown error'
        });
      }
    } else {
      console.error('❌ 예상하지 못한 응답 구조:', response.data);
      res.status(500).json({
        success: false,
        message: '예상하지 못한 API 응답 구조',
        error: 'Invalid response structure'
      });
    }
  } catch (error) {
    console.error('관광지 상세 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '관광지 상세 정보 조회 실패',
      error: error.message
    });
  }
});

// 프론트엔드 정적 파일 서빙
app.use(express.static(require('path').join(__dirname, '../front/build')));

// SPA를 위한 캐치올 라우트
app.get('*', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../front/build', 'index.html'));
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 관광지 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 API 엔드포인트:`);
  console.log(`- GET /api/test : 서버 연결 테스트`);
  console.log(`- GET /api/tourist-spots/nearby : GPS 기반 가까운 관광지 조회`);
  console.log(`- GET /api/tourist-spots/:contentId : 관광지 상세 정보 조회`);
  console.log(`✅ 서버 준비 완료!`);
});
