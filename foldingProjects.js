const allButtons = document.querySelectorAll('#Projects-Container .btn')

allButtons.forEach(PrBtn => {
  PrBtn.addEventListener('click', function() {
    let conAc = this.classList.contains('active')
    allButtons.forEach(btn => btn.classList.remove('active'))
    if (!conAc){
      this.classList.add('active');
    } else {
      this.classList.remove('active');
    }
  })
});
