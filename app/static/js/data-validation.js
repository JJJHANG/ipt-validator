$(document).ready(function() {
    $('.error-message-box').click(function() {
        var accordionMenu = $(this).next('.accordion-menu');

        if (accordionMenu.hasClass('d-none')) { // 如果是折疊狀態，展開自己、折疊其他
            accordionMenu.removeClass('d-none');
            $('.accordion-menu').not(accordionMenu).addClass('d-none');
        } else { // 如果是展開狀態、折疊自己以及其他
            accordionMenu.addClass('d-none');
            $(this).siblings('.error-message-box').find('.accordion-menu').addClass('d-none');
        }
    });
});