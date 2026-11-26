require('dotenv').config({ path: '../.env' });
const { sequelize, Ingredient, ParkItemTemplate, Inventory, Member, Park } = require('../models');

const ingredients = [
  { ingredientName: '우유', recommendedExpiry: 7, categoryInfo: '유제품', storageMethod: '냉장실' },
  { ingredientName: '달걀', recommendedExpiry: 21, categoryInfo: '달걀', storageMethod: '냉장실' },
  { ingredientName: '닭가슴살', recommendedExpiry: 3, categoryInfo: '육류', storageMethod: '냉장실' },
  { ingredientName: '돼지고기', recommendedExpiry: 3, categoryInfo: '육류', storageMethod: '냉장실' },
  { ingredientName: '소고기', recommendedExpiry: 3, categoryInfo: '육류', storageMethod: '냉장실' },
  { ingredientName: '브로콜리', recommendedExpiry: 5, categoryInfo: '채소', storageMethod: '냉장실' },
  { ingredientName: '당근', recommendedExpiry: 14, categoryInfo: '채소', storageMethod: '냉장실' },
  { ingredientName: '양파', recommendedExpiry: 30, categoryInfo: '채소', storageMethod: '실온' },
  { ingredientName: '감자', recommendedExpiry: 30, categoryInfo: '채소', storageMethod: '실온' },
  { ingredientName: '상추', recommendedExpiry: 5, categoryInfo: '채소', storageMethod: '냉장실' },
  { ingredientName: '두부', recommendedExpiry: 3, categoryInfo: '가공식품', storageMethod: '냉장실' },
  { ingredientName: '라면', recommendedExpiry: 180, categoryInfo: '가공식품', storageMethod: '실온' },
  { ingredientName: '사과', recommendedExpiry: 14, categoryInfo: '과일', storageMethod: '냉장실' },
  { ingredientName: '바나나', recommendedExpiry: 7, categoryInfo: '과일', storageMethod: '실온' },
  { ingredientName: '요거트', recommendedExpiry: 14, categoryInfo: '유제품', storageMethod: '냉장실' },
  { ingredientName: '파', recommendedExpiry: 7, categoryInfo: '채소', storageMethod: '냉장실' },
  { ingredientName: '마늘', recommendedExpiry: 30, categoryInfo: '채소', storageMethod: '냉장실' },
  { ingredientName: '김치', recommendedExpiry: 90, categoryInfo: '가공식품', storageMethod: '냉장실' },
  { ingredientName: '된장', recommendedExpiry: 365, categoryInfo: '조미료', storageMethod: '냉장실' },
  { ingredientName: '간장', recommendedExpiry: 730, categoryInfo: '조미료', storageMethod: '실온' },
];

const parkItems = [
  // 나무/식물
  { itemName:'벚꽃나무', itemCategory:'식물', itemEmoji:'🌸', itemImage:'tree_cherry', requiredPoints:80, rarity:'rare', width:2, height:2, defaultW:10, defaultH:14 },
  { itemName:'초록나무', itemCategory:'식물', itemEmoji:'🌳', itemImage:'tree', requiredPoints:50, rarity:'common', width:2, height:2, defaultW:9, defaultH:13 },
  { itemName:'소나무', itemCategory:'식물', itemEmoji:'🌲', itemImage:'tree_pine', requiredPoints:60, rarity:'common', width:1, height:2, defaultW:7, defaultH:13 },
  { itemName:'노랑꽃밭', itemCategory:'식물', itemEmoji:'🌺', itemImage:'flowerFile', requiredPoints:20, rarity:'common', width:1, height:1, defaultW:8, defaultH:7 },
  { itemName:'분홍꽃밭', itemCategory:'식물', itemEmoji:'🌼', itemImage:'flowerFile2', requiredPoints:20, rarity:'common', width:1, height:1, defaultW:8, defaultH:7 },
  { itemName:'들꽃', itemCategory:'식물', itemEmoji:'🌸', itemImage:'flower_ground', requiredPoints:10, rarity:'common', width:1, height:1, defaultW:7, defaultH:5 },
  { itemName:'코스모스', itemCategory:'식물', itemEmoji:'🌼', itemImage:'dandelion', requiredPoints:10, rarity:'common', width:1, height:1, defaultW:5, defaultH:6 },
  { itemName:'민들레', itemCategory:'식물', itemEmoji:'🌻', itemImage:'dandelion2', requiredPoints:10, rarity:'common', width:1, height:1, defaultW:5, defaultH:6 },
  { itemName:'잔디', itemCategory:'식물', itemEmoji:'🌿', itemImage:'weed', requiredPoints:5, rarity:'common', width:1, height:1, defaultW:5, defaultH:5 },
  { itemName:'강아지풀', itemCategory:'식물', itemEmoji:'🌾', itemImage:'foxtail', requiredPoints:5, rarity:'common', width:1, height:1, defaultW:5, defaultH:7 },
  { itemName:'꽃아치', itemCategory:'식물', itemEmoji:'🌷', itemImage:'flower_deco', requiredPoints:30, rarity:'common', width:1, height:1, defaultW:8, defaultH:9 },
  { itemName:'화분', itemCategory:'식물', itemEmoji:'🪴', itemImage:'pot', requiredPoints:25, rarity:'common', width:1, height:1, defaultW:6, defaultH:8 },
  { itemName:'꽃다발', itemCategory:'식물', itemEmoji:'🌷', itemImage:'flowerPot', requiredPoints:25, rarity:'common', width:1, height:1, defaultW:7, defaultH:9 },
  { itemName:'꽃화단', itemCategory:'식물', itemEmoji:'🌸', itemImage:'flowerbed', requiredPoints:35, rarity:'common', width:2, height:1, defaultW:12, defaultH:7 },
  // 조명
  { itemName:'공원가로등', itemCategory:'조명', itemEmoji:'🏮', itemImage:'lamp1', requiredPoints:40, rarity:'common', width:1, height:2, defaultW:5, defaultH:14 },
  { itemName:'빈티지가로등', itemCategory:'조명', itemEmoji:'💡', itemImage:'lamp2', requiredPoints:40, rarity:'common', width:1, height:2, defaultW:5, defaultH:14 },
  // 가구
  { itemName:'나무벤치', itemCategory:'가구', itemEmoji:'🪑', itemImage:'bench', requiredPoints:50, rarity:'common', width:2, height:1, defaultW:11, defaultH:8 },
  { itemName:'하얀벤치', itemCategory:'가구', itemEmoji:'🪑', itemImage:'wbench', requiredPoints:60, rarity:'rare', width:2, height:1, defaultW:11, defaultH:8 },
  { itemName:'통나무벤치', itemCategory:'가구', itemEmoji:'🪵', itemImage:'bench_log', requiredPoints:30, rarity:'common', width:2, height:1, defaultW:10, defaultH:7 },
  { itemName:'피크닉테이블', itemCategory:'가구', itemEmoji:'🪑', itemImage:'table', requiredPoints:45, rarity:'common', width:2, height:1, defaultW:10, defaultH:8 },
  { itemName:'피크닉세트', itemCategory:'가구', itemEmoji:'🧺', itemImage:'picnic', requiredPoints:35, rarity:'common', width:2, height:2, defaultW:13, defaultH:11 },
  // 장식/구조물
  { itemName:'시계탑', itemCategory:'장식', itemEmoji:'🕰️', itemImage:'clock_tower', requiredPoints:100, rarity:'epic', width:1, height:3, defaultW:8, defaultH:18 },
  { itemName:'꽃집', itemCategory:'장식', itemEmoji:'🌺', itemImage:'flowerShop', requiredPoints:120, rarity:'epic', width:2, height:2, defaultW:14, defaultH:15 },
  { itemName:'쉼터', itemCategory:'장식', itemEmoji:'🏠', itemImage:'shelter', requiredPoints:150, rarity:'epic', width:3, height:2, defaultW:18, defaultH:16 },
  { itemName:'물레방아', itemCategory:'장식', itemEmoji:'⚙️', itemImage:'waterwheel', requiredPoints:90, rarity:'rare', width:2, height:2, defaultW:12, defaultH:13 },
  { itemName:'연못', itemCategory:'장식', itemEmoji:'💧', itemImage:'pond', requiredPoints:80, rarity:'rare', width:3, height:2, defaultW:16, defaultH:12 },
  { itemName:'큰분수대', itemCategory:'장식', itemEmoji:'⛲', itemImage:'fountain1', requiredPoints:130, rarity:'epic', width:2, height:2, defaultW:13, defaultH:14 },
  { itemName:'분수대', itemCategory:'장식', itemEmoji:'⛲', itemImage:'fountain2', requiredPoints:140, rarity:'epic', width:2, height:2, defaultW:14, defaultH:15 },
  // 바닥장식
  { itemName:'돌', itemCategory:'바닥', itemEmoji:'🪨', itemImage:'stone', requiredPoints:10, rarity:'common', width:1, height:1, defaultW:5, defaultH:4 },
  { itemName:'돌바닥', itemCategory:'바닥', itemEmoji:'🪨', itemImage:'stoneTile', requiredPoints:15, rarity:'common', width:1, height:1, defaultW:7, defaultH:5 },
  // 크리스마스
  { itemName:'눈사람', itemCategory:'장식', itemEmoji:'⛄', itemImage:'snowman', requiredPoints:40, rarity:'rare', width:1, height:2, defaultW:7, defaultH:11 },
  { itemName:'진저브레드하우스', itemCategory:'장식', itemEmoji:'🏠', itemImage:'gingerbread', requiredPoints:90, rarity:'epic', width:2, height:2, defaultW:12, defaultH:13 },
  { itemName:'나무의자', itemCategory:'가구', itemEmoji:'🪑', itemImage:'wood_chair', requiredPoints:30, rarity:'common', width:1, height:1, defaultW:7, defaultH:8 },
  { itemName:'크리스마스전등', itemCategory:'조명', itemEmoji:'✨', itemImage:'xmas_light', requiredPoints:35, rarity:'common', width:2, height:1, defaultW:12, defaultH:5 },
  { itemName:'크리스마스트리', itemCategory:'식물', itemEmoji:'🎄', itemImage:'xmas_tree', requiredPoints:70, rarity:'rare', width:2, height:3, defaultW:9, defaultH:16 },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB 연결 성공');
    await sequelize.sync({ alter: false });

    // 식재료
    const existIngredients = await Ingredient.count();
    if (existIngredients === 0) {
      await Ingredient.bulkCreate(ingredients);
      console.log(`✅ 식재료 ${ingredients.length}개 삽입`);
    } else {
      console.log(`⚠️  식재료 이미 존재 (${existIngredients}개) - 스킵`);
    }

    // 공원 아이템 템플릿
    const existTemplates = await ParkItemTemplate.count();
    if (existTemplates === 0) {
      await ParkItemTemplate.bulkCreate(parkItems);
      console.log(`✅ 공원 아이템 ${parkItems.length}개 삽입`);
    } else {
      console.log(`⚠️  공원 아이템 이미 존재 (${existTemplates}개) - 스킵`);
    }

    console.log('\n🌿 시드 완료!');
    process.exit(0);
  } catch (err) {
    console.error('❌ 시드 오류:', err);
    process.exit(1);
  }
}

seed();
