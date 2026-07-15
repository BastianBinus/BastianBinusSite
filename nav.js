document.querySelectorAll('#main-nav .btn').forEach(link => {
  if (link.getAttribute('href') === location.pathname.split('/').pop()) {
    link.classList.add('active');
  }
});
