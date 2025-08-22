# Node.js 18 Alpine 이미지 사용 (경량화)
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치 (프로덕션 모드)
RUN npm install --only=production && npm cache clean --force

# 애플리케이션 코드 복사
COPY . .

# 불필요한 파일 제거
RUN rm -rf test* *.md .git* docker* node_modules/.cache

# 비root 사용자 생성 및 권한 설정
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

# 비root 사용자로 전환
USER nextjs

# 포트 노출
EXPOSE 5006

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# 애플리케이션 시작
CMD ["node", "server.js"]
