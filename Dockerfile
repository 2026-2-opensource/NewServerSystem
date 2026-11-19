# 가벼운 Node.js LTS Alpine 이미지 사용 (프로젝트 Node 버전에 맞춰 변경 가능, 예: 18-alpine 또는 20-alpine)
FROM node:20-alpine

# 컨테이너 내부 작업 디렉토리 설정
WORKDIR /usr/src/app

# 의존성 파일 먼저 복사 (레이어 캐싱 활용)
COPY package*.json ./

# 프로덕션 의존성 설치 (devDependencies 포함이 필요하면 npm install 사용)
RUN npm install

# 전체 소스 코드 복사
COPY . .

# 영수증 업로드 폴더 생성 (로컬 uploads 폴더가 비어 있어 Git에 안 올라갔을 경우 대비)
RUN mkdir -p uploads

# 포레시 서버 실행 포트 노출 (app.js / bin/www 등에서 사용하는 포트 번호로 수정)
EXPOSE 3000

# 환경변수 기본값 설정
ENV NODE_ENV=production

# 서버 실행 명령어 (package.json의 scripts.start 확인 필요)
CMD ["npm", "start"]