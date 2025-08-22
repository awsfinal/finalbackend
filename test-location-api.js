const axios = require('axios');
require('dotenv').config();

async function testLocationBasedAPI() {
  try {
    // 제공받은 인증키 사용 (Decoding 버전)
    const apiKey = 'jXbeQ98Dvep6SzEFu8ulcLjvOeUWdY107O4fsq9SUJ0PQkDsUPXrm8gmZ8hKCnSSEEF6iM4Le8oMeyhqLrD3MQ==';
    
    console.log('🏛️ 한국관광공사 위치기반 API 테스트 시작...');

    // 서울 중심부 좌표 (광화문 기준)
    const baseUrl = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';
    const params = {
      serviceKey: apiKey,
      numOfRows: '10',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'JjikJio',
      _type: 'json',
      arrange: 'E', // 거리순 정렬
      mapX: '126.9780', // 광화문 경도
      mapY: '37.5665', // 광화문 위도
      radius: '10000', // 10km 반경
      contentTypeId: '12', // 관광지
      areaCode: '1' // 서울
    };

    console.log('📡 API 호출 URL:', baseUrl);
    console.log('📡 API 파라미터:', params);

    const response = await axios.get(baseUrl, { params });
    
    console.log('📡 API 응답 상태:', response.status);
    console.log('📡 API 응답 타입:', typeof response.data);
    
    if (typeof response.data === 'object') {
      console.log('📡 API 응답 구조:', JSON.stringify(response.data, null, 2));
      
      // 정상 응답 처리
      if (response.data.response && response.data.response.header) {
        const header = response.data.response.header;
        const body = response.data.response.body;
        
        console.log('📡 Header:', header);
        
        if (header.resultCode === '0000') {
          const items = body && body.items ? body.items.item : [];
          const itemsArray = Array.isArray(items) ? items : [items];
          
          console.log(`✅ 관광공사 API 응답: ${itemsArray.length}개 관광지`);
          
          // 첫 3개 관광지 정보 출력
          itemsArray.slice(0, 3).forEach((item, index) => {
            console.log(`📍 관광지 ${index + 1}:`, {
              title: item.title,
              addr1: item.addr1,
              mapX: item.mapx,
              mapY: item.mapy,
              firstImage: item.firstimage,
              dist: item.dist
            });
          });
          
          return itemsArray;
        } else {
          console.error('❌ API 오류:', header.resultMsg);
          throw new Error(`API 오류: ${header.resultMsg}`);
        }
      }
    } else {
      console.log('📡 API 응답 (문자열):', response.data);
      throw new Error('예상과 다른 응답 형식');
    }
    
  } catch (error) {
    console.error('❌ API 호출 오류:', error.message);
    if (error.response) {
      console.error('❌ 응답 상태:', error.response.status);
      console.error('❌ 응답 데이터:', error.response.data);
    }
    throw error;
  }
}

testLocationBasedAPI()
  .then(() => {
    console.log('✅ 위치기반 API 테스트 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 테스트 실패');
    process.exit(1);
  });
