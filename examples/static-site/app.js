let clicks = 0;
document.getElementById('counter').addEventListener('click', () => {
  document.getElementById('count').textContent = String(++clicks);
});
