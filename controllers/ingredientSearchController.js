const axios = require('axios');
const { Ingredient } = require('../models');
//const { Op } = require('sequelize');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 카테고리별 기본 유통기한 (Groq도 실패했을 때 최후 기본값)
const CATEGORY_DEFAULT = {
  '육류': { expiryDays:3, storage:'냉장실' },
  '수산물': { expiryDays:2, storage:'냉동실' },
  '채소': { expiryDays:7, storage:'냉장실' },
  '과일': { expiryDays:7, storage:'냉장실' },
  '유제품': { expiryDays:7, storage:'냉장실' },
  '달걀': { expiryDays:21, storage:'냉장실' },
  '가공식품': { expiryDays:30, storage:'실온' },
  '조미료': { expiryDays:365, storage:'실온' },
  '냉동식품': { expiryDays:90, storage:'냉동실' },
  '기타': { expiryDays:7, storage:'냉장실' },
};

function parseWeightKg(quantity) {
  if (!quantity) return 0.3;
  const q = quantity.toLowerCase();
  const num = parseFloat(q.match(/[\d.]+/)?.[0] || 1);
  if (q.includes('kg')) return num;
  if (q.includes('g')) return num / 1000;
  if (q.includes('l') || q.includes('리터')) return num * 0.97;
  if (q.includes('ml')) return num / 1000;
  return num * 0.2;
}

function normalizeName(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[^\uAC00-\uD7A3a-z0-9]/g, '');
}
function refineIngredientName(name) {
  const normalized = normalizeName(name);

  // 1순위: 가공식품/예외 먼저
  const exceptions = [
    { keywords: ['초코우유'], refined: '우유' },
    { keywords: ['콜라', '사이다', '탄산음료'], refined: '가공식품' },
    { keywords: ['초코', '초콜릿', '초코바', '초코과자'], refined: '과자' },
    { keywords: ['감자칩', '포카칩', '프링글스', '스윙칩'], refined: '과자' },
    { keywords: ['마파두부', '마파 두부'], refined: '마파두부' },
  ];

  for (const rule of exceptions) {
    if (rule.keywords.some(keyword => normalized.includes(normalizeName(keyword)))) {
      return rule.refined;
    }
  }

  // 2순위: 대표 식재료명으로 정제
  const rules = [
    { keywords: ['돼지주물럭', '돼지 주물럭', '돼지고기주물럭', '돼지고기 주물럭', '제육', '돼지'], refined: '돼지' },
    { keywords: ['소고기', '쇠고기', '불고기'], refined: '소고기' },
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

  // 흙당근 -> 당근, 국산콩두부 -> 두부
  if (input.includes(dbName)) {
    return 80 + Math.min(dbName.length, 20);
  }

  // 콜라 -> 콜라비 같은 오탐 방지
  // DB명 안에 입력값이 들어가는 경우는 육류 접두어만 허용
  const prefixAllowed = ['돼지', '소고기', '쇠고기', '닭', '오리'];

  if (dbName.includes(input) && prefixAllowed.includes(input)) {
    return 60 + Math.min(input.length, 20);
  }

  // 돼지주물럭 -> 돼지갈비/돼지목살 같은 접두어 유사 매칭
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
async function callGroq(name) {
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      messages: [{
        role: 'user',
        content: `반드시 아래 JSON 형식 하나만 출력하세요. JSON 앞뒤에 설명, 문장, 마크다운을 절대 붙이지 마세요.
        식재료 "${name}"의 냉장보관 기준 유통기한 정보를 JSON으로 답하세요.
        참고: 게맛살=30일, 두부=3일, 삼겹살=3일, 우유=7일, 달걀=21일, 라면=180일, 케첩=365일, 냉동만두=90일
        주의: 유자차/녹차/홍차/커피/주스/식혜/수정과 등 음료류는 → 가공식품
        {"category":"채소/육류/과일/유제품/달걀/수산물/가공식품/조미료/냉동식품/기타 중 하나","expiryDays":숫자만,"storageMethod":"냉장실/냉동실/실온 중 하나"}`
      }],
      temperature: 0.1,
      max_tokens: 150,
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    }
  );

  const text = res.data.choices[0].message.content.trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('JSON 파싱 실패');
  }

  const jsonText = text.slice(start, end + 1);

  return JSON.parse(jsonText);
}

const ingredientSearchController = {
  analyze: async (req, res) => {
    try {
      const { name, quantity } = req.body;
      if (!name) return res.json({ success: false });

      //  1단계: 이름 정제 후 DB에서 먼저 검색
      const refinedName = refineIngredientName(name);
      const dbResult = await findIngredientFromDB(refinedName);

      if (dbResult) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + dbResult.recommendedExpiry);
      

        return res.json({
          success: true,
          category: dbResult.categoryInfo,
          expiryDays: dbResult.recommendedExpiry,
          expiryDate: expiryDate.toISOString().split('T')[0],
          storageMethod: dbResult.storageMethod,
          weightKg: parseWeightKg(quantity) || dbResult.defaultWeight,
          tip: 'ai가 제공하는 권장소비기한입니다. 정확한 관리를 위해 직접 입력을 권장해요.',
          source: 'db',
        });
      }

      // 2단계: DB에 없으면 Groq AI 호출
      let groqResult = null;
      try {
          groqResult = await callGroq(refinedName);
      } catch(e) {
        console.error('Groq 오류:', e.message);
      }

      // 3단계: Groq도 실패하면 카테고리 기본값
      const rawCategory = groqResult?.category;
      const category = CATEGORY_DEFAULT[rawCategory] ? rawCategory : '기타';
      const fallback = CATEGORY_DEFAULT[category];
      const expiryDays = parseInt(groqResult?.expiryDays) || fallback.expiryDays;
      const storageMethod = groqResult?.storageMethod || fallback.storage;
      const tip = 'ai가 제공하는 권장소비기한입니다. 정확한 관리를 위해 직접 입력을 권장해요.';

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      res.json({
        success: true,
        category,
        expiryDays,
        expiryDate: expiryDate.toISOString().split('T')[0],
        storageMethod,
        weightKg: parseWeightKg(quantity),
        tip,
        source: groqResult ? 'ai' : 'default',
      });

    } catch (err) {
      console.error(err);
      res.json({ success: false });
    }
  },
};

module.exports = ingredientSearchController;
