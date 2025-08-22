require('dotenv').config();
const BedrockService = require('./services/bedrockService');

async function testBedrock() {
  console.log('🧪 Bedrock 연결 테스트 시작...\n');
  
  // 환경 변수 확인
  console.log('📋 환경 변수 확인:');
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || '설정되지 않음'}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '설정됨' : '설정되지 않음'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '설정됨' : '설정되지 않음'}`);
  console.log(`   AWS_SESSION_TOKEN: ${process.env.AWS_SESSION_TOKEN ? '설정됨' : '설정되지 않음'}\n`);

  try {
    // BedrockService 인스턴스 생성
    const bedrockService = new BedrockService();
    console.log('✅ BedrockService 인스턴스 생성 성공\n');

    // 테스트용 건물 정보
    const testBuilding = {
      id: 'geunjeongjeon',
      name: '근정전',
      nameEn: 'Geunjeongjeon Hall',
      description: '경복궁의 정전',
      detailedDescription: '조선시대 왕이 신하들의 조회를 받던 정전',
      buildYear: '1395년',
      culturalProperty: '국보 제223호',
      features: ['정전', '왕의 집무실', '국가 행사장']
    };

    const testLocation = {
      address: '서울특별시 종로구 사직로 161',
      latitude: 37.5796,
      longitude: 126.9770,
      distanceToBuilding: 0,
      heading: 180
    };

    console.log('🤖 Bedrock API 호출 테스트...');
    const result = await bedrockService.generateBuildingPhilosophy(
      testBuilding, 
      testLocation, 
      { deviceType: 'test' }
    );

    console.log('\n📊 테스트 결과:');
    console.log(`   성공 여부: ${result.success ? '✅ 성공' : '❌ 실패'}`);
    console.log(`   건물명: ${result.buildingName}`);
    console.log(`   폴백 사용: ${result.fallback ? '예' : '아니오'}`);
    
    if (result.error) {
      console.log(`   오류: ${result.error}`);
    }

    if (result.content) {
      console.log('\n📝 생성된 콘텐츠 미리보기:');
      console.log(`   철학: ${result.content.philosophy.substring(0, 100)}...`);
      console.log(`   역사: ${result.content.history.substring(0, 100)}...`);
    }

    if (result.metadata) {
      console.log('\n🔍 메타데이터:');
      console.log(`   모델: ${result.metadata.model}`);
      console.log(`   토큰 수: ${result.metadata.tokens}`);
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('상세 오류:', error);
    
    // 일반적인 오류 원인 안내
    console.log('\n🔧 가능한 해결 방법:');
    console.log('1. AWS 자격 증명 확인');
    console.log('2. AWS 리전에서 Bedrock 서비스 사용 가능 여부 확인');
    console.log('3. Claude 3 Haiku 모델 액세스 권한 확인');
    console.log('4. 네트워크 연결 상태 확인');
  }
}

// 테스트 실행
testBedrock();