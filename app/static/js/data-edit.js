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
var tableContentFromDB;
var dataContentFromDB = [];

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
            tableContentFromDB = response.table_content;
            // console.log(tableContentFromDB);
            console.log(isEdit);
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
            // if (getAllRequest.result && getAllRequest.result.length > 0) {
            //     getAllRequest.result.forEach(function (item) {
            //         // console.log(item);
            //         const containerID = "grid-" + item.template_name;
            //         const checkboxNames = item.checkbox_names;
            //         const data = [checkboxNames].concat(item.data);

            //         $("#" + containerID).html("");
            //         initializeHandsontable(containerID, checkboxNames, data, customTermsData);
            //         console.log(
            //             "IndexedDB: Render saved_data,",
            //             item.template_name
            //         );
            //     });
            // } else {
            //     console.log("IndexedDB: No saved_data yet");
            // }
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

        if (isEdit === "1") {
            // console.log('containerID:' + containerID)
            // console.log('checkbox_names:' + checkboxArrays[templateName])
            // console.log('data:' + tableContentFromDB[templateName].data)
            dataContentFromDB = [
                tableContentFromDB[templateName].checkbox_names,
                ...tableContentFromDB[templateName].data,
            ];
            initializeHandsontable(
                containerID,
                tableContentFromDB[templateName].checkbox_names,
                dataContentFromDB,
                customTermsData
            );
        } else {
            initializeHandsontable(
                containerID,
                checkboxArrays[templateName],
                null,
                customTermsData
            );
        }
    });

    if (parsedImportDataFromBackend && parsedTemplateName) {
        var dataName = parsedTemplateName;
        const containerID = "grid-" + dataName;
        var checkboxNames = checkboxArrays[dataName];
        // console.log(checkboxNames);
        if (
            JSON.stringify(parsedImportDataFromBackend[0]) ===
            JSON.stringify(checkboxNames)
        ) {
            $("#" + containerID).html("");
            initializeHandsontable(
                containerID,
                checkboxNames,
                parsedImportDataFromBackend,
                customTermsData
            );
        } else {
            $(".columns-issue-popup").removeClass("d-none");
        }
    }

    // 按鈕事件：新增列在表格底部
    $(".add-row-button").click(function () {
        window.addRow = function (containerID, insertRowNumber) {
            const hotInstance = handsontableInstances[containerID];
            if (!hotInstance) {
                console.error(
                    "Handsontable instance for containerID '" +
                        containerID +
                        "' not found."
                );
                return;
            }

            const totalRows = hotInstance.countRows();
            if (insertRowNumber && !isNaN(insertRowNumber)) {
                // 檢查 insertRowNumber 是否為有效的數字
                hotInstance.alter(
                    "insert_row_below",
                    totalRows,
                    insertRowNumber
                );
            } else {
                console.error("Invalid insertRowNumber:", insertRowNumber);
            }
        };

        var buttonID = $(this).attr("id");
        var dataName = $(this).data("name");
        // console.log('點擊的按鈕的ID為:', buttonID);
        // console.log('點擊的按鈕的dataName為:', dataName);

        const inputID = "insert-row-number-" + dataName;
        const insertRowNumber = $("#" + inputID).val();
        const containerID = "grid-" + dataName;

        if (handsontableInstances[containerID]) {
            // 確保 containerID 的 Handsontable 實例存在
            window.addRow(containerID, insertRowNumber);
        } else {
            console.error(
                "Handsontable instance for containerID '" +
                    containerID +
                    "' not found."
            );
        }
    });

    // 按鈕事件：
    $(".get-data-col-button").click(function () {
        window.getDataCol = function (containerID, selectedColumn) {
            if (
                typeof selectedColumn !== "undefined" &&
                selectedColumn.length !== 0
            ) {
                // console.log(selectedColumn);
                const colData =
                    handsontableInstances[containerID].getDataAtCol(
                        selectedColumn
                    );
                var colName =
                    handsontableInstances[containerID].getColHeader(
                        selectedColumn
                    );
                colName = colName.replace(/<div.*?>|<\/div>/g, "");
                // console.log(colData);
                // console.log(colName);
                updateColContent(colName, colData);
            } else {
                $(".duplicated-popup").removeClass("d-none");
            }
            selectedColumn = undefined; // 事件觸發之後重置 index
        };

        var buttonID = $(this).attr("id");
        var dataName = $(this).data("name");
        // console.log('點擊的按鈕的ID為:', buttonID);
        // console.log('點擊的按鈕的dataName為:', dataName);

        const containerID = "grid-" + dataName;
        if (handsontableInstances[containerID]) {
            // 確保 containerID 的 Handsontable 實例存在
            // console.log(selectedColumn);
            window.getDataCol(containerID, selectedColumn);
        } else {
            console.error(
                "Handsontable instance for containerID '" +
                    containerID +
                    "' not found."
            );
        }
    });

    $(".export-button").click(function () {
        var buttonID = $(this).attr("id");
        var dataName = [$(this).data("name")];
        // console.log("點擊的按鈕的ID為:", buttonID);
        // console.log("點擊的按鈕的dataName為:", dataName);

        const containerID = "grid-" + dataName;
        var colHeader = [];
        var colData = [];

        // 獲取表格資料
        var getData = handsontableInstances[containerID].getData();
        var getHeader = handsontableInstances[containerID].getColHeader();

        getHeader = getHeader.map(function (header) {
            return header.replace(/<div.*?>|<\/div>/g, "");
        });

        colData.push(getData);
        colHeader.push(getHeader);

        // console.log("templateName: ", dataName);
        // console.log("colHeader: ", colHeader);
        // console.log("colData: ", colData);

        transferExportDataToBackend(dataName);
    });

    $(".import-button").click(function () {
        var dataName = $(this).data("name");

        const containerID = "grid-" + dataName;
        var checkboxNames = checkboxArrays[dataName];
        $("#import-file").click();
        $("#import-file").on("change", function () {
            var inputCSV = $(this)[0];
            if (inputCSV.files.length > 0) {
                // 檢查是否選擇文件
                var formData = new FormData();
                formData.append("file", inputCSV.files[0]); // 將選擇的文件以 file 這個名稱傳遞給後端
                formData.append("template_name", dataName);
                formData.append("checkbox_names", checkboxNames);

                $.ajax({
                    type: "POST",
                    url: "/data-edit/import",
                    contentType: false,
                    processData: false,
                    data: formData,
                    success: (data) => {
                        // 嘗試轉跳到另一個頁面處理
                        window.location.href = `/data-edit/column_mapping?project_name=${encodeURIComponent(
                            projectName
                        )}&project_id=${encodeURIComponent(projectID)}`;

                        // if (
                        //     JSON.stringify(data[0]) ===
                        //     JSON.stringify(checkboxNames)
                        // ) {
                        //     $("#" + containerID).html("");
                        //     initializeHandsontable(
                        //         containerID,
                        //         checkboxNames,
                        //         data,
                        //         customTermsData
                        //     );
                        // } else {
                        //     $(".columns-issue-popup").removeClass("d-none");
                        // }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        alert("匯入資料表發生錯誤");
                        console.log("Error:", textStatus, errorThrown);
                    },
                });
            }
        });
    });

    // 按鈕事件：下一步（獲取表格資料，轉跳到資料驗證頁面）
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

        // // 獲取表格資料
        // window.getData = function (containerID) {
        //     var getData = handsontableInstances[containerID].getData();
        //     var getHeader = handsontableInstances[containerID].getColHeader();
        //     colData.push(getData);
        //     colHeader.push(getHeader);
        // };

        // $('.tab-inner').each(function() {
        //     var templateName = $(this).attr('id');
        //     templateNames.push(templateName);
        //     console.log(templateNames);

        //     var containerID = 'grid-' + templateName
        //     window.getData(containerID);
        //     addToIndexedDB(templateName, getHeader, getData)
        // });

        // addToIndexedDB(templateName, checkboxNames, data)
    });

    // 按鈕事件：上一步
    $(".back-btn").click(function () {
        // window.history.back();
        window.location.replace(document.referrer);
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

    $.ajax({
        type: "POST",
        url: "/data-edit/validate", // 給 process-validation 處理驗證過程
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            table_name: templateNames,
            // table_header: colHeader,
            project_id: projectID,
            custom_terms: customTermsData,
        }),
        success: function () {
            console.log("System: Data submitted");
            window.location.href = `/data-validation/?project_name=${projectName}&project_id=${projectID}&edit=${isEdit}`; // 轉跳到 data-validation 呈現驗證結果
        },
        error: function () {
            $(".unknown-error-popup").removeClass("d-none");
            console.error("System: Fail to submit data");
        },
    });
}

function transferExportDataToBackend(templateNames) {
    const { projectID, projectName, isEdit } = getProjectParamsFromUrl();

    $.ajax({
        type: "POST",
        url: "/data-edit/transfer",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            table_name: templateNames,
            project_id: projectID,
        }),
        success: function (data) {
            console.log("System: Data submitted");
            $("#export-result").click();
        },
        error: function () {
            $(".unknown-error-popup").removeClass("d-none");
            console.error("System: Fail to submit data");
        },
    });
}

// 功能：處理 按鈕事件：獲取行資訊 的細節
function updateColContent(colName, colData) {
    if (colData && colData.length > 0) {
        $(".col-content").removeClass("d-none");
        var elementCounts = {};

        // 計算每個數值的出現次數
        colData.forEach(function (value) {
            elementCounts[value] = (elementCounts[value] || 0) + 1;
        });

        // 生成 HTML
        var htmlContent = '<div class="col-name">' + colName + "</div><ul>";
        for (var element in elementCounts) {
            if (elementCounts.hasOwnProperty(element)) {
                htmlContent +=
                    '<li class="facet-content"><span>' +
                    element +
                    '</span><span class="facet-content-number"> ' +
                    elementCounts[element] +
                    "</span></li>";
            }
        }
        htmlContent += "</ul>";

        $(".col-content").html(htmlContent);
    } else {
        // console.log('no data');
        $(".col-content").html("No Data");
    }
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
                        type: "numeric",
                    };
                } else if (name === "decimalLatitude") {
                    return {
                        type: "numeric",
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
            renderAllRows: false, // 設定此值為 false 確保虛擬渲染只渲染可見範圍
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: true,
            // dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: [
                "row_above",
                "row_below",
                "---------",
                "remove_row",
                "---------",
                "undo",
                "redo",
                "---------",
                "make_read_only",
                "---------",
                "copy",
                "cut",
            ],
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
                        type: "numeric",
                    };
                } else if (name === "decimalLatitude") {
                    return {
                        type: "numeric",
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
            startRows: 5,
            rowHeaders: true,
            width: "100%",
            height: "auto",
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: true,
            // dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: [
                "row_above",
                "row_below",
                "---------",
                "remove_row",
                "---------",
                "undo",
                "redo",
                "---------",
                "make_read_only",
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

        // 檢查日期的有效性
        function isValidDate(dateStr) {
            const ISO2014 = /^\d{4}-\d{2}-\d{2}$/; // 1996-11-26
            const ISO2014_var = /^\d{4}-\d{2}$/; // 1996-11
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
                dateRange_var2.test(dateStr)
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

        const jsonData = {};

        allGridIDs.forEach((containerID) => {
            // const containerID = container.id;
            const tableName = containerID.replace("grid-", "");
            // const hotInstance = Handsontable.getInstance(container);
            const tableData = handsontableInstances[containerID].getData();
            const tableHeader =
                handsontableInstances[containerID].getColHeader();
            const cleanTableHeader = tableHeader.map((header) =>
                header.replace(/<div.*?>|<\/div>/g, "")
            );

            jsonData[tableName] = {
                checkbox_names: cleanTableHeader,
                data: tableData,
            };
        });

        // console.log(jsonData);

        $.ajax({
            type: "PATCH",
            url: "/data-edit/autosave",
            data: JSON.stringify({
                project_id: projectID,
                table_content: jsonData,
            }),
            contentType: "application/json;charset=UTF-8",
            success: function () {
                $("#autosave-status").text("（已存檔）");
            },
            error: function (response) {
                console.error(response.responseJSON.error);
            },
        });
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
            var rowCount = hot.countRows();
            $("#row-count-" + containerID).text("當前表格列數：" + rowCount);
            // console.log('CHANGED!')
            // saveTableContent(containerID);
            $("#autosave-status").text("（儲存中．．．）");
            debouncedSaveTableContent();
        },
        afterCreateRow: function () {
            // 更新列數
            var rowCount = hot.countRows();
            $("#row-count-" + containerID).text("當前表格列數：" + rowCount);
        },
        afterRemoveRow: function () {
            // 更新列數
            var rowCount = hot.countRows();
            $("#row-count-" + containerID).text("當前表格列數：" + rowCount);
        },
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
