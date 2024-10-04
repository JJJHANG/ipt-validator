$(document).ready(function() {

    $('.left-container').click(function  () {
        window.location.href = '/data-project';
    })

    var currentPage = window.location.pathname;

    // 檢查每個標籤的 href 屬性是否匹配當前頁面 URL
    $('.right-container .nav').each(function () {
        if ('/' + $(this).attr('id') + '/' === currentPage) {
            $(this).addClass('nav-active');
        } else {
            $(this).removeClass('nav-active');
        }
    });

    $(document).ready(function() {
        const projectName = getProjectNameFromUrl();
        if (projectName) {
            $('#current-project').text(projectName);
        } else {
            $('.project-title').addClass('d-none');
        }
    });
});

function getProjectNameFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('project_name');
}
