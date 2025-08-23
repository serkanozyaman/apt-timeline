/* Initialize Swiper for CTI Timeline */
document.addEventListener('DOMContentLoaded', function () {
  var timelineSwiper = new Swiper('.timeline .swiper-container', {
    direction: 'vertical',
    loop: false,
    speed: 1600,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      renderBullet: function (index, className) {
        var slides = document.querySelectorAll('.timeline .swiper-slide');
        var year = slides[index] && slides[index].getAttribute('data-year');
        return '<span class="' + className + '">' + (year || '') + '</span>';
      }
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev'
    },
    breakpoints: {
      768: { direction: 'horizontal' }
    }
  });
});
