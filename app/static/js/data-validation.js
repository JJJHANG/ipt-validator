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

    var $li = $('ul.tab-title li');

    $('.tab-inner').hide();

    // 初始化第一個 li 為 active
    $($li.eq(0).addClass('active').find('a').attr('href')).siblings('.tab-inner').hide();
    $li.filter('.active:first').find('.editing-mark').removeClass('d-none');

    // 對於具有 active 屬性的 li，顯示其所有相對應的 tab-inner
    $li.each(function() {
        if ($(this).hasClass('active')) {
            var targets = $(this).data('targets').split(', ');
            $(targets.join(', ')).show();
        }
    });

    $li.click(function() {
        // 隱藏所有的 tab-inner
        $('.tab-inner').hide();
        $li.removeClass('active');
    
        // 獲取點擊的 li 的 data-targets 屬性值
        var targets = $(this).data('targets').split(', ');
    
        // 顯示與當前點擊的 li 相對應的所有 tab-inner
        $(targets.join(', ')).show();
    
        // 切換 active 狀態
        $(this).addClass('active');
        $(this).siblings('.active').removeClass('active');
    
        // 顯示當前點擊的 li 中的 editing-mark
        if ($(this).hasClass('active')) {
            $(this).find('.editing-mark').removeClass('d-none');
        } 
    
        $li.each(function() {
            if (!$(this).hasClass('active')) {
                $(this).find('.editing-mark').addClass('d-none');
            }
        });
    });
    

    // 按鈕事件：上一步
    $('.back-btn').click(function () {
        window.history.back();
    });
});