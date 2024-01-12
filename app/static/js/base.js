$(document).ready(function() {

    $('.left-container').click(function  () {
        window.location.href = 'data-template';
    })

    var currentPage = window.location.pathname;
    console.log(currentPage);

    // 檢查每個標籤的 href 屬性是否匹配當前頁面 URL
    $('.right-container .nav').each(function () {
        if ('/' + $(this).attr('id') === currentPage) {
            console.log('match');
            $(this).addClass('nav-active');
        } else {
            $(this).removeClass('nav-active');
        }
    });
});
