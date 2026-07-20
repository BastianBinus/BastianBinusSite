const allButtons = document.querySelectorAll('#Projects-Container .btn')

allButtons.forEach(PrBtn => {
  PrBtn.addEventListener('click', function() {
    let conAc = this.classList.contains('active')
    
  allButtons.forEach(btn => {
  if (!btn.querySelector('img')) return;
  const img = btn.querySelector('img');
  img.src = img.src.replace('Big', 'Small');
  btn.classList.remove('active');
})
    if (!conAc){
      this.classList.add('active');
      let img = this.querySelector('img');
      img.src = img.src.replace('Small', 'Big');
    } else {
      this.classList.remove('active');
    }
  })
});
