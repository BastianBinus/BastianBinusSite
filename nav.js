document.querySelectorAll('#myDIV .btn').forEach(link => {
  if (link.getAttribute('href') === location.pathname.split('/').pop()) {
    link.classList.add('active');
  }
});
