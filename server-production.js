require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const BedrockService = require('./services/bedrockService');

const app = express();
const PORT = process.env.PORT || 5006;

// BedrockService 인스턴스 생성
const bedrockService = new BedrockService();

// CORS 설정 (jjikgeo.com 도메인용)
const allowedOrigins = [
  'https://jjikgeo.com',
  'https://www.jjikgeo.com'
];

// 개발 환경에서는 localhost도 허용
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

app.use(cors({
  origin: function (origin, callback) {
    // origin이 없는 경우 (모바일 앱 등) 또는 허용된 도메인인 경우
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS 차단된 도메인: ${origin}`);
      callback(new Error('CORS 정책에 의해 차단됨'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 보안 헤더 설정
app.use((req, res, next) => {
  // 프로덕션 환경에서만 HTTPS 강제
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('Content-Security-Policy', 
      "default-src 'self' https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://dapi.kakao.com https://accounts.google.com; " +
      "style-src 'self' 'unsafe-inline' https:; " +
      "img-src 'self' data: https: http://tong.visitkorea.or.kr; " +
      "connect-src 'self' https: https://apis.data.go.kr; " +
      "font-src 'self' data: https:; " +
      "frame-src 'self' https://accounts.google.com;"
    );
  } else {
    // 개발 환경에서는 HTTP도 허용
    res.header('Content-Security-Policy', 
      "default-src 'self' http: https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; " +
      "style-src 'self' 'unsafe-inline' http: https:; " +
      "img-src 'self' data: http: https:; " +
      "connect-src 'self' http: https:; " +
      "font-src 'self' data: http: https:; " +
      "frame-src 'self' http: https:;"
    );
  }
  
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN'); // DENY에서 SAMEORIGIN으로 변경 (Google 로그인용)
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 요청 로깅 (프로덕션에서)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - ${req.ip}`);
    next();
  });
}

// 나머지 코드는 기존 server.js와 동일...
// (여기서는 예시로 몇 개만 포함)

// 기본 테스트 엔드포인트
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'jjikgeo.com 서버가 정상적으로 작동 중입니다.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('❌ 서버 오류:', err);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  } else {
    res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack
    });
  }
});

// 404 핸들링
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`
  });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 jjikgeo.com 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 시작 시간: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM 신호 수신, 서버 종료 중...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT 신호 수신, 서버 종료 중...');
  process.exit(0);
});
