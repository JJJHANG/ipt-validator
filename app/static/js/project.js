$(document).ready(function () {
    var $li = $("ul.tab-title li");
    // 初始化第一個 li 為 active
    $($li.eq(0).addClass("active now").find("a").attr("href"))
        .siblings(".tab-inner")
        .hide();
    $li.eq(0).find("a").addClass("now");
    $li.filter(".active:first").find(".editing-mark").removeClass("d-none");

    // 點擊 li 時的事件
    $li.click(function () {
        // 隱藏所有的 tab-inner
        $(".tab-inner").hide();
        $li.removeClass("active");

        // 顯示當前點擊的 li 對應的 tab-inner
        $($(this).find("a").attr("href")).show();
        $(this).find("a").addClass("now");
        $(this).addClass("now");

        // 切換 active 狀態
        $(this).addClass("active");
        $(this).siblings().find("a.now").removeClass("now");
        $(this).siblings(".active").removeClass("active");
        $(this).siblings(".now").removeClass("now");

        // 顯示當前點擊的 li 中的 editing-mark
        if ($(this).hasClass("active")) {
            $(this).find(".editing-mark").removeClass("d-none");
        }

        $li.each(function () {
            if (!$(this).hasClass("active")) {
                $(this).find(".editing-mark").addClass("d-none");
            }
        });
    });
});
