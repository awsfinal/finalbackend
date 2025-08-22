const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class BedrockService {
  constructor() {
    // AWS 자격 증명 설정
    const config = {
      region: process.env.AWS_REGION || 'us-east-1'
    };

    // 환경 변수가 있는 경우에만 자격 증명 추가
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };

      // 세션 토큰이 있는 경우 추가 (임시 자격 증명용)
      if (process.env.AWS_SESSION_TOKEN) {
        config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
      }
    }

    this.client = new BedrockRuntimeClient(config);

    // Claude 3 Haiku 모델 사용 (안정적이고 빠름)
    this.modelId = 'anthropic.claude-3-haiku-20240307-v1:0';

    console.log(`🤖 Bedrock 클라이언트 초기화: ${config.region}`);
    console.log(`📍 모델 ID: ${this.modelId}`);
    console.log(`🔑 자격 증명: ${config.credentials ? '환경변수 사용' : 'IAM 역할 사용'}`);
  }

  /**
   * 건축물의 철학과 역사를 생성합니다
   * @param {Object} buildingInfo - 건물 정보
   * @param {Object} locationInfo - 위치 정보
   * @param {Object} userContext - 사용자 컨텍스트
   * @returns {Promise<Object>} 생성된 철학·역사 정보
   */
  async generateBuildingPhilosophy(buildingInfo, locationInfo, userContext = {}) {
    try {
      const prompt = this.createPrompt(buildingInfo, locationInfo, userContext);

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      console.log('🤖 Bedrock 요청 시작:', buildingInfo.name);
      const response = await this.client.send(command);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const generatedContent = responseBody.content[0].text;

      console.log('✅ Bedrock 응답 완료');

      return this.parseResponse(generatedContent, buildingInfo);

    } catch (error) {
      console.error('❌ Bedrock 서비스 오류:', error);

      // 폴백: 기본 정보 반환
      return this.getFallbackResponse(buildingInfo);
    }
  }

  /**
   * Bedrock용 프롬프트 생성
   */
  createPrompt(buildingInfo, locationInfo, userContext) {
    const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    return `당신은 한국의 전통 건축과 역사에 대한 전문가입니다. 경복궁의 건축물에 대해 깊이 있는 철학적 해석과 역사적 맥락을 제공해주세요.

## 📍 현재 상황
- **건물명**: ${buildingInfo.name} (${buildingInfo.nameEn || 'Unknown'})
- **현재 위치**: ${locationInfo.address || '경복궁 내부'}
- **GPS 좌표**: ${locationInfo.latitude?.toFixed(6)}, ${locationInfo.longitude?.toFixed(6)}
- **건물과의 거리**: ${locationInfo.distanceToBuilding || 0}m
- **방위각**: ${locationInfo.heading ? Math.round(locationInfo.heading) + '°' : '미상'}
- **촬영 시간**: ${currentTime}
- **기기 타입**: ${userContext.deviceType || 'Unknown'}

## 🏛️ 건물 기본 정보
- **건립 연도**: ${buildingInfo.buildYear || '미상'}
- **문화재 지정**: ${buildingInfo.culturalProperty || '문화재'}
- **주요 특징**: ${buildingInfo.features?.join(', ') || '경복궁 건물'}
- **기본 설명**: ${buildingInfo.detailedDescription || '경복궁의 대표적인 건물입니다.'}

## 📝 요청사항
다음 형식으로 **한국어**로 응답해주세요:

### 🏛️ 건축 철학
- 이 건물이 담고 있는 조선시대의 건축 철학과 사상
- 공간 배치와 구조에 담긴 의미
- 왕실 건축으로서의 상징성

### 📚 역사적 맥락
- 건립 당시의 역사적 배경과 목적
- 주요 역사적 사건과 인물들
- 시대별 변화와 의미

### 🎨 문화적 가치
- 조선시대 문화와 예술적 특징
- 현재까지 이어지는 문화적 영향
- 보존의 의미와 가치

### 💭 현대적 해석
- 현재 우리에게 주는 교훈과 의미
- 전통과 현대의 연결점
- 방문자에게 전하고 싶은 메시지

**응답 길이**: 각 섹션당 2-3문단, 총 400-600자
**톤**: 교육적이면서도 흥미롭게, 전문적이지만 이해하기 쉽게
**특별 요청**: 현재 GPS 위치와 시간을 고려한 개인화된 해석 포함`;
  }

  /**
   * Bedrock 응답 파싱
   */
  parseResponse(generatedContent, buildingInfo) {
    try {
      // 섹션별로 파싱 시도
      const sections = {
        philosophy: this.extractSection(generatedContent, '🏛️ 건축 철학', '📚 역사적 맥락'),
        history: this.extractSection(generatedContent, '📚 역사적 맥락', '🎨 문화적 가치'),
        culture: this.extractSection(generatedContent, '🎨 문화적 가치', '💭 현대적 해석'),
        modern: this.extractSection(generatedContent, '💭 현대적 해석', null)
      };

      return {
        success: true,
        buildingName: buildingInfo.name,
        buildingNameEn: buildingInfo.nameEn,
        generatedAt: new Date().toISOString(),
        content: {
          philosophy: sections.philosophy || '이 건물은 조선시대의 건축 철학을 담고 있습니다.',
          history: sections.history || '역사적으로 중요한 의미를 가진 건물입니다.',
          culture: sections.culture || '조선시대 문화의 정수를 보여주는 건축물입니다.',
          modern: sections.modern || '현재에도 우리에게 많은 교훈을 주는 소중한 문화유산입니다.'
        },
        fullContent: generatedContent,
        metadata: {
          model: this.modelId,
          tokens: generatedContent.length,
          processingTime: Date.now()
        }
      };

    } catch (error) {
      console.error('응답 파싱 오류:', error);

      return {
        success: true,
        buildingName: buildingInfo.name,
        content: {
          philosophy: generatedContent.substring(0, 300) + '...',
          history: '역사적 맥락을 분석 중입니다.',
          culture: '문화적 가치를 해석 중입니다.',
          modern: '현대적 의미를 탐구 중입니다.'
        },
        fullContent: generatedContent
      };
    }
  }

  /**
   * 텍스트에서 특정 섹션 추출
   */
  extractSection(text, startMarker, endMarker) {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return null;

    const contentStart = startIndex + startMarker.length;
    const endIndex = endMarker ? text.indexOf(endMarker, contentStart) : text.length;

    if (endIndex === -1) {
      return text.substring(contentStart).trim();
    }

    return text.substring(contentStart, endIndex).trim();
  }

  /**
   * Bedrock 실패 시 폴백 응답
   */
  getFallbackResponse(buildingInfo) {
    return {
      success: false,
      buildingName: buildingInfo.name,
      content: {
        philosophy: `${buildingInfo.name}은 조선시대의 건축 철학과 왕실의 권위를 상징하는 건물입니다. 정교한 공간 배치와 아름다운 구조를 통해 조선 왕조의 이상과 가치관을 표현하고 있습니다.`,
        history: `${buildingInfo.buildYear || '조선시대'}에 건립된 이 건물은 경복궁의 중요한 구성 요소로서 왕실의 일상과 국정 운영에 핵심적인 역할을 담당했습니다.`,
        culture: `${buildingInfo.culturalProperty || '문화재'}로 지정된 이 건축물은 조선시대의 뛰어난 건축 기술과 예술적 감각을 보여주는 소중한 문화유산입니다.`,
        modern: `현재 우리에게 ${buildingInfo.name}은 전통과 현대를 잇는 다리 역할을 하며, 우리 조상들의 지혜와 미적 감각을 배울 수 있는 살아있는 교육장입니다.`
      },
      fallback: true,
      error: 'Bedrock 서비스 일시적 오류'
    };
  }

  /**
   * 건물별 맞춤형 키워드 생성
   */
  getBuildingKeywords(buildingId) {
    const keywords = {
      gyeonghoeru: ['연회', '외교', '누각', '연못', '조선 외교사'],
      geunjeongjeon: ['정전', '왕권', '조회', '국정', '조선 정치'],
      sajeongjeon: ['편전', '일상 정무', '실무', '왕의 업무'],
      gangnyeongjeon: ['침전', '왕의 생활', '사적 공간', '휴식'],
      gyotaejeon: ['왕비', '여성 공간', '꽃담', '궁중 생활'],
      jagyeongjeon: ['대왕대비', '어른 공경', '효', '가족']
    };

    return keywords[buildingId] || ['경복궁', '조선시대', '전통 건축'];
  }
}

module.exports = BedrockService;