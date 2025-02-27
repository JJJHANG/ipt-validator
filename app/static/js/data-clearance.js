var handsontableInstances = {};
var containerID;
var colName;
var rowIndexes;
var columnIndex;
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
getCustomTermsDict();

$(document).ready(function () {
    $(".custom-col").each(function () {
        var name = $(this).data("custom-column");
        customColumn.push(name);
        // console.log(customColumn);
    });

    $(".tab-title li").each(function () {
        const TableName = $(this).data("name");
        const containerID = "grid-" + TableName;
        const { projectID, projectName, isEdit } = getProjectParamsFromUrl();
        // console.log(templateName);
        $(".loader-wrapper").removeClass("d-none");

        $.ajax({
            type: "GET",
            url: "/data-edit/pagination",
            data: {
                project_id: projectID,
            },
            success: (response) => {
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
                        projectHeaders[TableName].checkbox_names,
                        ...tableDataFromDB,
                    ];

                    initializeHandsontable(
                        containerID,
                        projectHeaders[TableName].checkbox_names,
                        dataContentFromDB,
                        customTermsData
                    );

                    processHighlight(
                        containerID,
                        TableName,
                        paginationData.current_page
                    );
                }
                $(".loader-wrapper").addClass("d-none");
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert("獲取資料失敗");
                console.log("Error:", textStatus, errorThrown);
                $(".loader-wrapper").addClass("d-none");
            },
        });
    });
    // // IndexedDB instance
    // var request = window.indexedDB.open("IndexedDB", 1);
    // var db;

    // request.onsuccess = function (event) {
    //     db = request.result;
    //     console.log("IndexedDB: Database up");

    //     var transaction = db.transaction(["saved_data"], "readonly");
    //     var objectStore = transaction.objectStore("saved_data");
    //     var getAllRequest = objectStore.getAll();

    //     getAllRequest.onsuccess = function (event) {
    //         print("success");
    //         if (getAllRequest.result && getAllRequest.result.length > 0) {
    //             getAllRequest.result.forEach(function (item) {
    //                 // console.log(item);
    //                 const containerID = "grid-" + item.template_name;
    //                 const checkboxNames = item.checkbox_names;
    //                 const data = [checkboxNames].concat(item.data);

    //                 $("#" + containerID).html("");
    //                 initializeHandsontable(
    //                     containerID,
    //                     checkboxNames,
    //                     data,
    //                     customTermsData
    //                 );

    //                 const errorrMessageID =
    //                     item.template_name + "-error-message";
    //                 $(`#${errorrMessageID} .accordion-table`).each(function () {
    //                     const $table = $(this);

    //                     $table.find("tbody tr").each(function () {
    //                         const $row = $(this);
    //                         const rowIndex = $row.find("td:first-child").text();

    //                         highlightRow(containerID, rowIndex - 1);
    //                     });

    //                     // const columnNames = $table.find('thead th:last').map(function (index) {
    //                     //     const columnName = $(this).text();
    //                     //     console.log(columnName);
    //                     //     const elementscolumnName = $(`#${containerID} span.colHeader:contains(${columnName})`);
    //                     //     const columnIndex = elementscolumnName.parents('th').attr('aria-colindex')
    //                     // }).get();
    //                 });

    //                 console.log(
    //                     "IndexedDB: Render saved_data,",
    //                     item.template_name
    //                 );
    //             });
    //         } else {
    //             console.log("IndexedDB: No saved_data yet");
    //         }
    //     };

    //     getAllRequest.onerror = function (event) {
    //         console.log("IndexedDB: No saved_data yet");
    //     };
    // };

    // // IndexedDB function: 儲存 handsontable 表中的內容到 saved_data
    // function addToIndexedDB(templateName, checkboxNames, data) {
    //     var transaction = db.transaction(["saved_data"], "readwrite");
    //     var objectStore = transaction.objectStore("saved_data");

    //     var request = objectStore.put({
    //         template_name: templateName,
    //         checkbox_names: checkboxNames,
    //         data: data,
    //     });

    //     request.onsuccess = function (event) {
    //         console.log(`IndexedDB: Save ${templateName} into saved_data`);
    //     };

    //     request.onerror = function (event) {
    //         console.log(
    //             `IndexedDB: Save ${templateName} failed, ${event.target.error}`
    //         );
    //     };
    // }

    var $li = $("ul.tab-title li");

    $(".tab-inner").hide();

    // 初始化第一個 li 為 active
    $($li.eq(0).addClass("active now").find("a").attr("href"))
        .siblings(".tab-inner")
        .hide();
    $li.filter(".active:first").find(".editing-mark").removeClass("d-none");

    // 對於具有 active 屬性的 li，顯示其所有相對應的 tab-inner
    $li.each(function () {
        if ($(this).hasClass("active")) {
            var targets = $(this).data("targets").split(", ");
            $(targets.join(", ")).show();
        }
    });

    $li.click(function () {
        // 隱藏所有的 tab-inner
        $(".tab-inner").hide();
        $li.removeClass("active now");

        // 獲取點擊的 li 的 data-targets 屬性值
        var targets = $(this).data("targets").split(", ");

        // 顯示與當前點擊的 li 相對應的所有 tab-inner
        $(targets.join(", ")).show();

        // 切換 active 狀態
        $(this).addClass("active now");
        $(this).siblings(".active").removeClass("active now");

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

    $(".error-message-box").click(function () {
        var accordionMenu = $(this).next(".accordion-menu");

        if (accordionMenu.hasClass("d-none")) {
            // 如果是折疊狀態，展開自己、折疊其他
            accordionMenu.removeClass("d-none");
            $(".accordion-menu").not(accordionMenu).addClass("d-none");
        } else {
            // 如果是展開狀態、折疊自己以及其他
            accordionMenu.addClass("d-none");
            $(this)
                .siblings(".error-message-box")
                .find(".accordion-menu")
                .addClass("d-none");
        }
    });

    // 按鈕事件：內容篩選功能
    $(".text-facet-button").click(function () {
        const tableName = $(this).data("name");
        getTextFacetData(tableName, selectedColumn);
    });

    $(".xx").on("click", function () {
        $(".popup-container").addClass("d-none");
    });

    // 點擊事件：內容篩選中的內容被點選時，彈出修改視窗
    $(document).on("click", ".text-facet-content", function () {
        const oldValue = $(this).find("span:first-child").text();
        $("#text-facet-input").val(oldValue);
        // 顯示彈出修改視窗
        $(".text-facet-popup").removeClass("d-none");

        const tableName = $("ul.tab-title li.active").data("name");
        const columnName = $(".col-content").find(".col-name").text();
        const currentPage = $(
            `#pages-grid-${tableName} #current-page-btn`
        ).text();

        $(document).on("click", "#text-facet-check", function () {
            $(".loader-wrapper").removeClass("d-none");
            const newValue = $("#text-facet-input").val();
            $.ajax({
                type: "PATCH",
                url: "/data-clearance/text_facet",
                contentType: "application/json;charset=UTF-8",
                data: JSON.stringify({
                    project_id: projectID,
                    table_name: tableName,
                    column_name: columnName,
                    old_value: oldValue,
                    new_value: newValue,
                }),
                success: function (response) {
                    if (response.error) {
                        alert(response.error);
                    } else {
                        console.log(response.success);

                        // 重新載入分頁內容
                        loadPage(currentPage);
                        // 清空欲修改內容的 input
                        $("#text-facet-input").val("");
                        // 隱藏彈出修改視窗
                        $(".text-facet-popup").addClass("d-none");
                        // 隱藏內容篩選結果
                        $(".col-content").addClass("d-none");
                    }
                    $(".loader-wrapper").addClass("d-none");
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error("Error: " + errorThrown);
                    $(".loader-wrapper").addClass("d-none");
                },
            });
        });
    });

    $(document).on("click", ".xx-text-facet", function (event) {
        $(".col-content").html("");
        $(".col-content").addClass("d-none");
    });

    $(".duplicate-facet-button").click(function () {
        getDataCol = function (containerID, selectedColumn) {
            if (
                typeof selectedColumn !== "undefined" &&
                selectedColumn.length !== 0
            ) {
                // console.log(selectedColumn);
                const colData =
                    handsontableInstances[containerID].getDataAtCol(
                        selectedColumn
                    );
                colName =
                    handsontableInstances[containerID].getColHeader(
                        selectedColumn
                    );
                // console.log(colData);
                // console.log(colName);
                duplicateFacetContent(colName, colData);
            } else {
                $(".duplicated-popup").removeClass("d-none");
            }
            selectedColumn = undefined; // 事件觸發之後重置 index
        };

        var buttonID = $(this).attr("id");
        var dataName = $(this).data("name");
        // console.log('點擊的按鈕的ID為:', buttonID);
        // console.log('點擊的按鈕的dataName為:', dataName);

        containerID = "grid-" + dataName;
        if (handsontableInstances[containerID]) {
            // 確保 containerID 的 Handsontable 實例存在
            // console.log(selectedColumn);
            getDataCol(containerID, selectedColumn);
        } else {
            console.error(
                "Handsontable instance for containerID '" +
                    containerID +
                    "' not found."
            );
        }
    });

    $(".text-filter-button").click(function () {
        const tableName = $(this).data("name");
        const containerID = "grid-" + tableName;
        const hotInstance = handsontableInstances[containerID];
        // 檢查 hotInstance 是否存在
        if (!hotInstance) {
            console.error(
                "HotInstance not found for container ID:",
                containerID
            );
            return;
        }

        // 檢查 selectedColumn 是否定義且非空
        if (
            typeof selectedColumn === "undefined" ||
            selectedColumn.length === 0
        ) {
            console.error("selectedColumn is not defined or is empty");
            return;
        }

        // 獲取欄位名稱
        const columnName = hotInstance
            .getColHeader(selectedColumn)
            .replace(/<div.*?>|<\/div>/g, "");

        // 如果 columnName 無效，提前結束
        if (!columnName) {
            console.error("Column name is not valid");
            return;
        }

        // console.log(columnName);
        $(".col-content").addClass("d-none");
        $(".text-facet-button").prop("disabled", true);
        $("#text-filter-waring").removeClass("d-none");
        $(".accordion-table").addClass("disabled-table");
        textFilterContent(columnName);
    });

    // 點擊事件：欄位內容對調
    $(".column-swap-button").click(function () {
        const tableName = $(this).data("name");
        const containerID = "grid-" + tableName;
        const hotInstance = handsontableInstances[containerID];
        // 檢查 hotInstance 是否存在
        if (!hotInstance) {
            console.error(
                "HotInstance not found for container ID:",
                containerID
            );
            return;
        }

        // 獲取欄位名稱
        const columnName = hotInstance
            .getColHeader()
            .map(item => item.replace(/<div.*?>|<\/div>/g, ""))

        // 如果 columnName 無效，提前結束
        if (!columnName) {
            console.error("There is no column name in table");
            return;
        }

        // 獲取欄位名稱
        const selectedColumnName = hotInstance
            .getColHeader(selectedColumn)
            .replace(/<div.*?>|<\/div>/g, "");

        // 如果 selectedColumnName 無效，提前結束
        if (!selectedColumnName) {
            console.error("Column name is not valid");
            return;
        }

        columnContentSwap(columnName, selectedColumnName);
    });

    // 按鈕功能：串接物種 API
    $(".fetch-species-api-button").click(function () {
        const tableName = $(this).data("name");
        const containerID = "grid-" + tableName;
        const hotInstance = handsontableInstances[containerID];
        // 檢查 hotInstance 是否存在
        if (!hotInstance) {
            console.error(
                "HotInstance not found for container ID:",
                containerID
            );
            return;
        }

        // 獲取欄位名稱
        const columnName = hotInstance
            .getColHeader()
            .map(item => item.replace(/<div.*?>|<\/div>/g, ""))

        // 如果 columnName 無效，提前結束
        if (!columnName.includes('scientificName')) {
            alert('資料表中沒有 scientificName 欄位，無法使用此功能')
            return;
        }

        fetchSpeicesAPI();

        const socket = io('http://127.0.0.1:5555'); 

        socket.on('connect', () => {
            console.log('SocketIO connection established.');
        });

        socket.on('update', (data) => {
            console.log(data);
            try {
                const { progress, total, status } = data;
        
                const progressBar = $('#progress-bar');
                const statusText = $('#status-text');
        
                // 計算進度百分比
                const percentage = (progress / total) * 100;
        
                // 更新進度條與文字
                progressBar.val(percentage);  // 更新進度條
                statusText.text(`狀態: ${status}，進度：${progress}/${total}`);  // 更新狀態文字
            } catch (error) {
                console.error('Error parsing SocketIO message:', error);
            }
        });
    });

    $(document).on("click", ".fetch-species-api-button-container button", function () {
        $(".loader-wrapper").removeClass("d-none");
        const tableName = $("ul.tab-title li.active").data("name");
        const currentPage = $(
            `#pages-grid-${tableName} #current-page-btn`
        ).text();
        $.ajax({
            type: "PATCH",
            url: "/data-clearance/species_api",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify({
                project_id: projectID,
                table_name: tableName,
            }),
            success: function (response) {
                if (response.error) {
                    alert(response.error);
                } else {
                    // 重新載入分頁內容
                    window.location.reload();
                    loadPage(currentPage);

                    if (response.alert && response.alert.length > 0) {
                        alert(`${response.alert} 無法獲取物種資訊`)
                    }

                    console.log(response.success);
                }
                $(".loader-wrapper").addClass("d-none");
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error: " + errorThrown);
                $(".loader-wrapper").addClass("d-none");
            },
        });
    });

    $(document).on("click", ".xx-fetch-species-api", function (event) {
        $(".fetch-species-api").addClass("d-none");
    });

    $(document).on("click", ".text-filter-search", function () {
        const filterValue = $("#text-filter-input").val();

        if (filterValue) {
            loadPage(1);
        }
    });

    $(document).on("click", ".xx-text-filter", function (event) {
        $(".col-content-text-filter").addClass("d-none");
        $(".text-facet-button").prop("disabled", false);
        $("#text-filter-waring").addClass("d-none");
        $(".accordion-table").removeClass("disabled-table");
        loadPage(1);
    });

    $(document).on("click", ".xx-column-swap", function (event) {
        $(".col-content-swap").addClass("d-none");
    });

    $(document).on("click", "#column-swap-confirm-button", function (event) {
        $(".loader-wrapper").removeClass("d-none");
        const swapColumn1 = $('#column-swap-div').text();
        const swapColumn2 = $('#column-swap-select').find('option:selected').text();
        const tableName = $("ul.tab-title li.active").data("name");
        const currentPage = $(
            `#pages-grid-${tableName} #current-page-btn`
        ).text();

        $.ajax({
            type: "PATCH",
            url: "/data-clearance/column_swap",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify({
                project_id: projectID,
                table_name: tableName,
                column_name_1: swapColumn1,
                column_name_2: swapColumn2
            }),
            success: function (response) {
                if (response.error) {
                    alert(response.error);
                } else {
                    // 重新載入分頁內容
                    loadPage(currentPage);

                    console.log(response.success);
                }
                $(".loader-wrapper").addClass("d-none");
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error: " + errorThrown);
                $(".loader-wrapper").addClass("d-none");
            },
        });

        console.log(swapColumn1, swapColumn2)
    });

    $(document).on("click", ".accordion-table tbody tr", function () {
        const rowItem = $(this);
        const rowIndex = rowItem.find("td:first").text();
        // console.log(rowIndex);

        // 計算該 rowIndex 落在哪一個分頁
        const paginationNumber = Math.ceil(rowIndex / 20);
        // console.log(paginationNumber);

        // 轉跳分頁
        loadPage(paginationNumber);
    });

    $(".save-result-btn").click(function () {
        const exportUrl = `/data-validation/download_all?project_id=${projectID}`;
        window.location.href = exportUrl; // 直接跳轉，觸發文件下載
    });

    $(".back-btn").click(function () {
        window.history.back();
    });

    // 按鈕事件：下一步（再次驗證，轉跳到資料驗證頁面）
    $(".validate-btn").click(function () {
        validateData();
    });

    $(document).on("change", "#blur-search, #regex-search", function () {
        if ($(this).prop("checked")) {
            // 找到另一個 checkbox，並取消勾選
            $("#blur-search, #regex-search").not(this).prop("checked", false);
        }
    });
});

function getTextFacetData(tableName, selectedColumn) {
    const containerID = "grid-" + tableName;
    const hotInstance = handsontableInstances[containerID];
    if (hotInstance) {
        const columnName = hotInstance
            .getColHeader(selectedColumn)
            .replace(/<div.*?>|<\/div>/g, "");
        $.ajax({
            type: "GET",
            url: `/data-clearance/text_facet?project_id=${projectID}&table_name=${tableName}&column_name=${columnName}`,
            contentType: "application/json;charset=UTF-8",
            success: function (response) {
                if (response.error) {
                    alert(response.error);
                } else {
                    updateColContent(columnName, response);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error: " + errorThrown);
            },
        });
    }
}

function clearAllHighlights(containerID) {
    /*** 
    功能：
    清空所有 handsontable 中的 highligts

    參數說明：
    containerID: html 上 handsontable 實例的容器 ID
    ***/
    const hotInstance = handsontableInstances[containerID];
    const totalRows = hotInstance.countRows();
    const totalCols = hotInstance.countCols();
    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            hotInstance.removeCellMeta(r, c, "className");
        }
    }
}

function getRowIndexInPage(currentPageNumber) {
    /*** 
    功能：
    取得需要渲染的 rowIndex 範圍，回傳起始與結束 rowIndex

    參數說明：
    currentPageNumber: 當前分頁的頁碼
    ***/
    const startIndex = (currentPageNumber - 1) * 20 + 1; // 計算範圍起點
    const endIndex = currentPageNumber * 20; // 計算範圍終點
    return { startIndex, endIndex };
}

function highlightRowsInPage(
    containerID,
    errorrMessageID,
    startIndex,
    endIndex
) {
    /*** 
    功能：
    根據錯誤訊息中的 Index 逐一渲染需要 highlight 的 row

    參數說明：
    containerID: html 上 handsontable 實例的容器 ID
    errorrMessageID: html 上錯誤訊息的容器 ID
    startIndex: 渲染範圍起點
    endIndex: 渲染範圍終點
    ***/
    const processedRows = new Set();
    $(`#${errorrMessageID} .accordion-table`).each(function () {
        $(this)
            .find("tbody tr")
            .filter(function () {
                const rowHeaderIndex = parseInt(
                    $(this).find("td:first-child").text(),
                    10
                );
                return (
                    rowHeaderIndex >= startIndex &&
                    rowHeaderIndex <= endIndex &&
                    !processedRows.has(rowHeaderIndex) // 篩選未處理過的 row
                );
            })
            .each(function () {
                const row = $(this);
                const rowHeaderIndex = parseInt(
                    row.find("td:first-child").text(),
                    10
                );
                // console.log(rowIndex);
                processedRows.add(rowHeaderIndex); // 標記處理過的 row

                highlightRow(containerID, rowHeaderIndex);
            });
    });
}

function highlightRow(containerID, rowHeaderIndex) {
    /*** 
    功能：
    逐一渲染需要 highlight 的 row

    參數說明：
    containerID: html 上 handsontable 實例的容器 ID

    rowHeaderIndex: 使用者在 hadsontable 上實際看到的列索引
    rowInstanceIndex: handsontable 實例背後的列索引 
    ***/
    const hotInstance = handsontableInstances[containerID];

    // 取得表格的總行數與總列數
    const totalRows = hotInstance.countRows();
    const totalCols = hotInstance.countCols();

    // 找到列標頭（rowHeaderIndex）對應的 handsontable 實例的列（rowInstanceIndex）索引
    let rowInstanceIndex = null;
    for (let r = 0; r < totalRows; r++) {
        if (hotInstance.getRowHeader(r) === rowHeaderIndex) {
            rowInstanceIndex = r;
            break;
        }
    }

    // 以 row 為單位渲染整列的表格
    for (let col = 0; col < totalCols; col++) {
        if (typeof rowInstanceIndex === "number" && rowInstanceIndex >= 0) {
            hotInstance.setCellMeta(
                rowInstanceIndex,
                col,
                "className",
                "highlight-cell"
            );
        } else {
            return;
        }
    }

    hotInstance.render();
}

function processHighlight(containerID, tableName, currentPageNumber) {
    const errorrMessageID = tableName + "-error-message";

    clearAllHighlights(containerID);

    const { startIndex, endIndex } = getRowIndexInPage(currentPageNumber);

    highlightRowsInPage(containerID, errorrMessageID, startIndex, endIndex);
}

function loadPage(pageNumber) {
    const active_table_name = $("ul.tab-title li.active").data("name"); // 取得當前活動的表格名稱
    $(".loader-wrapper").removeClass("d-none");
    const isTextFilterDisabled = $(".col-content-text-filter").hasClass(
        "d-none"
    ); // 判斷文字篩選是否關閉，true 為關閉，false 為開啟
    const columnName = isTextFilterDisabled
        ? ""
        : $(".col-content-text-filter .col-name").text();
    const filterValue = isTextFilterDisabled
        ? ""
        : $("#text-filter-input").val();
    const blurSearch = $("#blur-search").prop("checked");
    const regexSearch = $("#regex-search").prop("checked");

    const params = new URLSearchParams({
        project_id: projectID,
        page: pageNumber,
        per_page: 20,
        column_name: columnName,
        filter_value: filterValue,
        blur_search: blurSearch,
        regex_search: regexSearch,
    });

    const url = `http://127.0.0.1:5555/data-edit/pagination?${params.toString()}`;

    $.ajax({
        type: "GET",
        url: url,
        contentType: "application/json;charset=UTF-8",
        success: function (response) {
            // 根據 active_table_name 獲取對應的資料
            let paginationData = response[active_table_name];
            tableDataFromDB = paginationData.data;
            const rowIndexes = paginationData.row_index;
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
                    const rowIndex = rowIndexes[row]; // 根據 row 來獲取對應的 row_index
                    return rowIndex ? rowIndex : startIndex + row + 1;
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

            processHighlight(
                containerID,
                active_table_name,
                paginationData.current_page
            );
            $(".loader-wrapper").addClass("d-none");
        },
        error: function (response) {
            console.error(response);
            $(".loader-wrapper").addClass("d-none");
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
                } else {
                    return {};
                }
            }),

            minRows: 0,
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
    }

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

function updateColContent(colName, colData) {
    if (colData && colData.length > 0) {
        $(".col-content").removeClass("d-none");

        var htmlContent =
            '<div class="xx-text-facet function-panel-xx">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
            '<g id="Group_789" data-name="Group 789" transform="translate(-1679 -599)">' +
            '<g id="Group_712" data-name="Group 712" transform="translate(-133.5 164.5)">' +
            '<line id="Line_1" data-name="Line 1" x1="12" y2="12" transform="translate(1824.5 446.5)" ' +
            'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
            '<line id="Line_2" data-name="Line 2" x2="12" y2="12" transform="translate(1824.5 446.5)" ' +
            'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
            '</g></g></svg></div><p>內容篩選</p><div class="col-name">' +
            colName +
            "</div>" +
            '<div class="text-facet-warning-text">（點選以下內容可做批次修改）</div>';

        colData.forEach(function (data) {
            htmlContent +=
                '<li class="facet-content text-facet-content"><span>' +
                data.value +
                '</span><span class="text-facet-content-number"> ' +
                data.count +
                "</span></li>";
        });

        htmlContent += "</ul>";

        $(".col-content").html(htmlContent);
    } else {
        // console.log('no data');
        $(".col-content").html("No Data");
    }
}

function duplicateFacetContent(colName, colData) {
    if (colData && colData.length > 0) {
        $(".col-content").removeClass("d-none");
        var elementCounts = {};

        colData.forEach(function (value) {
            elementCounts[value] = (elementCounts[value] || 0) + 1;
        });

        var htmlContent =
            '<p>重複值篩選</p><div class="col-name">' + colName + "</div><ul>";

        var trueCount = 0;
        var falseCount = 0;

        for (var element in elementCounts) {
            if (elementCounts.hasOwnProperty(element)) {
                var count = elementCounts[element];

                if (count === 1) {
                    trueCount += count;
                } else {
                    falseCount += count;
                }
            }
        }

        htmlContent +=
            '<li class="facet-content text-facet-content"><span>true</span><span class="text-facet-content-number"> ' +
            trueCount +
            "</span></li>";
        htmlContent +=
            '<li class="facet-content text-facet-content"><span>false</span><span class="text-facet-content-number"> ' +
            falseCount +
            "</span></li>";

        htmlContent += "</ul>";

        $(".col-content").html(htmlContent);
    } else {
        // console.log('no data');
        $(".col-content").html("No Data");
    }
}

function textFilterContent(colName) {
    $(".col-content-text-filter").removeClass("d-none");

    var htmlContent =
        '<div class="xx-text-filter function-panel-xx">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
        '<g id="Group_789" data-name="Group 789" transform="translate(-1679 -599)">' +
        '<g id="Group_712" data-name="Group 712" transform="translate(-133.5 164.5)">' +
        '<line id="Line_1" data-name="Line 1" x1="12" y2="12" transform="translate(1824.5 446.5)" ' +
        'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
        '<line id="Line_2" data-name="Line 2" x2="12" y2="12" transform="translate(1824.5 446.5)" ' +
        'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
        '</g></g></svg></div><p>文字篩選</p><div class="col-name">' +
        colName +
        "</div>" +
        '<div class="search-mode-warning-text">（若無勾選以下任一搜尋模式，預設為精準搜尋）</div>' +
        '<div class="search-mode-container">' +
        '<input type="checkbox" id="blur-search">' +
        '<label for="blur-search">模糊搜尋</label>' +
        "</div>" +
        '<div class="search-mode-container">' +
        '<input type="checkbox" id="regex-search">' +
        '<label for="regex-search">正則表達式搜尋</label>' +
        "</div>";

    htmlContent +=
        '<div class="text-filter-function-container">' +
        '<input id="text-filter-input" type="text" placeholder="輸入欲篩選內容" />' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="text-filter-search" viewBox="0 0 16 16">' +
        '<path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" stroke-width="2"/>' +
        "</svg>" +
        "</div>";

    $(".col-content-text-filter").html(htmlContent);
}

//功能畫面：欄位內容對調
function columnContentSwap(colName, selectedColumnName) {
    $(".col-content-swap").removeClass("d-none");

    const selectOptions = colName.map(name => {
        return `<option value="${name}">${name}</option>`;
    }).join("");

    var htmlContent =
        '<div class="xx-column-swap function-panel-xx">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
        '<g id="Group_789" data-name="Group 789" transform="translate(-1679 -599)">' +
        '<g id="Group_712" data-name="Group 712" transform="translate(-133.5 164.5)">' +
        '<line id="Line_1" data-name="Line 1" x1="12" y2="12" transform="translate(1824.5 446.5)" ' +
        'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
        '<line id="Line_2" data-name="Line 2" x2="12" y2="12" transform="translate(1824.5 446.5)" ' +
        'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
        '</g></g></svg></div><p>欄位內容對調</p><div class="col-name">' +
        selectedColumnName +
        "</div>" +
        '<div class="column-swap-warning-text">（請利用欄位2下拉選單選擇要對調的欄位名稱）</div>';

        htmlContent +=
            '<div class="column-swap-button-container">' +
            '<div class="column-swap-div">欄位1</div>' +
            `<div id="column-swap-div">${selectedColumnName}</div>` +
            '<div id="column-swap-icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down-up" viewBox="0 0 16 16">' +
            '<path fill-rule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5m-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5"/>' +
            '</svg>' +
            "</div>" +
            '<div class="column-swap-div">欄位2</div>' +
            `<select id="column-swap-select">${selectOptions}</select>` +
            "</div>" +
            '<button id="column-swap-confirm-button">確認對調</button>';
    
    $(".col-content-swap").html(htmlContent);
}

//功能畫面：串接物種 API
function fetchSpeicesAPI() {
    $(".fetch-species-api").removeClass("d-none");

    var htmlContent =
        '<div class="xx-fetch-species-api function-panel-xx">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
        '<g id="Group_789" data-name="Group 789" transform="translate(-1679 -599)">' +
        '<g id="Group_712" data-name="Group 712" transform="translate(-133.5 164.5)">' +
        '<line id="Line_1" data-name="Line 1" x1="12" y2="12" transform="translate(1824.5 446.5)" ' +
        'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
        '<line id="Line_2" data-name="Line 2" x2="12" y2="12" transform="translate(1824.5 446.5)" ' +
        'fill="none" stroke="#2B59C3" stroke-linecap="round" stroke-width="2"/>' +
        '</g></g></svg></div><p>串接物種 API</p><div class="col-name">' +
        'scientificName' +
        "</div>" +
        '<div class="fetch-species-warning-text">- 根據 scientificName 欄位的內容，串接 TaiCOL API 獲取物種的上階層分類資訊，並將結果新增至資料表中</div>' +
        '<div class="fetch-species-warning-text">- 分類資訊以 TaiCOL 為優先。若 TaiCOL API 無法配對該物種，則改以 GBIF API 進行查詢補充</div>' +
        '<div id="progress-container">' +
        '<progress id="progress-bar" value="0" max="100"></progress>' +
        '<div id="status-text">串接 API 進度</div>' +
        '</div>';

        htmlContent +=
            '<div class="fetch-species-api-button-container">' +
            "<button id='taicol'>串接</button>" +
            "</div>";
    
    $(".fetch-species-api").html(htmlContent);
}


// 功能：把編輯表格的資料傳遞到後端
function transferDataToBackend(templateNames, colHeader, colData) {
    const { projectID, projectName, isEdit } = getProjectParamsFromUrl();
    $.ajax({
        type: "POST",
        url: "/data-edit/transfer",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            table_name: templateNames,
            table_header: colHeader,
            table_data: colData,
            project_id: projectID,
        }),
        success: function (data) {
            console.log("System: Data submitted");
            $("#download-result").click();
        },
        error: function () {
            // $('.unknown-error-popup').removeClass('d-none');
            console.error("System: Fail to submit data");
        },
    });
}

function validateData() {
    const { projectID, projectName, isEdit } = getProjectParamsFromUrl();
    $.ajax({
        type: "POST",
        url: "/data-edit/validate",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            custom_terms: customTermsData,
            project_id: projectID,
        }),
        success: function (response) {
            if (response.success) {
                $(".loader-wrapper").addClass("d-none");
                console.log("System: Data submitted");
                // 完成後轉跳到資料驗證頁面
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

function getProjectParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        projectID: urlParams.get("project_id"),
        projectName: urlParams.get("project_name"),
        isEdit: urlParams.get("edit"),
    };
}
