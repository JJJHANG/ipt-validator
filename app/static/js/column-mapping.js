const { projectID, projectName, isEdit } = getProjectParamsFromUrl();

$(document).ready(function () {
    $(".next-btn").on("click", function () {
        const mappingResult = {}; // 用來存儲 label 和選擇的 option 值的字典

        // 遍歷所有的表格行
        $(".mapping-table tbody tr").each(function () {
            var labelValue = $(this).find("div").text(); // 獲取該行中的 label 值
            var selectedOption = $(this).find("select").val(); // 獲取該行中選擇的 option 值

            // 將 label 和選中的 option 值存入字典，如果 option 為空，忽略
            if (selectedOption) {
                mappingResult[labelValue] = selectedOption;
            }
        });
        $(".loader-wrapper").removeClass("d-none");

        $.ajax({
            type: "POST",
            url: "/data-edit/store_mapping_result",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify({
                mappingResult: mappingResult,
                project_id: projectID,
            }),
            success: function () {
                // 成功後重定向到 data-edit 視圖
                location.href = `/data-edit?project_name=${encodeURIComponent(
                    projectName
                )}&project_id=${encodeURIComponent(projectID)}&edit=1`;
                // $(".loader-wrapper").addClass("d-none");
            },
            error: function (response) {
                console.error(response);
                // $(".loader-wrapper").addClass("d-none");
            },
        });
    });

    $(".back-btn").on("click", function () {
        const mappingResult = null;
        $.ajax({
            type: "POST",
            url: "/data-edit/store_mapping_result",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify({
                mappingResult: mappingResult,
                project_id: projectID,
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
    });
});

function getProjectParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        projectID: urlParams.get("project_id"),
        projectName: urlParams.get("project_name"),
        isEdit: urlParams.get("edit"),
    };
}
