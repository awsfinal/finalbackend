const axios = require('axios');
require('dotenv').config();

async function testTourAPI() {
  try {
    const apiKey = process.env.TOUR_API_KEY;
    console.log('🔑 API 키:', apiKey ? '설정됨' : '설정되지 않음');
    
    if (!apiKey) {
      throw new Error('관광공사 API 키가 설정되지 않았습니다.');
    }

    console.log('🏛️ 서울 관광지 데이터 가져오기 시작...');

    const baseUrl = 'https://apis.data.go.kr/B551011/KorService1/areaBasedList1';
    const params = {
      serviceKey: apiKey,
      numOfRows: 10,
      pageNo: 1,
      MobileOS: 'ETC',
      MobileApp: 'JjikJio',
      _type: 'json',
      listYN: 'Y',
      arrange: 'A',
      contentTypeId: 12, // 관광지
      areaCode: 1, // 서울
      cat1: 'A01' // 자연
    };

    console.log('📡 API 호출 URL:', baseUrl);
    console.log('📡 API 파라미터:', params);

    const response = await axios.get(baseUrl, { params });
    
    console.log('📡 API 응답 상태:', response.status);
    console.log('📡 API 응답 구조:', JSON.stringify(response.data, null, 2));
    
    // 응답 구조 확인 및 안전한 접근
    if (response.data && response.data.response) {
      const header = response.data.response.header;
      const body = response.data.response.body;
      
      console.log('📡 Header:', header);
      console.log('📡 Body:', body);
      
      if (header && header.resultCode === '0000') {
        const items = body && body.items ? (Array.isArray(body.items.item) ? body.items.item : [body.items.item]) : [];
        console.log(`✅ 관광공사 API 응답: ${items.length}개 관광지`);
        
        // 첫 번째 관광지 정보 출력
        if (items.length > 0) {
          console.log('📍 첫 번째 관광지:', items[0]);
        }
        
        return items;
      } else {
        const errorMsg = header ? header.resultMsg : '알 수 없는 오류';
        throw new Error(`API 오류: ${errorMsg}`);
      }
    } else {
      console.error('❌ 예상과 다른 API 응답 구조:', response.data);
      throw new Error('API 응답 구조가 예상과 다릅니다.');
    }
  } catch (error) {
    console.error('❌ 관광공사 API 호출 오류:', error.message);
    if (error.response) {
      console.error('❌ API 응답 오류:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// 테스트 실행
testTourAPI()
  .then(result => {
    console.log('✅ 테스트 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  });
