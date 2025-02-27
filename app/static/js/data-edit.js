var checkboxArrays = {};
var handsontableInstances = {};
var selectedColumn = [];
var highlightedColumn = [
    "taxonID",
    "occurrenceID",
    "eventID",
    "measurementID",
    "resourceID",
    "samp_name",
    "dataID",
];
var customColumn = [];
var customTermsData = null;
var projectHeaders;
var dataContentFromDB = [];
var tableDataFromDB;

getCustomTermsDict();
const { projectID, projectName, isEdit } = getProjectParamsFromUrl();
if (projectID && projectName) {
    // get data from project and initialize hansontable instances
    $.ajax({
        type: "GET",
        url: `/data-project/projects/${projectID}`,
        contentType: "application/json;charset=UTF-8",
        success: function (response) {
            // console.log(data.project_name)
            // console.log(data.table_content)
            projectHeaders = response;
            // console.log(isEdit);
        },
        error: function (response) {
            console.error(response);
        },
    });
}

$(document).ready(function () {
    // IndexedDB instance
    var request = window.indexedDB.open("IndexedDB", 1);
    var db;

    request.onsuccess = function (event) {
        db = request.result;
        console.log("IndexedDB: Database up");

        var transaction = db.transaction(["saved_data"], "readonly");
        var objectStore = transaction.objectStore("saved_data");
        var getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = function (event) {
            console.log("IndexedDB: Render saved_data");
        };

        getAllRequest.onerror = function (event) {
            console.log("IndexedDB: No saved_data yet");
        };
    };

    // IndexDB function: 讀 col_description 中的內容，滑鼠事件時呈現
    function readFromIndexedDB(key) {
        return new Promise(function (resolve, reject) {
            var transaction = db.transaction(["col_description"]);
            var objectStore = transaction.objectStore("col_description");
            var request = objectStore.get(key);

            request.onerror = function (event) {
                console.log("IndexedDB: Fetch description data failed");
                reject(new Error("Fetch error"));
            };

            request.onsuccess = function (event) {
                if (request.result) {
                    var data = {
                        name: request.result.name,
                        type: request.result.type,
                        description: request.result.description,
                        commonname: request.result.commonname,
                        example: request.result.example,
                    };
                    resolve(data);
                } else {
                    console.log("indexedDB: No description data");
                    resolve("by JJJ");
                }
            };
        });
    }

    // IndexedDB function: 儲存 handsontable 表中的內容到 saved_data
    function addToIndexedDB(templateName, checkboxNames, data) {
        var transaction = db.transaction(["saved_data"], "readwrite");
        var objectStore = transaction.objectStore("saved_data");

        var request = objectStore.put({
            template_name: templateName,
            checkbox_names: checkboxNames,
            data: data,
        });

        request.onsuccess = function (event) {
            console.log(`IndexedDB: Save ${templateName} into saved_data`);
        };

        request.onerror = function (event) {
            console.log(
                `IndexedDB: Save ${templateName} failed, ${event.target.error}`
            );
        };
    }

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

    // 收集完之後初始化編輯表格
    $(".template-name").each(function () {
        const TableName = $(this).text();
        $.ajax({
            type: "GET",
            url: "/data-edit/pagination",
            data: {
                project_id: projectID,
                page: 1,
                per_page: 20,
            },
            contentType: "application/json;charset=UTF-8",
            success: function (response) {
                // console.log(response);

                let paginationData = response[TableName];
                tableDataFromDB = paginationData.data;
                // console.log(tableDataFromDB);

                // 清除上一次的按鈕
                $(`#pages-grid-${TableName}`).empty();

                // 更新分頁按鈕
                const paginationContainer = $(`#pages-grid-${TableName}`);
                paginationContainer.empty();

                // 第一頁按鈕
                const firstPageDisabled = "disabled";
                paginationContainer.append(
                    `<button class="function-btn" onclick="loadPage(1)" ${firstPageDisabled}>第一頁</button>`
                );

                // 上一頁按鈕
                const prevPageDisabled = !paginationData.has_prev
                    ? "disabled"
                    : "";
                paginationContainer.append(
                    `<button class="function-btn" onclick="loadPage(${paginationData.prev_page})" ${prevPageDisabled}>上一頁</button>`
                );

                // 當前頁面假按鈕
                paginationContainer.append(
                    `<button id="current-page-btn" disabled>${paginationData.current_page}</button>`
                );

                // 下一頁按鈕
                const nextPageDisabled = !paginationData.has_next
                    ? "disabled"
                    : "";
                paginationContainer.append(
                    `<button class="function-btn" onclick="loadPage(${paginationData.next_page})" ${nextPageDisabled}>下一頁</button>`
                );

                // 最後一頁按鈕
                const lastPageDisabled =
                    paginationData.current_page === paginationData.pages ||
                    paginationData.pages === 0
                        ? "disabled"
                        : "";
                paginationContainer.append(
                    `<button class="function-btn" onclick="loadPage(${paginationData.pages})" ${lastPageDisabled}>最後一頁</button>`
                );

                // 動態生成資料行數
                if (paginationData.total) {
                    $(`#row-count-grid-${TableName}`).text(
                        "當前表格列數：" + paginationData.total
                    );
                } else {
                    $(`#row-count-grid-${TableName}`).text(
                        "當前表格列數：" + 20
                    );
                }

                if (tableDataFromDB.length > 0) {
                    // 有回傳資料時，用回傳資料渲染表格
                    dataContentFromDB = [
                        projectHeaders[templateName].checkbox_names,
                        ...tableDataFromDB,
                    ];

                    initializeHandsontable(
                        containerID,
                        projectHeaders[templateName].checkbox_names,
                        dataContentFromDB,
                        customTermsData
                    );

                    let hotInstance = handsontableInstances[containerID];
                    hotInstance.validateCells();
                } else {
                    // 沒有回傳資料時，建立空白表格
                    initializeHandsontable(
                        containerID,
                        checkboxArrays[templateName],
                        null,
                        customTermsData
                    );
                }
            },
            error: function (response) {
                console.error(response);
            },
        });
        var templateName = $(this).text();
        // console.log(templateName);
        var containerID = "grid-" + templateName;
        // console.log(containerID);

        var checkboxClassName = "checkbox-name-" + templateName;
        // console.log(checkboxClassName);
        $("." + checkboxClassName).each(function () {
            var name = $(this).data("checkbox-name");
            if (!checkboxArrays[templateName]) {
                checkboxArrays[templateName] = []; // 確保初始化只執行一次
            }
            checkboxArrays[templateName].push(name); // 將名稱添加到相應的陣列中
            // console.log(checkboxArrays);
        });

        $(".custom-col").each(function () {
            var name = $(this).data("custom-column");
            customColumn.push(name);
            // console.log(customColumn);
        });
    });

    // 按鈕事件：新增空白分頁
    $(".insert-page-button").click(function () {
        const dataName = $(this).data("name");
        $.ajax({
            type: "POST",
            url: "/data-edit/insert_page",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify({
                table_name: dataName,
                project_id: projectID,
            }),
            success: (response) => {
                if (response.error) {
                    console.error(response.error);
                } else {
                    console.log(response.message);
                    loadPage(1);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error: " + errorThrown);
            },
        });
    });

    $('#remove-row-cancel').click(function () {
        $('.remove-row-popup').addClass('d-none');
    });

    // 按鈕事件：刪除選擇列
    $(".remove-row-button").mousedown(function (event) {
        event.preventDefault();
        const dataName = $(this).data("name");
        const containerID = "grid-" + dataName;
        const hotInstance = handsontableInstances[containerID];

        // 先顯示警告視窗，提醒使用者無法復原
        if (hotInstance) {
            const selectedValue = hotInstance.getSelected()[0];
            const startRowIndex = selectedValue[0] + 1;
            const endRowIndex = selectedValue[2] + 1;
    
            // 將資訊暫存到確認按鈕的 data-* 屬性
            $('#remove-row-comfirm').data("table_name", dataName)
                                    .data("start_row", startRowIndex)
                                    .data("end_row", endRowIndex);
    
            // 顯示確認刪除視窗
            $('.remove-row-popup').removeClass('d-none');
        }
    });

    // 點擊確認刪除按鈕
$('#remove-row-comfirm').off('click').on('click', function () {
    const tableName = $(this).data("table_name");
    const startRow = $(this).data("start_row");
    const endRow = $(this).data("end_row");

    $.ajax({
        type: "DELETE",
        url: "/data-edit/remove_rows",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            table_name: tableName,
            project_id: projectID,  
            start_row_id: startRow,
            end_row_id: endRow,
        }),
        success: (response) => {
            if (response.error) {
                console.error(response.error);
            } else {
                console.log(response.message);
                const currentPage = Number($("#current-page-btn").text());
                loadPage(currentPage);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error: " + errorThrown);
        },
    });

    // 關閉確認視窗
    $('.remove-row-popup').addClass('d-none');
});

    // 按鈕事件：獲取行資料
    $(".get-data-col-button").click(function () {
        // 定義全域函數 getDataCol
        window.getDataCol = function (
            containerID,
            selectedColumn,
            projectID,
            dataName
        ) {
            if (
                typeof selectedColumn !== "undefined" &&
                selectedColumn.length !== 0
            ) {
                // console.log(selectedColumn);
                // const colData =
                //     handsontableInstances[containerID].getDataAtCol(
                //         selectedColumn
                //     );
                var colName =
                    handsontableInstances[containerID].getColHeader(
                        selectedColumn
                    );
                colName = colName.replace(/<div.*?>|<\/div>/g, "");
                // console.log(colData);
                // console.log(colName);
                updateColContent(colName, projectID, dataName);
            } else {
                $(".duplicated-popup").removeClass("d-none");
            }
            selectedColumn = undefined; // 事件觸發之後重置 index
        };

        const dataName = $(this).data("name");
        const containerID = "grid-" + dataName;

        if (handsontableInstances[containerID]) {
            // 確保 containerID 的 Handsontable 實例存在
            // console.log(selectedColumn);
            window.getDataCol(containerID, selectedColumn, projectID, dataName);
        } else {
            console.error(
                "Handsontable instance for containerID '" +
                    containerID +
                    "' not found."
            );
        }
    });

    $(".export-button").click(function () {
        const dataName = [$(this).data("name")];
        const exportUrl = `/data-edit/export_column_csv?project_id=${projectID}&table_name=${dataName}`;
        window.location.href = exportUrl; // 直接跳轉，觸發文件下載
    });

    $(".import-button").click(function () {
        var dataName = $(this).data("name");
        var checkboxNames = checkboxArrays[dataName];

        // 清掉前一次的檔案選擇
        $("#import-file").val("");

        $("#import-file").click();
        $("#import-file").on("change", function () {
            var inputCSV = $(this)[0];
            if (inputCSV.files.length > 0) {
                var file = inputCSV.files[0];
                var reader = new FileReader();
                reader.onload = function (e) {
                    var content = e.target.result;
                    // 只檢查頭部數據（如前 1KB）
                    var header = content.slice(0, 1024);
                    if (
                        header.startsWith("\uFEFF") ||
                        /^[\x00-\x7F\u0080-\u07FF\u0800-\uFFFF]*$/.test(header)
                    ) {
                        importCsvFile(file, dataName, checkboxNames);
                    } else {
                        alert("請選擇 UTF-8 編碼的 CSV 檔案！");
                    }
                };
                reader.readAsText(file, "utf-8");
            }
        });
    });

    // 按鈕事件：下一步（轉跳到資料驗證頁面）
    $(".next-btn").click(function () {
        var templateNames = [];
        var colHeader = [];
        var colData = [];

        $(".tab-inner").each(function () {
            var templateName = $(this).attr("id");
            templateNames.push(templateName);

            var containerID = "grid-" + templateName;

            // 獲取表格資料
            var getData = handsontableInstances[containerID].getData();
            var getHeader = handsontableInstances[containerID].getColHeader();

            getHeader = getHeader.map(function (header) {
                return header.replace(/<div.*?>|<\/div>/g, "");
            });

            colData.push(getData);
            colHeader.push(getHeader);

            // console.log(templateNames);
            // console.log(colHeader);
            // console.log(colData);

            addToIndexedDB(templateName, getHeader, getData);
        });

        transferDataToBackend(templateNames);
    });

    // 按鈕事件：上一步
    $(".back-btn").click(function () {
        window.location.href = `/data-template?project_name=${encodeURIComponent(
            projectName
        )}&project_id=${encodeURIComponent(projectID)}&edit=1`;
    });

    $(".xx").on("click", function (event) {
        $(".popup-container").addClass("d-none");
    });

    // 滑鼠事件之前隱藏樣式
    $("#description-container").hide();
    $("#description-name").hide();
    $("#description-type").hide();
    $("#description").hide();
    $("#description-commonname").hide();
    $("#description-example").hide();
    $(".description-title").hide();

    $(document).on("mouseenter", "thead .relative", async function () {
        var key = $(this).find("span.colHeader").text();
        // console.log(key);

        try {
            var data = await readFromIndexedDB(key);
            if (data !== "by JJJ") {
                $("#description-container").show();
                if (data.name) {
                    $("#description-name").html(data.name);
                    $("#description-name").show();
                    $(".description-title").show();
                }
                if (data.type) {
                    $("#description-type").html(data.type);
                    $("#description-type").show();
                    $(".description-title").show();
                }
                if (data.description) {
                    $("#description-description").html(data.description);
                    $("#description-description").show();
                    $(".description-title").show();
                }
                if (data.commonname) {
                    $("#description-commonname").html(data.commonname);
                    $("#description-commonname").show();
                    $(".description-title").show();
                }
                if (data.example) {
                    $("#description-example").html(data.example);
                    $("#description-example").show();
                    $(".description-title").show();
                }
            } else {
                // $('#description-container').hide();
            }
        } catch (error) {
            console.log("IndexedDB: Error,", error.message);
        }
    });

    $(document).on("mouseleave", "thead .relative", function () {
        $("#description-container").hide();
        $("#description-name").hide();
        $("#description-type").hide();
        $("#description").hide();
        $("#description-commonname").hide();
        $("#description-example").hide();
        $(".description-title").hide();
    });
});

function loadPage(pageNumber) {
    const active_table_name = $("ul.tab-title li.active a").text(); // 取得當前活動的表格名稱
    $(".loader-wrapper").removeClass("d-none");

    $.ajax({
        type: "GET",
        url: "/data-edit/pagination",
        data: {
            project_id: projectID,
            page: pageNumber,
            per_page: 20,
        },
        contentType: "application/json;charset=UTF-8",
        success: function (response) {
            // 根據 active_table_name 獲取對應的資料
            let paginationData = response[active_table_name];
            tableDataFromDB = paginationData.data;
            // console.log(response);

            // 計算行索引起始值
            const startIndex = (pageNumber - 1) * 20; // 每頁顯示 20 筆資料

            // 更新資料顯示
            const containerID = "grid-" + active_table_name;
            // 更新 Handsontable 實例的資料並設置 row index
            const hotInstance = handsontableInstances[containerID];
            hotInstance.updateData(tableDataFromDB);

            // 使用 rowHeaders 設置行索引
            hotInstance.updateSettings({
                rowHeaders: function (row) {
                    return startIndex + row + 1; // 計算當前行的索引
                },
            });

            // 更新分頁按鈕，針對當前表格進行操作
            $(`#pages-grid-${active_table_name}`).empty();

            // 更新分頁按鈕
            const paginationContainer = $(`#pages-grid-${active_table_name}`);
            paginationContainer.empty();

            // 第一頁按鈕
            const firstPageDisabled = pageNumber === 1 ? "disabled" : "";
            paginationContainer.append(
                `<button class="function-btn" onclick="loadPage(1)" ${firstPageDisabled}>第一頁</button>`
            );

            // 上一頁按鈕
            const prevPageDisabled = !paginationData.has_prev ? "disabled" : "";
            paginationContainer.append(
                `<button class="function-btn" onclick="loadPage(${paginationData.prev_page})" ${prevPageDisabled}>上一頁</button>`
            );

            // 當前頁面假按鈕
            paginationContainer.append(
                `<button id="current-page-btn" disabled>${paginationData.current_page}</button>`
            );

            // 下一頁按鈕
            const nextPageDisabled = !paginationData.has_next ? "disabled" : "";
            paginationContainer.append(
                `<button class="function-btn" onclick="loadPage(${paginationData.next_page})" ${nextPageDisabled}>下一頁</button>`
            );

            // 最後一頁按鈕
            const lastPageDisabled =
                pageNumber === paginationData.pages ? "disabled" : "";
            paginationContainer.append(
                `<button class="function-btn" onclick="loadPage(${paginationData.pages})" ${lastPageDisabled}>最後一頁</button>`
            );

            hotInstance.validateCells();
            $(`#row-count-grid-${active_table_name}`).text(
                "當前表格列數：" + paginationData.total
            );
            $(".loader-wrapper").addClass("d-none");
        },
        error: function (response) {
            console.error(response);
            $(".loader-wrapper").addClass("d-none");
        },
    });
}

function importCsvFile(file, dataName, checkboxNames) {
    var formData = new FormData();
    formData.append("file", file);
    formData.append("template_name", dataName);
    formData.append("checkbox_names", checkboxNames);

    $.ajax({
        type: "POST",
        url: "/data-edit/import",
        contentType: false,
        processData: false,
        data: formData,
        success: (response) => {
            if (response.error) {
                alert(`匯入失敗：${response.error}`);
            } else {
                // 如果成功，執行跳轉邏輯
                window.location.href = `/data-edit/column_mapping?project_name=${encodeURIComponent(
                    projectName
                )}&project_id=${encodeURIComponent(projectID)}`;
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            alert("匯入資料表發生錯誤");
            console.log("Error:", textStatus, errorThrown);
        },
    });
}

function getCustomTermsDict() {
    $.ajax({
        type: "GET",
        url: "/data-edit/custom_terms",
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            customTermsData = data;
        },
        error: function () {
            console.error("System: Fail to fetch cutsom terms");
        },
    });
}

// 功能：把編輯表格的資料傳遞到後端
function transferDataToBackend(templateNames) {
    const { projectID, projectName, isEdit } = getProjectParamsFromUrl();
    $(".loader-wrapper").removeClass("d-none");

    $.ajax({
        type: "POST",
        url: "/data-edit/validate", // 給 process-validation 處理驗證過程
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            // table_name: templateNames,
            // table_header: colHeader,
            project_id: projectID,
            custom_terms: customTermsData,
        }),
        success: function (response) {
            if (response.success) {
                $(".loader-wrapper").addClass("d-none");
                console.log("System: Data submitted");
                window.location.href = `/data-validation/?project_name=${projectName}&project_id=${projectID}&edit=${isEdit}`;
            }
        },
        error: function () {
            $(".loader-wrapper").addClass("d-none");
            $(".unknown-error-popup").removeClass("d-none");
            console.error("System: Fail to submit data");
        },
    });
}

// 功能：處理 按鈕事件：獲取行資訊 的細節
function updateColContent(colName, projectID, dataName) {
    $.ajax({
        type: "GET",
        url: "/data-edit/column_content",
        contentType: "application/json;charset=UTF-8",
        data: {
            project_id: projectID,
            table_name: dataName,
            column_name: colName,
        },
        success: function (response) {
            // console.log(response);
            $(".col-content").removeClass("d-none");

            // 生成 html 架構以及內容
            var htmlContent = `
                <div class="col-name">${colName}</div>
                <ul>
            `;
            Object.entries(response).forEach(([element, count]) => {
                if (element === "null" || element === undefined) {
                    element = "N/A";
                }
                htmlContent += `
                    <li class="facet-content">
                        <span>${element}</span>
                        <span class="facet-content-number"> ${count}</span>
                    </li>
                `;
            });
            htmlContent += `</ul>`;

            $(".col-content").html(htmlContent);
        },
        error: function (response) {
            console.error(response.responseJSON.error);
        },
    });
}

// 功能：初始化編輯表格
function initializeHandsontable(
    containerID,
    checkboxNames,
    data,
    customTermsData
) {
    /*** 
    參數說明：

    containerID： 渲染 handsontable 的起始點，格式為字串，內容如 grid-checklist, gird-darwin-core-occurrence
    checkboxNames： 資料表的 header 名稱，格式為列表
    data： 資料表的全部內容，包含 header 與每列的內容，格式為雙層列表，結構如下：
    data = [
        [], // header 
        [], // 第一列內容
        [], // 第二列內容
        ...
    ]
    customTermsData： 自訂欄位的名稱，格式為字典，結構如下：
    customTermsData = {
        key1: [], # key 代表自訂欄位的種類，value 為列表，代表該種類下的自訂欄位名稱
        key2: [],
        ...
    }
    ***/

    var container = document.getElementById(containerID);
    if (data) {
        var hot = new Handsontable(container, {
            colHeaders: data[0].map(function (name) {
                if (highlightedColumn.includes(name)) {
                    return `<div class="red">${name}</div>`;
                } else if (customColumn.includes(name)) {
                    return `<div class="custom">${name}</div>`;
                } else {
                    return `<div>${name}</div>`;
                }
            }),
            columns: checkboxNames.map(function (name) {
                // 設定前驗證檢查的格式
                if (name === "basisOfRecord") {
                    return {
                        type: "dropdown",
                        source: [
                            "MaterialEntity",
                            "PreservedSpecimen",
                            "FossilSpecimen",
                            "LivingSpecimen",
                            "MaterialSample",
                            "Event",
                            "HumanObservation",
                            "MachineObservation",
                            "Taxon",
                            "Occurrence",
                            "MaterialCitation",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "type") {
                    return {
                        type: "dropdown",
                        source: [
                            "Collection",
                            "Dataset",
                            "Event",
                            "Image",
                            "MovingImage",
                            "PhysicalObject",
                            "Sound",
                            "StillImage",
                            "Text",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "occurrenceStatus") {
                    return {
                        type: "dropdown",
                        source: ["absent", "present"],
                        trimDropdown: false,
                    };
                } else if (name === "continent") {
                    return {
                        type: "dropdown",
                        source: [
                            "Africa",
                            "Antarctica",
                            "Asia",
                            "Europe",
                            "North America",
                            "Oceania",
                            "South America",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "language") {
                    return {
                        type: "dropdown",
                        source: ["en", "zh-TW"],
                        trimDropdown: false,
                    };
                } else if (name === "license") {
                    return {
                        type: "dropdown",
                        source: [
                            "CC0 1.0",
                            "CC BY 4.0",
                            "CC BY-NC 4.0",
                            "No license",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "sex") {
                    return {
                        type: "dropdown",
                        source: ["female", "male", "hermaphrodite"],
                        trimDropdown: false,
                    };
                } else if (name === "establishmentMeans") {
                    return {
                        type: "dropdown",
                        source: [
                            "native",
                            "nativeReintroduced",
                            "introduced",
                            "introducedAssistedColonisation",
                            "vagrant",
                            "uncertain",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "degreeOfEstablishment") {
                    return {
                        type: "dropdown",
                        source: [
                            "native",
                            "captive",
                            "cultivated",
                            "released",
                            "failing",
                            "casual",
                            "reproducing",
                            "established",
                            "colonising",
                            "invasive",
                            "widespreadInvasive",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "typeStatus") {
                    return {
                        type: "dropdown",
                        source: [
                            "holotype",
                            "paratype",
                            "isotype",
                            "allotype",
                            "syntype",
                            "lectotype",
                            "paralectotype",
                            "neotype",
                            "topotype",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "kingdom") {
                    return {
                        type: "dropdown",
                        source: [
                            "Animalia",
                            "Archaea",
                            "Bacteria",
                            "Chromista",
                            "Fungi",
                            "Plantae",
                            "Protozoa",
                            "Viruses",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "decimalLongitude") {
                    return {
                        validator: "custom-float-validator",
                    };
                } else if (name === "decimalLatitude") {
                    return {
                        validator: "custom-float-validator",
                    };
                } else if (name === "eventDate") {
                    return {
                        validator: "custom-date-validator",
                    };
                } else if (name === "individualCount") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (name === "year") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (name === "month") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (name === "day") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (
                    customTermsData["date"] &&
                    customTermsData["date"].includes(name)
                ) {
                    return {
                        validator: "custom-date-validator",
                    };
                } else {
                    return {};
                }
            }),

            minRows: 1,
            rowHeaders: true,
            width: "100%",
            height: "auto",
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: true,
            // dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: ["undo", "redo", "---------", "copy", "cut"],
            selectionMode: "multiple",
            language: "zh-TW",
            licenseKey: "non-commercial-and-evaluation",
        });
        hot.loadData(data.slice(1));
    } else {
        var hot = new Handsontable(container, {
            colHeaders: checkboxNames.map(function (name) {
                if (highlightedColumn.includes(name)) {
                    return `<div class="red">${name}</div>`;
                } else if (customColumn.includes(name)) {
                    return `<div class="custom">${name}</div>`;
                } else {
                    return `<div>${name}</div>`;
                }
            }),
            columns: checkboxNames.map(function (name) {
                // 設定前驗證檢查的格式
                if (name === "basisOfRecord") {
                    return {
                        type: "dropdown",
                        source: [
                            "MaterialEntity",
                            "PreservedSpecimen",
                            "FossilSpecimen",
                            "LivingSpecimen",
                            "MaterialSample",
                            "Event",
                            "HumanObservation",
                            "MachineObservation",
                            "Taxon",
                            "Occurrence",
                            "MaterialCitation",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "type") {
                    return {
                        type: "dropdown",
                        source: [
                            "Collection",
                            "Dataset",
                            "Event",
                            "Image",
                            "MovingImage",
                            "PhysicalObject",
                            "Sound",
                            "StillImage",
                            "Text",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "occurrenceStatus") {
                    return {
                        type: "dropdown",
                        source: ["absent", "present"],
                        trimDropdown: false,
                    };
                } else if (name === "continent") {
                    return {
                        type: "dropdown",
                        source: [
                            "Africa",
                            "Antarctica",
                            "Asia",
                            "Europe",
                            "North America",
                            "Oceania",
                            "South America",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "language") {
                    return {
                        type: "dropdown",
                        source: ["en", "zh-TW"],
                        trimDropdown: false,
                    };
                } else if (name === "license") {
                    return {
                        type: "dropdown",
                        source: [
                            "CC0 1.0",
                            "CC BY 4.0",
                            "CC BY-NC 4.0",
                            "No license",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "sex") {
                    return {
                        type: "dropdown",
                        source: ["female", "male", "hermaphrodite"],
                        trimDropdown: false,
                    };
                } else if (name === "establishmentMeans") {
                    return {
                        type: "dropdown",
                        source: [
                            "native",
                            "nativeReintroduced",
                            "introduced",
                            "introducedAssistedColonisation",
                            "vagrant",
                            "uncertain",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "degreeOfEstablishment") {
                    return {
                        type: "dropdown",
                        source: [
                            "native",
                            "captive",
                            "cultivated",
                            "released",
                            "failing",
                            "casual",
                            "reproducing",
                            "established",
                            "colonising",
                            "invasive",
                            "widespreadInvasive",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "typeStatus") {
                    return {
                        type: "dropdown",
                        source: [
                            "holotype",
                            "paratype",
                            "isotype",
                            "allotype",
                            "syntype",
                            "lectotype",
                            "paralectotype",
                            "neotype",
                            "topotype",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "kingdom") {
                    return {
                        type: "dropdown",
                        source: [
                            "Animalia",
                            "Archaea",
                            "Bacteria",
                            "Chromista",
                            "Fungi",
                            "Plantae",
                            "Protozoa",
                            "Viruses",
                        ],
                        trimDropdown: false,
                    };
                } else if (name === "decimalLongitude") {
                    return {
                        validator: "custom-float-validator",
                    };
                } else if (name === "decimalLatitude") {
                    return {
                        validator: "custom-float-validator",
                    };
                } else if (name === "eventDate") {
                    return {
                        validator: "custom-date-validator",
                    };
                } else if (name === "individualCount") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (name === "year") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (name === "month") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (name === "day") {
                    return {
                        validator: "custom-int-validator",
                    };
                } else if (
                    customTermsData["date"] &&
                    customTermsData["date"].includes(name)
                ) {
                    return {
                        validator: "custom-date-validator",
                    };
                } else {
                    return {};
                }
            }),

            minRows: 1,
            startRows: 20,
            rowHeaders: true,
            width: "100%",
            height: "auto",
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: true,
            // dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: [
                "undo",
                "redo",
                "---------",
                "copy",
                "cut",
                "---------",
            ],
            selectionMode: "multiple",
            language: "zh-TW",
            licenseKey: "non-commercial-and-evaluation",
        });
    }

    (function (Handsontable) {
        function dateValidator(value, callback) {
            // 檢查是否是有效的日期格式
            if (isValidDate(value)) {
                callback(true); // 如果是有效的日期格式，回傳true
            } else {
                callback(false); // 如果不是有效的日期格式，回傳false
            }
        }

        function positiveIntegerValidator(value, callback) {
            const positiveIntRegex = /^[1-9]\d*$/; // 以非零開頭的數字序列
            callback(positiveIntRegex.test(value));
        }

        function floatValidator(value, callback) {
            // 正則表達式匹配正浮點數，包括整數部分和小數點
            const floatRegex = /^[+-]?([0-9]*[.])?[0-9]+$/;
            callback(floatRegex.test(value));
        }

        // 檢查日期的有效性
        function isValidDate(dateStr) {
            const ISO2014 = /^\d{4}-\d{2}-\d{2}$/; // 1996-11-26
            const ISO2014_var = /^\d{4}-\d{2}$/; // 1996-11
            const ISO2014_var2 = /^\d{4}$/; // 1996
            const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[-+]\d{4}$/; // 1996-11-26T11:26+0800
            const ISO8601_var = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/; // 1996-11-26T11:26Z
            const ISO8601_var2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/; // 1996-11-26T11:26
            const dateRange = /^\d{4}-\d{2}-\d{2}\/\d{2}$/; // 1996-11-26/30
            const dateRange_var2 = /^\d{4}-\d{2}\/\d{2}$/; // 1996-11/12
            return (
                ISO2014.test(dateStr) ||
                ISO2014_var.test(dateStr) ||
                ISO8601.test(dateStr) ||
                ISO8601_var.test(dateStr) ||
                ISO8601_var2.test(dateStr) ||
                dateRange.test(dateStr) ||
                dateRange_var2.test(dateStr) ||
                ISO2014_var2.test(dateStr)
            );
        }

        Handsontable.validators.registerValidator(
            "custom-date-validator",
            dateValidator
        );
        Handsontable.validators.registerValidator(
            "custom-int-validator",
            positiveIntegerValidator
        );
        Handsontable.validators.registerValidator(
            "custom-float-validator",
            floatValidator
        );
    })(Handsontable);

    // *deprecated* 新增十列
    // window.addTenRow = function () {
    //     hot.alter('insert_row_below', 1, 10);
    // };

    // *deprecated* 刪除指定列
    // window.deleteRow = function () {
    //     // console.log(selectedRow)
    //     hot.alter('remove_row', selectedRow);
    // };

    function getAllGridIDs() {
        const containers = document.querySelectorAll(".grid-container");
        const gridID = [];

        containers.forEach((container) => {
            const id = container.id;
            gridID.push(id);
        });

        return gridID;
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function saveTableContent() {
        const allGridIDs = getAllGridIDs();
        // console.log(allGridIDs)
        const urlParams = new URLSearchParams(window.location.search);
        const projectID = urlParams.get("project_id");
        // console.log(projectID);

        allGridIDs.forEach((containerID) => {
            let formattedData = {};
            // const containerID = container.id;
            const tableName = containerID.replace("grid-", "");
            // const hotInstance = Handsontable.getInstance(container);
            const tableData = handsontableInstances[containerID].getData();
            const tableHeader =
                handsontableInstances[containerID].getColHeader();
            const cleanTableHeader = tableHeader.map((header) =>
                header.replace(/<div.*?>|<\/div>/g, "")
            );
            const rowHeaders =
                handsontableInstances[containerID].getRowHeader();

            formattedData = tableData.map((row, rowIndex) => {
                const rowData = {};
                cleanTableHeader.forEach((header, index) => {
                    rowData[header] =
                        row[index] === null || row[index] === undefined
                            ? ""
                            : String(row[index]);
                });
                const renderedRowIndex = rowHeaders[rowIndex];
                return { row_index: renderedRowIndex, data: rowData };
            });

            // jsonData[tableName] = {
            //     checkbox_names: cleanTableHeader,
            //     data: tableData,
            // };

            // console.log(tableData);
            // console.log(cleanTableHeader);
            // console.log(formattedData);
            $.ajax({
                type: "PATCH",
                url: "/data-edit/autosave",
                data: JSON.stringify({
                    project_id: projectID,
                    // table_content: jsonData,
                    formatted_data: formattedData,
                    table_name: tableName,
                }),
                contentType: "application/json;charset=UTF-8",
                success: function () {
                    $("#autosave-status").text("（已存檔）");
                },
                error: function (response) {
                    console.error(response);
                },
            });
        });

        // console.log(jsonData);
    }

    const debouncedSaveTableContent = debounce(saveTableContent, 1000);

    // 取得被選取的行、列的 index
    hot.updateSettings({
        afterSelectionEnd: function (r, c, r2, c2) {
            selectedRow = hot.toPhysicalRow(r);
            selectedColumn = hot.toPhysicalColumn(c);
        },
        afterChange: function () {
            // 更新列數
            // var rowCount = hot.countRows();
            // $("#row-count-" + containerID).text("當前表格列數：" + rowCount);
            // console.log("CHANGED!");
            // saveTableContent(containerID);
            $("#autosave-status").text("（儲存中．．．）");
            debouncedSaveTableContent();
        },
        // afterCreateRow: function () {
        //     // 更新列數
        //     var rowCount = hot.countRows();
        //     $("#row-count-" + containerID).text("當前表格列數：" + rowCount);
        //     debouncedSaveTableContent();
        // },
        // afterRemoveRow: function () {
        //     // 更新列數
        //     var rowCount = hot.countRows();
        //     $("#row-count-" + containerID).text("當前表格列數：" + rowCount);
        // },
    });

    hot.runHooks("afterChange");
    handsontableInstances[containerID] = hot;
    // console.log(handsontableInstances);
}

function getProjectParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        projectID: urlParams.get("project_id"),
        projectName: urlParams.get("project_name"),
        isEdit: urlParams.get("edit"),
    };
}
