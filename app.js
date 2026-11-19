require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

// 실시간 채팅 & 알림을 위한 http, socket.io 모듈
const http = require('http');
const socketIo = require('socket.io');


const app = express();

// Kubernetes Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK'
    });
});

// Express 앱을 Http 서버로 감싸기
const server = http.createServer(app);

const io = socketIo(server);
app.set('io', io);

const cron = require('node-cron');
const PORT = process.env.PORT || 80;

// 실시간 채팅용 라우터 불러오기
const chatRouter = require('./routes/chat');

// DB 연결 및 모델 불러오기
const { sequelize, ChatMessage, ChatRoom, Member, Notification, SharingPost } = require('./models');

io.on('connection', (socket) => {
    //console.log('소켓 클라이언트 연결됨:', socket.id);
    
    // 1. 글로벌 알림용 룸 입장
    socket.on('joinUserRoom', (memberId) => {
        if (memberId) {
            socket.join(`user_${memberId}`);
        }
    });

    // 2. 특정 채팅방 입장
    socket.on('joinRoom', (roomId) => {
        if (roomId) {
            socket.join(roomId);
        }
    });

    // 3. 메시지 발송 처리 및 알림 생성
    socket.on('sendMessage', async (data) => {
        try {
            const { roomId, senderId, content } = data;

            // 메시지 DB 저장
            const message = await ChatMessage.create({ roomId, senderId, content });
            const sender = await Member.findByPk(senderId, { attributes: ['memberName'] });

            const msgData = {
                ...message.toJSON(),
                senderName: sender ? sender.memberName : '알 수 없음'
            };

            // 방에 접속 중인 사람에게 실시간 전송
            io.to(roomId).emit('newMessage', msgData);

            // 방에 없는 상대방에게 알림 발송
            const room = await ChatRoom.findByPk(roomId, {
              include: [
              { model: SharingPost, as: 'sharingPost' }
              ]
            });
            if (room) {
                const receiverId = room.sellerId === senderId ? room.buyerId : room.sellerId;
                
                // 상대방이 현재 이 채팅방 화면을 보고 있는지 확인
                const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
                
                // 방에 혼자 있거나(상대방이 나감), 접속 안 한 상태면 알림 발송
                if (!clientsInRoom || clientsInRoom.size < 2) {
                    if (typeof Notification !== 'undefined' && Notification) {
                        const existingNoti = await Notification.findOne({
                where: { 
                    memberId: receiverId, 
                    type: 'CHAT', 
                    link: `/chat/room/${roomId}`, 
                    isRead: false 
                }
            });
            
            // 안 읽은 알림이 없을 때만 새로 생성! (도배 억제)
            if (!existingNoti) {
                const postTitle = room.sharingPost ? room.sharingPost.postTitle : '나눔글';

                const noti = await Notification.create({
                    memberId: receiverId,
                    type: 'CHAT',
                    content: `💬 <b>[${postTitle}]</b> 게시글에서 <b>${sender ? sender.memberName : '상대방'}</b>님이 새 메시지를 보냈습니다.`,
                    link: `/chat/room/${roomId}`
                });
                io.to(`user_${receiverId}`).emit('newNotification', noti);
            } else {
                // 이미 알림이 있다면 DB 생성 없이 소켓으로 화면 배지(빨간 점) 갱신용 신호만 툭 쳐줍니다.
                io.to(`user_${receiverId}`).emit('refreshNotification');
            }
                    }
                }
            }
        } catch (error) {
            console.error('메시지 전송 에러:', error);
        }
    });

    socket.on('disconnect', () => {
        //console.log('소켓 연결 해제:', socket.id);
    });
});


// Passport 설정
require('./config/passport')();

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// express-ejs-layouts 설정
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// 세션
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dasiosup_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 1일
    },
  })
);

// Passport 미들웨어
app.use(passport.initialize());
app.use(passport.session());

// Flash 미들웨어
app.use(flash());

// 전역 변수 미들웨어
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// 라우터 연결
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/fridge', require('./routes/fridge'));
app.use('/sharing', require('./routes/sharing'));
app.use('/park', require('./routes/park'));
app.use('/activity', require('./routes/activity'));
app.use('/settings', require('./routes/settings'));
app.use('/notification', require('./routes/notification'));

// 채팅 라우터 연결
app.use('/chat', chatRouter);

// 404 핸들러
app.use((req, res) => {
  res.status(404).render('error/404', {
    title: '페이지를 찾을 수 없습니다',
    layout: 'layouts/auth',
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error/500', {
    title: '서버 오류',
    layout: 'layouts/auth',
    error: err.message,
  });
});

// DB 연결 후 서버 시작
sequelize
  .authenticate()
  .then(async() => {
    console.log('✅ DB 연결 성공');
    //return sequelize.sync({ alter: true });
  })
  .then(() => {
    //채팅을 위해 app.listen 대신 server.listen 사용
    server.listen(PORT, () => {
      console.log(`🌿 FORESHY 서버 및 실시간 소켓 실행 중: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB 연결 실패:', err);
  });

// 매월 1일 자정 리셋
cron.schedule('0 0 1 * *', async () => {
  try {
    const { Member, MonthlyStats } = require('./models');
    const members = await Member.findAll();
    const now = new Date();
    // 1일에 실행되므로 지난달 기록으로 저장
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    for (const member of members) {
      // 이번달 기록을 MonthlyStats에 저장
      await MonthlyStats.create({
        memberId: member.memberId,
        year,
        month,
        savings: member.cumulativeSavings || 0,
        carbonReduction: member.cumulativeCarbonReduction || 0,
      });
      
      //리셋
      await member.update({
        cumulativeSavings: 0,
        cumulativeCarbonReduction: 0,
      });
    }
    console.log('✅ 월별 통계 저장 및 리셋 완료');
  } catch (err) {
    console.error('❌ 크론잡 오류:', err);
  }
});

module.exports = app;