const { OwnedIngredient, Fridge, Ingredient } = require('../models');
const { Op } = require('sequelize');

const vision = require('@google-cloud/vision');
const fs = require('fs');
const GoogleGenAI = require('@google/genai').GoogleGenAI;

const client = new vision.ImageAnnotatorClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function normalizeName(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[^\uAC00-\uD7A3a-z0-9]/g, '');
}

function refineIngredientName(name) {
  const normalized = normalizeName(name);

  const exceptions = [
    { keywords: ['초코우유'], refined: '우유' },
    { keywords: ['콜라', '코카콜라', '펩시', '사이다', '칠성사이다', '스프라이트', '환타', '탄산음료'], refined: '가공식품' },
    { keywords: ['감자칩', '포카칩', '프링글스', '스윙칩'], refined: '과자' },
    { keywords: ['초코', '초콜릿', '초코바', '초코과자'], refined: '과자' },
    { keywords: ['마파두부', '마파 두부'], refined: '마파두부' },
  ];

  for (const rule of exceptions) {
    if (rule.keywords.some(keyword => normalized.includes(normalizeName(keyword)))) {
      return rule.refined;
    }
  }

  const rules = [
    { keywords: ['돼지주물럭', '돼지 주물럭', '돼지고기주물럭', '돼지고기 주물럭', '제육', '돼지'], refined: '돼지' },
    { keywords: ['소고기', '쇠고기', '불고기'], refined: '소고기' },
    { keywords: ['닭가슴살', '닭다리', '닭날개', '닭고기', '닭'], refined: '닭' },
    { keywords: ['흙당근', '당근'], refined: '당근' },
    { keywords: ['햇감자', '수미감자', '알감자', '감자'], refined: '감자' },
    { keywords: ['국산콩두부', '찌개용두부', '부침용두부', '순두부', '두부'], refined: '두부' },
    { keywords: ['우유'], refined: '우유' },
    { keywords: ['계란', '달걀'], refined: '달걀' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(keyword => normalized.includes(normalizeName(keyword)))) {
      return rule.refined;
    }
  }

  return name;
}

function getMatchScore(input, dbName) {
  if (!input || !dbName) return 0;

  if (input === dbName) return 100;

  if (input.includes(dbName)) {
    return 80 + Math.min(dbName.length, 20);
  }

  const prefixAllowed = ['돼지', '소고기', '쇠고기', '닭', '오리'];

  if (dbName.includes(input) && prefixAllowed.includes(input)) {
    return 60 + Math.min(input.length, 20);
  }

  let commonPrefix = 0;
  const minLength = Math.min(input.length, dbName.length);

  for (let i = 0; i < minLength; i++) {
    if (input[i] === dbName[i]) commonPrefix++;
    else break;
  }

  if (commonPrefix >= 2) {
    return 40 + commonPrefix * 5;
  }

  return 0;
}

async function findIngredientFromDB(name) {
  const normalizedInput = normalizeName(name);

  if (!normalizedInput) return null;

  const ingredients = await Ingredient.findAll({ raw: true });

  const candidates = ingredients
    .map(item => {
      const normalizedIngredientName = normalizeName(item.ingredientName);
      const matchScore = getMatchScore(normalizedInput, normalizedIngredientName);

      return {
        ...item,
        normalizedIngredientName,
        matchScore,
      };
    })
    .filter(item => item.matchScore >= 50)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }

      return b.normalizedIngredientName.length - a.normalizedIngredientName.length;
    });

  return candidates[0] || null;
}

async function cleanOcrTextWithAI(rawOcrText) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const prompt = `
      당신은 영수증 OCR 텍스트에서 결제/구매 일자를 찾아내고, 불필요한 브랜드명, 수식어, 노이즈를 제거하여 실제 요리에 사용되는 '순수 식재료명'과 '수량', '가격'을 추출하는 전문가입니다.
      
      [지시사항]
      1. 입력된 텍스트 전체를 분석하여 영수증에 기록된 거래/구매/결제 일시를 찾아 "YYYY-MM-DD" 형식으로 추출하세요. 만약 날짜를 전혀 찾을 수 없거나 모호하다면 기본값으로 오늘 날짜인 "${todayStr}"을 사용하세요.
      2. 입력된 텍스트에서 매장 정보, 포스기 명령어, 금액, 날짜, 주소 등 식재료가 아닌 것은 무조건 제외하세요.
      3. 상품명에 포함된 수식어(예: 브랜드명, 등급, 제조사, 패키지 특징 등)를 과감히 제거하고, 핵심이 되는 '순수 식재료명'만 남기세요.
        - 예시: "1등급 서울우유 1L" -> "우유"
        - 예시: "국산콩 단단한 두부 300g" -> "두부"
        - 예시: "친환경 무농약 양파즙" -> "양파즙" (또는 양파)
        - 예시: "씨없는 청포도" -> "청포도"
      4. 해당 상품의 영수증 상 '수량'을 함께 매칭하세요. 만약 찾을 수 없다면 기본값인 "1개"로 설정하세요.
      5. 수량은 숫자가 아니라 반드시 "1개", "2개", "3봉", "1팩" 등과 같이 단위(개, 봉, 팩 등)를 붙인 문자열로 만드세요.
      6. 가격(price)은 '원'이나 콤마(,)를 제외하고 순수한 숫자(정수) 형태로만 추출하세요. (예: 3,500원 -> 3500) 만약 가격을 알 수 없다면 0으로 설정하세요.

      [출력 형식 예시]
      {
        "purchaseDate": "2026-05-24",
        "items": [
          {"name": "우유", "quantity": "2개", "price": 5400},
          {"name": "두부", "quantity": "1개", "price": 1800}
        ]
      }

      [입력된 OCR 텍스트]
      ${rawOcrText}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            purchaseDate: { type: 'STRING', description: '영수증에서 추출한 구매일자 (YYYY-MM-DD)' },
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING', description: '순수 식재료명' },
                  quantity: { type: 'STRING', description: '단위가 포함된 수량 (예: 1개, 2봉)' },
                  price: { type: 'INTEGER', description: '식재료의 가격 (숫자만 반환, 모르면 0)' }
                },
                required: ['name', 'quantity']
              }
            }
          },
          required: ['purchaseDate', 'items']
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText); 

  } catch (error) {
    console.error("Gemini 정제 중 에러 발생:", error);
    return { purchaseDate: new Date().toISOString().split('T')[0], items: [] }; 
  }
}

const fridgeController = {
  getIndex: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const today = new Date();
      today.setHours(0,0,0,0);
      const filter = req.query.filter || 'all';

      // 💡 관계 모델을 연동하기 위해 상단 혹은 메서드 내부에서 SharingPost 모델을 가져옵니다.
      const { SharingPost } = require('../models'); 
      
      // 1. 상단 탭 개수(Counts) 구하기
      const tToday = new Date(today); tToday.setDate(today.getDate() + 1);
      const t3days = new Date(today); t3days.setDate(today.getDate() + 3);
      const t7days = new Date(today); t7days.setDate(today.getDate() + 7);

      const counts = {
        // 💡 [수정] 전체 개수에는 나눔 중이 아닌(isSharing: false) 순수 보관 식재료만 카운트합니다.
        all: await OwnedIngredient.count({ where: { memberId, isSharing: false } }),
        today: await OwnedIngredient.count({ where: { memberId, isSharing: false, expiryDate: { [Op.lt]: tToday } } }),
        days3: await OwnedIngredient.count({ where: { memberId, isSharing: false, expiryDate: { [Op.lte]: t3days } } }),
        safe: await OwnedIngredient.count({ where: { memberId, isSharing: false, expiryDate: { [Op.gt]: t7days } } }),
        // 현재 사용자의 아이템 중 나눔중(isSharing: true)인 개수 통계 구하기
        sharing: await OwnedIngredient.count({ where: { memberId, isSharing: true } })
      };

      // 일주일 이내(4~7일 남은 것) 개수 계산을 위한 메모리 필터링
      // 💡 [수정] 여기서도 나눔 중인 것은 카운트에서 제외합니다.
      const allItemsForWeek = await OwnedIngredient.findAll({ where: { memberId, isSharing: false }, raw: true });
      counts.week = allItemsForWeek.filter(i => {
        const diff = Math.ceil((new Date(i.expiryDate) - today) / (1000*60*60*24));
        return diff >= 4 && diff <= 7;
      }).length;


      // 2. 현재 선택된 필터에 따라 데이터베이스(DB) 조회 조건 분기 처리
      let whereClause = { memberId };

      if (filter === 'sharing') {
        // 💡 '나눔중' 탭을 눌렀을 때만 오직 나눔중인 식재료(isSharing: true)를 보여줍니다.
        whereClause.isSharing = true;
      } else {
        // 💡 [핵심] 'all'(전체), 'today', '3days', 'safe' 탭 등에서는 나눔중인 식재료가 노출되지 않도록 차단합니다.
        whereClause.isSharing = false;

        // 기존 유통기한 필터 조건 매핑
        if (filter === 'today') {
          whereClause.expiryDate = { [Op.lt]: tToday };
        } else if (filter === '3days') {
          whereClause.expiryDate = { [Op.lte]: t3days };
        } else if (filter === 'safe') {
          whereClause.expiryDate = { [Op.gt]: t7days };
        }
      }

      // 3. 조건에 맞는 식재료 리스트 조회 (나눔 게시글의 수량을 가져오기 위해 SharingPost 조인)
      const ownedIngredients = await OwnedIngredient.findAll({
        where: whereClause,
        include: [
          { model: Fridge, as: 'fridge' },
          { model: SharingPost, as: 'sharingPosts' } // 🔥 나눔 게시글 관계 매칭
        ],
        order: [['expiryDate', 'ASC'], ['ingredientName', 'ASC']],
      });

      // 4. 디데이 상태 계산 및 나눔 수량 예외 처리 테스크 함수
      const calcStatus = (item) => {
        // 유통기한 날짜 객체 생성 및 시간 초기화
        const expDate = new Date(item.expiryDate);
        expDate.setHours(0, 0, 0, 0);

        const diff = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));

        let status = 'safe';
        if (diff < 0) status = 'expired';
        else if (diff === 0) status = 'today';
        else if (diff <= 3) status = 'urgent';
        else if (diff <= 7) status = 'soon';

        const itemJson = item.toJSON();

        // 🔥 [핵심] 나눔중 필터일 경우, 냉장고 보유 수량 대신 SharingPost의 registeredQuantity로 덮어쓰기
        if (filter === 'sharing' && itemJson.sharingPosts && itemJson.sharingPosts.length > 0) {
          // 아직 완료되지 않은 나눔글(sharingStatus === false)만 걸러내기
          const activePosts = itemJson.sharingPosts.filter(post => post.sharingStatus === false);
          
          if (activePosts.length > 0) {
            // 가장 최근에 등록한 유효 나눔 게시글 정보 획득
            const latestActivePost = activePosts[activePosts.length - 1];
            itemJson.quantity = latestActivePost.registeredQuantity; // '2개' 등 나눔글 수량으로 변경
          }
        }

        return { ...itemJson, daysLeft: diff, status };
      };

      let items = ownedIngredients.map(calcStatus);

      // 예외적인 클라이언트 사이드 필터링인 '일주일 이내' 조건 처리
      if (filter === 'week') {
        const allIngredients = await OwnedIngredient.findAll({
          where: { memberId },
          include: [
            { model: Fridge, as: 'fridge' },
            { model: SharingPost, as: 'sharingPosts' }
          ],
          order: [['expiryDate', 'ASC'], ['ingredientName', 'ASC']],
        });
        items = allIngredients.map(calcStatus).filter(i => i.daysLeft >= 4 && i.daysLeft <= 7);
      }

      const fridges = await Fridge.findAll({ where: { memberId } });

      // 5. 템플릿(EJS)으로 가공 완료된 데이터 전달
      res.render('fridge/index', {
        title: '내 냉장고', 
        layout: 'layouts/main',
        items, 
        fridges, 
        filter, 
        counts,
      });
    } catch (err) {
      console.error(err);
      req.flash('error', '냉장고 정보를 불러오는 중 오류가 발생했습니다.');
      res.redirect('/dashboard');
    }
  },

  addIngredient: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { ingredientName, categoryInfo, storageMethod, expiryDate, quantity, amount, fridgeId } = req.body;

      if (!ingredientName || !ingredientName.trim()) {
        req.flash('error', '식재료 이름을 정확히 입력해주세요.');
        return res.redirect('/fridge');
      }

      let fridge = await Fridge.findOne({ where: { fridgeId, memberId } });
      if (!fridge) {
        fridge = await Fridge.findOne({ where: { memberId } });
        if (!fridge) fridge = await Fridge.create({ fridgeName: '기본 냉장고', memberId });
      }

      let finalExpiry = expiryDate;
      if (!finalExpiry) {
        const next7 = new Date();
        next7.setDate(next7.getDate() + 7);
        finalExpiry = next7.toISOString().split('T')[0];
      }

      await OwnedIngredient.create({
        memberId,
        fridgeId: fridge.fridgeId,
        ingredientId: null,
        ingredientName: ingredientName.trim(),
        categoryInfo: categoryInfo || '기타',
        storageMethod: storageMethod || '냉장실',
        expiryDate: finalExpiry,
        quantity: (quantity && quantity.trim()) ? quantity : '1개',
        amount: amount ? parseInt(amount) : 0,
        memo: '',
        purchaseDate: new Date(),
      });

      req.flash('success', '식재료가 등록되었습니다!');
      res.redirect('/fridge');
    } catch (err) {
      console.error(err);
      req.flash('error', '식재료 등록 중 오류가 발생했습니다.');
      res.redirect('/fridge');
    }
  },

  editIngredient: async (req, res) => {
  try {
    const memberId = req.user.memberId;
    const { id } = req.params;

    const {
      ingredientName,
      expiryDate,
      quantity,
      storageMethod,
      memo,
      categoryInfo,
      amount
    } = req.body;

    const item = await OwnedIngredient.findOne({
      where: { ownedIngredientId: id, memberId }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '식재료를 찾을 수 없습니다.'
      });
    }

    await item.update({
      ingredientName,
      expiryDate,
      quantity: quantity || '1개',
      storageMethod,
      categoryInfo,
      amount: amount ? parseInt(amount) : 0,
      memo
    });

    return res.json({
      success: true,
      message: '수정 완료'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: '수정 실패'
    });
  }
},

deleteExpiredIngredients: async (req, res) => {
  try {
    const memberId = req.user.memberId;

    const today = new Date();
    today.setHours(0,0,0,0);

    const result = await OwnedIngredient.destroy({
      where: {
        memberId,
        expiryDate: {
          [require('sequelize').Op.lte]: today
        }
      }
    });

    // ✅ 핵심 분기
    if (result === 0) {
      return res.json({
        success: true,
        message: '만료된 식재료가 없습니다.',
        deletedCount: 0
      });
    }

    return res.json({
      success: true,
      message: `${result}개의 만료된 식재료가 삭제되었습니다.`,
      deletedCount: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: '서버 오류'
    });
  }
},
deleteMultipleIngredients: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      let { ids } = req.body;

      // 💡 [핵심 보완] 폐기 버튼을 눌러 URL에 id가 단건으로 들어온 경우, 배열로 포장해줍니다.
      if (!ids && req.params.id) {
        ids = [req.params.id];
      }

      if (!ids || ids.length === 0) {
        return res.json({ success: false, message: '삭제할 항목 없음' });
      }

      await OwnedIngredient.destroy({
        where: {
          memberId,
          ownedIngredientId: ids
        }
      });

      return res.json({
        success: true,
        message: `${ids.length}개 삭제 완료`
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  },

  processReceiptOCR: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '업로드된 파일이 없습니다.' });
      }

      const [result] = await client.textDetection(req.file.path);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.json({ success: false, message: '영수증에서 글자를 인식하지 못했습니다.' });
      }

      const fullText = detections[0].description;
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      const aiResponse = await cleanOcrTextWithAI(fullText);
      const extractedPurchaseDate = aiResponse.purchaseDate;
      const aiItems = aiResponse.items || [];

      const parsedIngredients = await Promise.all(
        aiItems.map(async (item) => {
          const cleanName = item.name;
          const refinedName = refineIngredientName(cleanName);
          const aiQuantity = item.quantity || '1개'; 
          const aiPrice = parseInt(item.price) || 0;

          const ingredientInfo = await findIngredientFromDB(refinedName);


          const baseDate = new Date(extractedPurchaseDate + 'T00:00:00');
          const expiryDays = (ingredientInfo && ingredientInfo.recommendedExpiry) ? ingredientInfo.recommendedExpiry : 7;
          baseDate.setDate(baseDate.getDate() + expiryDays);
          
          const formattedDate = baseDate.toISOString().split('T')[0];

          return {
            ingredientName: ingredientInfo ? ingredientInfo.ingredientName : refinedName,
            ingredientId: ingredientInfo ? ingredientInfo.ingredientId : null,
            categoryInfo: ingredientInfo ? ingredientInfo.categoryInfo : '기타',
            storageMethod: ingredientInfo ? ingredientInfo.storageMethod : '냉장실',
            expiryDate: formattedDate,
            quantity: aiQuantity,
            price: aiPrice,
            purchaseDate: extractedPurchaseDate
          };
        })
      );

      return res.json({ 
        success: true, 
        message: '영수증 분석 성공', 
        parsedIngredients, 
        rawText: fullText 
      });

    } catch (error) {
      console.error('OCR Controller 에러:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: '서버 내부 OCR 처리 중 에러가 발생했습니다.' });
    }
  },

  addIngredientsFromOCR: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { ingredients } = req.body;

      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ success: false, message: '등록할 식재료 데이터가 없습니다.' });
      }

      let fridge = await Fridge.findOne({ where: { memberId } });
      if (!fridge) {
        fridge = await Fridge.create({ fridgeName: '기본 냉장고', memberId });
      }
      
      const dbExcludeKeywords = ['주문자', '고객수', '금액', '합계', '결제', '원', '카드', '메뉴', '계', '부가세'];
      const pureNumberPattern = /^[0-9,.\s\-+:/]+$/;

      const insertData = ingredients
        .filter(item => {
          const cleanName = (item.ingredientName || '').trim();
          if (!cleanName || cleanName.length <= 1) return false;
          if (pureNumberPattern.test(cleanName)) return false;
          if (dbExcludeKeywords.some(keyword => cleanName.includes(keyword))) return false;
          return true;
        })
        .map(item => {
          const rawExpiry = item.expiryDate ? item.expiryDate.split('T')[0] : '';
          const rawPurchase = item.purchaseDate ? item.purchaseDate.split('T')[0] : '';

          return {
            memberId,
            fridgeId: fridge.fridgeId,
            ingredientId: item.ingredientId || null,
            ingredientName: item.ingredientName.trim(),
            categoryInfo: item.categoryInfo || '기타',
            storageMethod: item.storageMethod || '냉장실', 
            expiryDate: rawExpiry ? new Date(rawExpiry + 'T00:00:00') : new Date(Date.now() + 7*24*60*60*1000), 
            quantity: item.quantity || '1개',
            amount: parseInt(item.price) || 0,
            memo: '영수증 OCR 등록',
            purchaseDate: rawPurchase ? new Date(rawPurchase + 'T00:00:00') : new Date(),
          };
        });

      if (insertData.length === 0) {
        return res.status(400).json({ success: false, message: '유효한 식재료명이 없어 등록이 취소되었습니다.' });
      }

      await OwnedIngredient.bulkCreate(insertData);

      return res.json({ success: true, message: `${insertData.length}개의 식재료가 냉장고에 등록되었습니다.` });
    } catch (err) {
      console.error('OCR 최종 등록 에러:', err);
      return res.status(500).json({ success: false, message: '식재료 일괄 등록 중 서버 에러가 발생했습니다.' });
    }
  },
  // 냉장고 직접 소비 처리 및 3일 이내 통계 반영 로직
  consumeIngredient: async (req, res) => {
    try {
      const { id } = req.params;
      const { usedAmount } = req.body;
      const memberId = req.user.memberId;

      const item = await OwnedIngredient.findOne({ where: { ownedIngredientId: id, memberId } });
      if (!item) return res.json({ success: false, message: '식재료를 찾을 수 없습니다.' });

      const qtyStr = String(item.quantity || '');
      const numMatch = qtyStr.match(/^[\d.]+/);
      const unitStr = qtyStr.replace(/^[\d.]+/, '').trim();
      
      const currentNum = numMatch ? parseFloat(numMatch[0]) : 1;
      const consumeNum = parseFloat(usedAmount);

      if (consumeNum >= currentNum) {
        // 전부 소비했을 때만 통계에 반영
        const today = new Date(); today.setHours(0,0,0,0);
        const exp = new Date(item.expiryDate); exp.setHours(0,0,0,0);
        const diffDays = Math.ceil((exp - today) / (1000*60*60*24));

        // 유통기한이 0~3일 남은 임박 식재료를 버리지 않고 먹었을 때만 절약/탄소 누적
        if (diffDays >= 0 && diffDays <= 3) {
          const { Member } = require('../models');
          const member = await Member.findByPk(memberId);
          
          // 탄소 절감량 계산 (예: 1kg당 2.0kg 감소 로직)
          const weightKg = (['g'].includes(unitStr.toLowerCase())) ? currentNum / 1000 : (['l', 'kg'].includes(unitStr.toLowerCase()) ? currentNum : 0.3);
          const carbon = Math.round(weightKg * 2.0 * 100) / 100; 
          
          await member.update({
            cumulativeSavings: (parseInt(member.cumulativeSavings) || 0) + (parseInt(item.amount) || 0),
            cumulativeCarbonReduction: (parseFloat(member.cumulativeCarbonReduction) || 0) + carbon
          });
        }
        // DB에서 식재료 완전 삭제
        await item.destroy();
      } else {
        // 부분 소비의 경우 수량만 줄임
        const remaining = currentNum - consumeNum;
        await item.update({ quantity: `${remaining}${unitStr}` });
      }

      res.json({ success: true, message: '소비가 완료되었습니다!' });
    } catch (err) {
      console.error('소비 처리 에러:', err);
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  }
};

module.exports = fridgeController;