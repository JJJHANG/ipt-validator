$(document).ready(function () {
    $(".project-title").hide();

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

        if ($(this).find("a").attr("href") === "#open_project") {
            $(".create-project-btn").addClass("d-none");
            $(".start-project-btn").removeClass("d-none");
            $(".del-project-btn").removeClass("d-none");
        } else {
            $(".create-project-btn").removeClass("d-none");
            $(".start-project-btn").addClass("d-none");
            $(".del-project-btn").addClass("d-none");
        }
    });

    $(".create-project-btn").on("click", function () {
        const projectName = $('input[name="project_name"]').val();
        createProject(projectName);
    });

    $(".del-project-btn").on("click", function () {
        const projectID = $(".current-project")
            .closest(".project-container")
            .data("project-id");
        deleteProject(projectID);
    });

    $(".project-container").on("click", function () {
        $(this).addClass("current-project");
        $(this).siblings(".project-container").removeClass("current-project");
    });

    $(".start-project-btn").on("click", function () {
        const projectName = $(".current-project").find(".project-name").text();
        const projectID = $(".current-project")
            .closest(".project-container")
            .data("project-id");
        $.ajax({
            type: "GET",
            url: `/data-project/projects/${projectID}`,
            contentType: "application/json;charset=UTF-8",
            success: function (data) {
                // console.log(data);
                const templateNames = {
                    資料集類型: [],
                    延伸資料集: [],
                };

                Object.keys(data).forEach((name) => {
                    const core = [
                        "checklist",
                        "occurrence",
                        "samplingevent",
                        "others",
                    ];
                    if (core.includes(name)) {
                        templateNames["資料集類型"].push(name);
                    } else {
                        templateNames["延伸資料集"].push(name);
                    }
                });
                // console.log(templateNames);
                const checkboxNames = {};
                // 遍歷每個模板
                Object.keys(data).forEach(function (template) {
                    const checkbox = data[template].checkbox_names;
                    checkboxNames[template] = checkbox;
                });
                // console.log(templateNames);
                // console.log(checkboxNames);

                $.ajax({
                    // 這裡只傳遞專案名稱、專案 ID、各模板名稱、各模板用的欄位名稱
                    // 傳遞給前端渲染 html 上的元素
                    type: "POST",
                    url: "/data-edit/store_data",
                    contentType: "application/json;charset=UTF-8",
                    data: JSON.stringify({
                        project_name: projectName,
                        project_id: projectID,
                        template_names: templateNames,
                        checkbox_names: checkboxNames,
                    }),
                    success: function () {
                        // 成功後重定向到 data-edit 視圖
                        location.href = `/data-edit?project_name=${encodeURIComponent(
                            projectName
                        )}&project_id=${encodeURIComponent(projectID)}&edit=1`;
                    },
                    error: function (response) {
                        console.error(response);
                    },
                });
            },
            error: function (response) {
                console.error(response);
            },
        });
    });
});

function createProject(projectName) {
    $.ajax({
        type: "GET",
        url: "/data-project/projects_list",
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            if (data.includes(projectName)) {
                alert("專案名稱已經存在，請選擇其他名稱");
            } else if (!projectName) {
                alert("專案名稱不可為空白，請填入專案名稱");
            } else {
                $.ajax({
                    type: "POST",
                    url: "/data-project/projects",
                    data: JSON.stringify({
                        project_name: projectName,
                    }),
                    contentType: "application/json;charset=UTF-8",
                    success: function (response) {
                        const projectId = response.id;
                        location.href = `/data-template?project_name=${projectName}&project_id=${projectId}`;
                    },
                    error: function () {
                        console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
                    },
                });
            }
        },
        error: function () {
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}

function deleteProject(projectID) {
    $.ajax({
        type: "DELETE",
        url: `/data-project/projects/${projectID}`,
        contentType: "application/json;charset=UTF-8",
        success: function () {
            alert("成功刪除該專案");
            location.reload();
        },
        error: function () {
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}
