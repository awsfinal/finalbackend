# JjikGeo Final Backend

찍고갈래(JjikGeo) 프로젝트의 통합 백엔드 서버입니다.

## 🚀 주요 기능

### API 엔드포인트

#### 🌤️ 날씨 정보
- `GET /api/weather?lat={lat}&lng={lng}` - GPS 좌표 기반 날씨 정보

#### 🏛️ 건물/유산 정보  
- `GET /api/building/:id` - 건물 상세 정보
- `GET /api/buildings` - 전체 건물 목록
- `POST /api/philosophy/:id` - AI 철학 설명 생성

#### 🗺️ 관광지 정보
- `GET /api/tourist-spots/nearby` - 근처 관광지 조회
- `GET /api/tourist-spots/:contentId` - 관광지 상세 정보
- `POST /api/tourist-spots/init` - 관광지 데이터 초기화

#### 📸 이미지 분석
- `POST /api/analyze-photo` - 사진 분석 (건물 인식)
- `POST /api/upload` - 이미지 업로드

#### 💬 커뮤니티
- `GET /api/community/posts/:boardId` - 게시글 목록
- `POST /api/community/posts` - 게시글 작성
- `POST /api/community/comments` - 댓글 작성
- `POST /api/community/like/:postId` - 좋아요 토글

#### 🎯 스탬프/체험
- `GET /api/stamp/tourist-spots` - 스탬프 관광지
- `GET /api/stamp/unesco-sites` - 유네스코 사이트

## 🔧 환경 설정

### 필수 환경변수
```env
PORT=5006
NODE_ENV=development

# PostgreSQL RDS 연결 정보
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=jjikgeo
DB_USER=your-username
DB_PASSWORD=your-password

# AWS 설정
AWS_REGION=ap-northeast-1
```

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 서버 실행
npm start
```

## 🏗️ 아키텍처

- **Framework**: Express.js
- **Database**: PostgreSQL (AWS RDS)
- **AI Service**: AWS Bedrock
- **Image Processing**: Sharp, Multer
- **ORM**: Sequelize

## 📱 Frontend 연동

이 백엔드는 다음 프론트엔드와 연동됩니다:
- Repository: https://github.com/awsfinal/finalfront.git
- Default Port: 3000
- API Base URL: http://localhost:5006

## 🔍 Health Check

```bash
curl http://localhost:5006/api/health
```

## 📝 변경사항

### v1.1.0 (Latest)
- ✅ Weather API 추가 (`/api/weather`)
- ✅ Frontend 통합 지원
- ✅ 모든 필수 엔드포인트 구현

### v1.0.0
- 🎯 기본 API 구조 구현
- 🏛️ 건물 인식 및 AI 설명 기능
- 💬 커뮤니티 기능
- 🗺️ 관광지 정보 API
