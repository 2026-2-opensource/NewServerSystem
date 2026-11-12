const { ChatRoom, ChatMessage, SharingPost, Member, Notification, Review } = require('../models');

const chatController = {
    startChat: async (req, res) => {
        try {
            const buyerId = req.user.memberId;
            const sharingId = parseInt(req.body.sharingId, 10);
            const sellerId = req.body.sellerId;

            if (!sharingId || !sellerId) throw new Error("게시글 ID 또는 판매자 ID 정보가 누락되었습니다.");

            if (buyerId === sellerId) {
                req.flash('error', '자신의 게시글에는 채팅을 걸 수 없습니다.');
                return res.redirect(`/sharing/${sharingId}`);
            }

            const post = await SharingPost.findByPk(sharingId);
            if (!post) throw new Error("존재하지 않거나 삭제된 게시글입니다.");

            let room = await ChatRoom.findOne({ where: { sharingId, buyerId, sellerId } });

            if (!room) {
                room = await ChatRoom.create({ sharingId, sellerId, buyerId });
            } else if (room.buyerLeft) {
                await room.update({ buyerLeft: false });
            }

            res.redirect(`/chat/room/${room.roomId}`);
        } catch (err) {
            console.error('startChat DB 생성 치명적 에러:', err);
            res.status(500).send(`
                <h2>채팅방 생성 실패</h2>
                <p>에러 원인: ${err.message}</p>
                <a href="/sharing">목록으로 돌아가기</a>
            `);
        }
    },

    getRoom: async (req, res) => {
        try {
            const roomId = req.params.id;
            const currentUserId = req.user.memberId;

            const room = await ChatRoom.findOne({
                where: { roomId },
                include: [
                    { model: SharingPost, as: 'sharingPost' },
                    { model: Member, as: 'seller', attributes: ['memberId', 'memberName'] },
                    { model: Member, as: 'buyer', attributes: ['memberId', 'memberName'] }
                ]
            });

            if (!room) return res.redirect('/sharing');

            const isSeller = room.sellerId === currentUserId;
            const iLeft = isSeller ? room.sellerLeft : room.buyerLeft;
            const isOtherLeft = isSeller ? room.buyerLeft : room.sellerLeft;

            if (iLeft) {
                req.flash('error', '이미 나간 채팅방입니다.');
                return res.redirect(`/sharing/${room.sharingId}`);
            }

            const partnerId = isSeller ? room.buyerId : room.sellerId;
            const partnerName = isSeller ? (room.buyer ? room.buyer.memberName : '알 수 없음') : (room.seller ? room.seller.memberName : '알 수 없음');
            
            const completedSharesCount = await SharingPost.count({
                where: {
                    memberId: partnerId,
                    sharingStatus: true
                }
            });

            const reviews = await Review.findAll({ where: { revieweeId: partnerId } });
            let calculatedAvg = 0.0;
            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, cur) => acc + parseFloat(cur.rating), 0);
                calculatedAvg = (sum / reviews.length).toFixed(1);
            }
            
            const partnerStats = { 
                partnerId, 
                partnerName: partnerName, 
                avgRating: calculatedAvg,
                completedShares: completedSharesCount
            }

            const messages = await ChatMessage.findAll({
                where: { roomId },
                include: [{ model: Member, as: 'sender', attributes: ['memberName'] }],
                order: [['createdAt', 'ASC']]
            });

            const isReserved = room.sharingPost && room.sharingPost.postTitle.startsWith('[예약중]');

            res.render('chat/room', {
                layout: false, 
                room, messages, isOtherLeft, isReserved, partnerStats, currentUser: req.user
            });
        } catch (err) {
            console.error('getRoom 에러:', err);
            res.redirect('/sharing');
        }
    },

    leaveRoom: async (req, res) => {
        try {
            const roomId = req.params.id;
            const currentUserId = req.user.memberId;

            const room = await ChatRoom.findOne({ where: { roomId } });
            if (!room) return res.redirect('/sharing');

            const isSeller = room.sellerId === currentUserId;
            if (isSeller) room.sellerLeft = true;
            else room.buyerLeft = true;

            await room.save();

            if (room.sellerLeft && room.buyerLeft) {
                await room.destroy();
            } else {
                const io = req.app.get('io');
                if (io) {
                    await ChatMessage.create({
                        roomId, senderId: null, content: '대화 상대가 채팅방을 나갔습니다.', isSystem: true
                    });
                    io.to(roomId).emit('userLeft');
                }
            }
            res.redirect('/sharing');
        } catch (err) {
            console.error('leaveRoom 에러:', err);
            res.redirect('/sharing');
        }
    }
};

module.exports = chatController;