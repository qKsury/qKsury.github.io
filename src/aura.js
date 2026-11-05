const cards = document.querySelectorAll('.aura-card');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function resetTilt(card) {
  card.classList.remove('is-tilting');
  card.style.setProperty('--tilt-x', '0deg');
  card.style.setProperty('--tilt-y', '0deg');
}

cards.forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;

    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    card.style.setProperty('--tilt-x', `${(-y * 8).toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${(x * 8).toFixed(2)}deg`);
    card.classList.add('is-tilting');
  });

  card.addEventListener('pointerleave', () => resetTilt(card));
  card.addEventListener('pointercancel', () => resetTilt(card));
});

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) cards.forEach(resetTilt);
});
