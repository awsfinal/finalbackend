const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 관광지 상세정보 조회 함수
async function getTouristSpotDetail(contentId) {
  try {
    const apiKey = 'jXbeQ98Dvep6SzEFu8ulcLjvOeUWdY107O4fsq9SUJ0PQkDsUPXrm8gmZ8hKCnSSEEF6iM4Le8oMeyhqLrD3MQ==';
    
    console.log(`🔍 관광지 상세정보 조회: ${contentId}`);

    // 1. 기본 상세정보 조회
    const detailUrl = 'https://apis.data.go.kr/B551011/KorService2/detailCommon2';
    const detailParams = {
      serviceKey: apiKey,
      numOfRows: '10',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'JjikJio',
      _type: 'json',
      contentId: contentId
    };

    const detailResponse = await axios.get(detailUrl, { params: detailParams });
    
    let detailInfo = {};
    if (detailResponse.data && detailResponse.data.response && 
        detailResponse.data.response.header.resultCode === '0000') {
      const items = detailResponse.data.response.body.items.item;
      const itemsArray = Array.isArray(items) ? items : [items];
      if (itemsArray.length > 0) {
        detailInfo = itemsArray[0];
      }
    }

    // 2. 소개정보 조회 (이용시간, 요금 등)
    const introUrl = 'https://apis.data.go.kr/B551011/KorService2/detailIntro2';
    const introParams = {
      serviceKey: apiKey,
      numOfRows: '10',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'JjikJio',
      _type: 'json',
      contentId: contentId,
      contentTypeId: '12' // 관광지
    };

    const introResponse = await axios.get(introUrl, { params: introParams });
    
    let introInfo = {};
    if (introResponse.data && introResponse.data.response && 
        introResponse.data.response.header.resultCode === '0000') {
      const items = introResponse.data.response.body.items.item;
      const itemsArray = Array.isArray(items) ? items : [items];
      if (itemsArray.length > 0) {
        introInfo = itemsArray[0];
      }
    }

    // 3. 정보 통합
    const combinedInfo = {
      // 기본 정보
      contentId: detailInfo.contentid || contentId,
      title: detailInfo.title || '정보 없음',
      addr1: detailInfo.addr1 || '주소 정보 없음',
      addr2: detailInfo.addr2 || '',
      tel: detailInfo.tel || introInfo.infocenter || '전화번호 정보 없음',
      homepage: detailInfo.homepage || '',
      overview: detailInfo.overview || '설명 정보 없음',
      firstImage: detailInfo.firstimage || '',
      firstImage2: detailInfo.firstimage2 || '',
      mapX: detailInfo.mapx || '',
      mapY: detailInfo.mapy || '',
      zipcode: detailInfo.zipcode || '',
      
      // 상세 정보 (소개정보에서)
      usetime: introInfo.usetime || '이용시간 정보 없음',
      restdate: introInfo.restdate || '휴무일 정보 없음',
      usefee: introInfo.usefee || '요금 정보 없음',
      parking: introInfo.parking || '주차장 정보 없음',
      chkbabycarriage: introInfo.chkbabycarriage || '',
      chkpet: introInfo.chkpet || '',
      chkcreditcard: introInfo.chkcreditcard || '',
      infocenter: introInfo.infocenter || detailInfo.tel || '문의처 정보 없음',
      
      // 추가 편의시설 정보
      restroom: introInfo.restroom || '',
      smoking: introInfo.smoking || '',
      guidebook: introInfo.guidebook || '',
      audioguide: introInfo.audioguide || ''
    };

    console.log(`✅ 관광지 상세정보 조회 완료: ${combinedInfo.title}`);
    return combinedInfo;

  } catch (error) {
    console.error('❌ 관광지 상세정보 조회 오류:', error.message);
    if (error.response) {
      console.error('❌ API 응답 오류:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// 가까운 관광지 조회 API (먼저 정의)
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
    
    const apiKey = 'jXbeQ98Dvep6SzEFu8ulcLjvOeUWdY107O4fsq9SUJ0PQkDsUPXrm8gmZ8hKCnSSEEF6iM4Le8oMeyhqLrD3MQ==';
    const baseUrl = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';
    const params = {
      serviceKey: apiKey,
      numOfRows: limit.toString(),
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'JjikJio',
      _type: 'json',
      arrange: 'E', // 거리순 정렬
      mapX: longitude.toString(),
      mapY: latitude.toString(),
      radius: '10000',
      contentTypeId: '12', // 관광지
      areaCode: '1' // 서울
    };

    const response = await axios.get(baseUrl, { params });
    
    if (response.data && response.data.response) {
      const header = response.data.response.header;
      const body = response.data.response.body;
      
      if (header && header.resultCode === '0000') {
        const items = body && body.items ? body.items.item : [];
        const itemsArray = Array.isArray(items) ? items : [items];
        
        // API 데이터를 메인페이지 형식에 맞게 변환
        const formattedSpots = itemsArray.map(spot => ({
          contentId: spot.contentid,
          title: spot.title,
          addr1: spot.addr1,
          addr2: spot.addr2,
          areaCode: spot.areacode,
          cat1: spot.cat1,
          cat2: spot.cat2,
          cat3: spot.cat3,
          contentTypeId: spot.contenttypeid,
          firstImage: spot.firstimage,
          firstImage2: spot.firstimage2,
          mapX: parseFloat(spot.mapx),
          mapY: parseFloat(spot.mapy),
          tel: spot.tel,
          zipcode: spot.zipcode,
          distance: parseFloat(spot.dist) / 1000, // 미터를 킬로미터로 변환
          modifiedTime: spot.modifiedtime
        }));

        res.json({
          success: true,
          message: '가까운 관광지 조회 완료',
          data: formattedSpots,
          count: formattedSpots.length
        });
      } else {
        const errorMsg = header ? header.resultMsg : '알 수 없는 오류';
        throw new Error(`API 오류: ${errorMsg}`);
      }
    } else {
      throw new Error('API 응답 구조가 예상과 다릅니다.');
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

// 관광지 상세정보 API 엔드포인트 (나중에 정의)
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
    
    const detailInfo = await getTouristSpotDetail(contentId);

    res.json({
      success: true,
      message: '관광지 상세정보 조회 완료',
      data: detailInfo
    });
  } catch (error) {
    console.error('관광지 상세정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '관광지 상세정보 조회 실패',
      error: error.message
    });
  }
});

const PORT = 5006;
app.listen(PORT, () => {
  console.log(`🚀 테스트 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 API 엔드포인트:`);
  console.log(`   - GET /api/tourist-spots/nearby : 가까운 관광지 조회`);
  console.log(`   - GET /api/tourist-spots/:contentId : 관광지 상세정보 조회`);
});
