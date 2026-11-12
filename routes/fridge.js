const express = require('express');
const router = express.Router();
const fridgeController = require('../controllers/fridgeController');
const consumeController = require('../controllers/consumeController');
const { isLoggedIn } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', isLoggedIn, fridgeController.getIndex);
router.post('/add', isLoggedIn, fridgeController.addIngredient);
router.post('/:id/edit', isLoggedIn, fridgeController.editIngredient);
router.post('/:id/delete', isLoggedIn, fridgeController.deleteMultipleIngredients);
router.post(
  '/delete-multiple',
  isLoggedIn,
  fridgeController.deleteMultipleIngredients
);
router.post('/delete-expired', fridgeController.deleteExpiredIngredients);
router.post('/:id/consume', isLoggedIn, consumeController.consume);

router.post('/:id/discard', isLoggedIn, consumeController.discard);

router.post('/:id/consume', isLoggedIn, fridgeController.consumeIngredient);

// [신규 추가] 로그인된 사용자만 영수증 이미지를 단건('receipt' 키값)으로 업로드하여 OCR 컨트롤러로 연결
router.post('/ocr', isLoggedIn, upload.single('receipt'), fridgeController.processReceiptOCR);
// 사용자가 확인/수정한 식재료 배열 데이터를 받아 DB에 최종 저장
router.post('/ocr/confirm', isLoggedIn, fridgeController.addIngredientsFromOCR);
async function submitEdit() {
  const id = document.getElementById('editId').value;

  const body = {
    ingredientName: document.getElementById('editName').value,
    quantity: document.getElementById('editQuantity').value,
    expiryDate: document.getElementById('editExpiry').value,
    storageMethod: document.getElementById('editStorage').value,
    categoryInfo: document.getElementById('editCategory').value,
    amount: document.getElementById('editAmount').value
  };

  try {
    const res = await fetch(`/fridge/${id}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem(
        'flashMsg',
        '✅ 식재료가 수정되었습니다.'
      );

      location.reload();
    }

  } catch (err) {
    console.error(err);
  }
}  // submitEdit 끝

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

module.exports = router;