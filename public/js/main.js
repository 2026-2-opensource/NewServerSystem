// 플래시 메시지 자동 제거
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-consume');
  if (!btn) return;
  consumeIngredient(btn);
});