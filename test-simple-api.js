const axios = require('axios');
require('dotenv').config();

async function testSimpleAPI() {
  try {
    const apiKey = process.env.TOUR_API_KEY;
    console.log('🔑 API 키 길이:', apiKey ? apiKey.length : 0);
    console.log('🔑 API 키 앞 10자:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    
    // 가장 간단한 API 호출
    const baseUrl = 'https://apis.data.go.kr/B551011/KorService1/areaCode1';
    const params = {
      serviceKey: apiKey,
      numOfRows: '10',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'JjikJio',
      _type: 'json'
    };

    console.log('📡 간단한 API 테스트 시작...');
    const response = await axios.get(baseUrl, { params });
    
    console.log('📡 API 응답 상태:', response.status);
    console.log('📡 API 응답 타입:', typeof response.data);
    console.log('📡 API 응답 내용:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ API 호출 오류:', error.message);
    if (error.response) {
      console.error('❌ 응답 상태:', error.response.status);
      console.error('❌ 응답 데이터:', error.response.data);
    }
    throw error;
  }
}

testSimpleAPI()
  .then(() => {
    console.log('✅ 간단한 API 테스트 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 테스트 실패');
    process.exit(1);
  });
