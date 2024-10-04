var allCheckedCheckboxNames = [];
var coreCheckedCheckboxNames = [];
// var extensionCheckedcheckboxNames = [];
var CheckedcheckboxNames = {};
var TemplateNames = [];
var customColumns = [];

var CORE_TEXT_VALUE_MAP = {
    "資料集類型欄位：Checklist 物種名錄": "checklist",
    "資料集類型欄位：Occurrence 出現紀錄": "occurrence",
    "資料集類型欄位：Sampling Event 調查活動": "samplingevent",
    "資料集類型欄位：其他": "others",
};

var THEME_TEMPALTE_SETS = {
    "ecological-survey": {
        core: "samplingevent",
        extension: "darwin-core-occurrence",
    },
    parasite: {
        core: "occurrence",
        extension: "resource-relationship",
    },
    metabarcoding: {
        core: "occurrence",
        extension: "dna-derived-data",
    },
    ltser: {
        core: "others",
        extension: null,
    },
};

const { projectID, projectName } = getProjectParamsFromUrl();

$(document).ready(function () {
    $("#custom").select2();
    $("#theme").select2();
    $("#core").select2();
    $("#extension").select2();

    $("#custom").on("change", handleCustomChange);

    $("#theme").on("change", function () {
        $(".loader-wrapper").removeClass("d-none");
        $("#requiredFieldset").html("");
        var templateName = $(this).val();
        var templateText = $(this).find("option:selected").text();
        handleThemeChange(templateName, templateText);
    });

    $("#core").on("change", function () {
        $(".loader-wrapper").removeClass("d-none");
        $("#requiredFieldset").html("");
        var templateName = $(this).val();
        var templateText = $(this).find("option:selected").text();
        getCoreTemplate(templateName, templateText);
    });

    $("#extension").on("change", function () {
        $(".loader-wrapper").removeClass("d-none");
        var selectedValues = $(this).val();
        var selectedTexts = $(this)
            .find("option:selected")
            .map(function () {
                return $(this).text().trim();
            })
            .get();
        getExtensionTemplate(selectedValues, selectedTexts);
    });

    // var request = window.indexedDB.open('YourDatabaseName', 1);
    // var db;

    // request.onupgradeneeded = function(event) {
    //     db = event.target.result;

    //     if (!db.objectStoreNames.contains('YourObjectStoreName')) {
    //         db.createObjectStore('YourObjectStoreName', { keyPath: 'datasetKey' }); // 假設您的 JSON 數據有一個名為 'id' 的唯一鍵
    //     }
    // };

    // request.onsuccess = function(event) {
    //     db = event.target.result;

    //     fetch('/get-json-data')
    //     .then(response => response.json())
    //     .then(data => {
    //         console.log(data);
    //         var transaction = db.transaction(['YourObjectStoreName'], 'readwrite');
    //         var objectStore = transaction.objectStore('YourObjectStoreName');

    //         if (typeof data === 'object' && !Array.isArray(data)) {
    //             var transaction = db.transaction(['YourObjectStoreName'], 'readwrite');
    //             var objectStore = transaction.objectStore('YourObjectStoreName');

    //             Object.keys(data).forEach(key => {
    //                 objectStore.add(data[key]);
    //             });
    //         } else {
    //             console.error('Expected an object but received:', data);
    //         }
    //     })
    //     .catch(error => {
    //         console.error('Error reading JSON file:', error);
    //     });
    // };

    // IndexedDB instance
    var request = window.indexedDB.open("IndexedDB", 1);
    var db;

    request.onsuccess = function (event) {
        db = request.result;
        console.log("IndexedDB: Database up");

        var request_clear = db
            .transaction(["saved_data"], "readwrite")
            .objectStore("saved_data")
            .clear();
        request_clear.onsuccess = function (event) {
            console.log("indexedDB: Clear saved_data");
        };
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;

        if (!db.objectStoreNames.contains("col_description")) {
            var objectStore = db.createObjectStore("col_description", {
                keyPath: "name",
            });
            objectStore.createIndex("type", "type", { unique: false });
            objectStore.createIndex("description", "description", {
                unique: false,
            });
            objectStore.createIndex("commonname", "commonname", {
                unique: false,
            });
            objectStore.createIndex("example", "example", { unique: false });
        }

        if (!db.objectStoreNames.contains("saved_data")) {
            var objectStore = db.createObjectStore("saved_data", {
                keyPath: "template_name",
            });
            objectStore.createIndex("data", "data", { unique: false });
        }
    };

    function addToIndexedDB() {
        var transaction = db.transaction(["col_description"], "readwrite");
        var objectStore = transaction.objectStore("col_description");

        $('.checkbox input[type="checkbox"]:checked').each(function () {
            var name = $(this).parents(".checkbox").data("name");
            var type = $(this).parents(".checkbox").data("type");
            var description = $(this).parents(".checkbox").data("description");
            var commonname = $(this).parents(".checkbox").data("commonname");
            var example = $(this).parents(".checkbox").data("example");

            var request = objectStore.put({
                name: name,
                type: type,
                description: description,
                commonname: commonname,
                example: example,
            });

            request.onsuccess = function (event) {
                console.log(`IndexedDB: ${name} write successfully`);
            };

            request.onerror = function (event) {
                console.log(
                    `IndexedDB: ${name} write fail, ${event.target.error}`
                );
            };
        });
    }

    // 滑鼠事件之前隱藏樣式
    $("#description-name").hide();
    $("#description-type").hide();
    $("#description").hide();
    $("#description-commonname").hide();
    $("#description-example").hide();
    $(".description-title").hide();

    // 滑鼠事件：移入欄位顯示對應的說明
    $(
        "#requiredFieldset, #extensionFieldset, #themeFieldset, #customFieldset"
    ).on("mouseenter", ".checkbox", function () {
        const name = $(this).data("name");
        const type = $(this).data("type");
        const description = $(this).data("description");
        const commonname = $(this).data("commonname");
        const example = $(this).data("example");

        if (name) {
            $("#description-name").html(name);
            $("#description-name").show();
            $(".description-title").show();
        }
        if (type) {
            $("#description-type").html(type);
            $("#description-type").show();
            $(".description-title").show();
        }
        if (description) {
            $("#description").html(description);
            $("#description").show();
            $(".description-title").show();
        }
        if (commonname) {
            $("#description-commonname").html(commonname);
            $("#description-commonname").show();
            $(".description-title").show();
        }
        if (example) {
            $("#description-example").html(example);
            $("#description-example").show();
            $(".description-title").show();
        }
    });

    // 從修改自訂欄位切換到新增自訂欄位
    $("#add-column-content-btn").on("click", function () {
        $("#add-column-content-container").removeClass("d-none");
        $("#edit-column-content-container").addClass("d-none");
        $("#add-column-content-btn").addClass("active-function");
        $("#edit-column-content-btn").removeClass("active-function");
        $("#confirm-add-column").addClass("d-none");
        $("#confirm-add-edit-column").removeClass("d-none");
    });

    // 從新增自訂欄位切換到修改自訂欄位
    $("#edit-column-content-btn").on("click", function () {
        $("#edit-column-content-container").removeClass("d-none");
        $("#add-column-content-container").addClass("d-none");
        $("#edit-column-content-btn").addClass("active-function");
        $("#add-column-content-btn").removeClass("active-function");
        $("#confirm-add-column").removeClass("d-none");
        $("#confirm-add-edit-column").addClass("d-none");
        renderCustomTerms();
    });

    // 滑鼠事件：修改自訂欄位中，滑鼠移到欄位名稱上時，右側會顯示對應的詳細資訊
    $("#edit-column-content-left").on(
        "mouseenter",
        ".content-detail",
        function () {
            const name = $(this).data("name");
            const type = $(this).data("type");
            const comment = $(this).data("comment");

            if (type) {
                $("#column-name").html(name);
                $("#column-name").show();
            }
            if (type) {
                $("#column-type").html(type);
                $("#column-type").show();
            }
            if (comment) {
                $("#column-comment").html(comment);
                $("#column-comment").show();
            } else {
                $("#column-comment").html("");
            }
        }
    );

    // 新增自訂欄位到資料表，並加到模板中
    $("#confirm-add-edit-column").on("click", function (event) {
        event.preventDefault();

        var column_name = $('input[name="column_name"]').val();
        var column_type = $('select[name="column_type"]').val();
        var column_comment = $('textarea[name="column_comment"]').val();

        if (column_name && column_type) {
            $.ajax({
                type: "GET",
                url: "/data-template/custom_terms_list",
                contentType: "application/json;charset=UTF-8",
                success: function (data) {
                    // 檢查表中是否有重複名稱的欄位
                    if (data.includes(column_name)) {
                        alert("欄位名稱已經存在，請選擇其他名稱");
                    } else {
                        // 如果欄位名稱不存在，則提交表單
                        var formData = {
                            column_name: column_name,
                            column_type: column_type,
                            column_comment: column_comment,
                        };

                        $.ajax({
                            type: "POST",
                            url: "/data-template/custom_terms",
                            contentType: "application/json",
                            data: JSON.stringify(formData),
                            success: function (response) {
                                console.log("Success:", response);

                                // 新增欄位到模板中
                                var existingFieldset = $(
                                    "#customFieldset fieldset"
                                );
                                var newContent = `
                                    <div class="checkbox" data-name="${column_name}" data-type="使用者自定義類型，${column_type}" data-description="使用者自定義欄位。${column_comment}" data-commonname="" data-example="">
                                        <label>
                                            <input type="checkbox" name="${column_name}" checked />
                                            ${column_name}
                                        </label>
                                    </div>
                                `;

                                if (existingFieldset.length > 0) {
                                    existingFieldset.append(newContent);
                                } else {
                                    var content = `
                                        <fieldset id="customFieldset">
                                            <legend>自訂欄位</legend>
                                            ${newContent}
                                        </fieldset>
                                    `;
                                    $("#customFieldset").html(content);
                                }

                                // 新增欄位成功之後，清掉輸入
                                $('input[name="column_name"]').val("");
                                $('select[name="column_type"]').val("");
                                $('textarea[name="column_comment"]').val("");
                            },
                            error: function (xhr, status, error) {
                                console.error("Error:", status, error);
                            },
                        });
                    }
                },
                error: function (xhr, status, error) {
                    console.error(
                        "Failed to fetch custom terms:",
                        status,
                        error
                    );
                },
            });
        } else {
            alert("請填入欄位名稱與欄位類型");
        }
    });

    // 刪除自訂欄位
    $(document).on("click", ".del-custom-column", function () {
        // 因為 del-custom-column 是動態渲染的元素，將事件綁定到 document 上
        var termID = $(this).closest(".content-detail").data("id");
        deleteCustomTerm(termID);
    });

    // 將自訂欄位加到模板中
    $("#confirm-add-column").on("click", function () {
        var selectedBoxesList = $(
            ".content-detail .column-name input[type='checkbox']:checked"
        )
            .map(function () {
                var parentDiv = $(this).closest(".content-detail");
                return {
                    column_name: parentDiv.data("name"),
                    column_type: parentDiv.data("type"),
                    column_comment: parentDiv.data("comment"),
                    column_id: parentDiv.data("id"),
                };
            })
            .get();

        var existingFieldset = $("#customFieldset fieldset");
        var existingColumns = new Set();

        // 檢查現有的自訂欄位名稱，將其加入到 Set
        existingFieldset.find(".checkbox").each(function () {
            var existingColumnName = $(this).data("name");
            existingColumns.add(existingColumnName);
        });

        var content = "";
        var duplicateColumns = [];

        selectedBoxesList.forEach(function (record) {
            if (!existingColumns.has(record.column_name)) {
                content += `
                    <div class="checkbox" 
                        data-name="${record.column_name}" 
                        data-type="使用者自定義類型，${record.column_type}" 
                        data-description="使用者自定義欄位。${record.column_comment}">
                        <label>
                            <input type="checkbox" class="required-col" 
                                name="${record.column_name}" checked/>
                            ${record.column_name}
                        </label>
                    </div>
                `;
            } else {
                duplicateColumns.push(record.column_name); // 收集重複的欄位名稱
            }
        });

        // 顯示重複的欄位並發出警告
        if (duplicateColumns.length > 0) {
            alert(
                "以下欄位已存在，無法重複加入: " + duplicateColumns.join(", ")
            );
        }

        if (content) {
            if (existingFieldset.length > 0) {
                existingFieldset.append(content);
            } else {
                var newContent = `
                    <fieldset id="customFieldset">
                        <legend>自訂欄位</legend>
                        ${content}
                    </fieldset>
                `;
                $("#customFieldset").html(newContent);
            }
        }
    });

    // 按鈕事件：下載模板
    $(".export-template-btn").on("click", function () {
        updateCheckedCheckboxNames();
        downloadCSV([allCheckedCheckboxNames.join(",")], "example.csv");
    });

    // 按鈕事件：下一步（建立模板，轉跳到編輯資料頁面）
    $(".next-btn").click(function () {
        if ($("#core").val() !== "") {
            var coreTableTerms = collectCoreTableTerms();
            var extensionTableTerms = collectExtensionTableTerms();
            var CustomTerms = collectCustomTerms();
            var extensionFieldsetArray = []; // 延伸資料集抓 fieldset 上 value，因為下拉式選單多選不好抓

            $("#extensionFieldset fieldset").each(function () {
                var value = $(this).attr("value");
                extensionFieldsetArray.push(value);
            });

            var templateNames = {
                資料集類型: [$("#core").val()], // 資料集類型抓下拉選單的值
                延伸資料集: extensionFieldsetArray,
            };

            var allTableTerms = Object.assign(
                {},
                coreTableTerms,
                extensionTableTerms
            );
            addToIndexedDB();
            goDataEditPage(
                allTableTerms,
                templateNames,
                CustomTerms,
                projectName,
                projectID
            );
        } else {
            alert("請至少資料集類型，才能進入下面的步驟");
        }
    });

    $(".column-btn").click(function () {
        $(".custom-columns-popup").removeClass("d-none");
    });

    // 彈出視窗事件：儲存模板
    $(".save-template-btn").on("click", function (event) {
        event.preventDefault();
        $(".save-popup").removeClass("d-none");
    });

    $("#save-btn").on("click", function (event) {
        event.preventDefault();
        var templateTitle = $("#template-name").val();
        var result = buildTemplateData();

        if (!result.hasSelectedColumns) {
            alert("沒有選擇任何欄位！請挑選完欄位之後再儲存模板");
        } else {
            saveCustomTemplate(templateTitle, result.data);
        }
    });

    // 彈出視窗事件：刪除自訂模板
    $("#delete-template-btn").on("click", function (event) {
        $(".delete-template-popup").removeClass("d-none");
        var customTemplateName = $("#custom option:selected").text();
        var text = $("#custom-template-name");
        text.append("" + customTemplateName);
    });

    $("#delete-btn").on("click", function (event) {
        var selectedValue = $("#custom").val();
        deleteCustomTemplate(selectedValue);
    });

    $(".xx").on("click", function (event) {
        $(".popup-container").addClass("d-none");
    });
});

function getCoreTemplate(templateName, templateText) {
    $.ajax({
        type: "GET",
        url: "/data-template/get_template/core",
        data: { value: templateName },
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            $(".loader-wrapper").addClass("d-none");
            var content = "";
            data.forEach(function (record) {
                content += generateColumnHtml(record);
            });

            var fieldset = `<fieldset class="required-fieldset">${content}<legend>資料集類型欄位：${templateText}</legend></fieldset>`;

            $("#requiredFieldset").html(fieldset);
        },
        error: function () {
            $(".loader-wrapper").addClass("d-none");
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}

function getThemeTemplate(templateName, templateText) {
    $.ajax({
        type: "GET",
        url: "/data-template/get_template/theme",
        data: { value: templateName },
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            $(".loader-wrapper").addClass("d-none");
            var content = "";
            data.forEach(function (record) {
                content += generateColumnHtml(record);
            });

            var fieldset = `<fieldset>${content}<legend>主題欄位：${templateText}</legend></fieldset>`;

            $("#themeFieldset").html(fieldset);
        },
        error: function () {
            $(".loader-wrapper").addClass("d-none");
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}

function getExtensionTemplate(selectedValues, selectedTexts) {
    $.ajax({
        type: "GET",
        url: "/data-template/get_template/extension",
        data: { value: JSON.stringify(selectedValues) },
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            $(".loader-wrapper").addClass("d-none");
            var content = "";
            for (var key in data) {
                var keyContent = "";
                data[key].forEach(function (record) {
                    keyContent += generateColumnHtml(record);
                });
                var legendText = selectedTexts[selectedValues.indexOf(key)];
                content += `<fieldset value="${key}">${keyContent}<legend>延伸資料集欄位：${legendText}</legend></fieldset>`;
            }
            $("#extensionFieldset").html(content);
        },
        error: function () {
            console.error("failed");
        },
    });
}

function renderCustomTerms() {
    return $.ajax({
        type: "GET",
        url: "/data-template/custom_terms",
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            var content = "";
            data.forEach(function (record) {
                content += `
                <div class="content-detail"
                    data-id="${record.id}" 
                    data-name="${record.column_name}" 
                    data-type="${record.column_type}" 
                    data-comment="${record.column_comment}"
                >
                    <label class="column-name"><input type="checkbox" name="${record.column_name}">${record.column_name}</label>
                    <sapn class="del-custom-column">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#B91F3E" class="bi bi-trash-fill" viewBox="0 0 20 20">
                            <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                        </svg>
                    </sapn>
                </div>
                `;
            });

            $("#edit-column-content-left").html(content);
        },
        error: function (xhr, status, error) {
            console.error("Failed to fetch custom terms:", status, error);
        },
    });
}

// 功能：array 轉換成 csv 格式
function downloadCSV(data, filename) {
    const csvContent = "," + data.join(",") + "\n\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = $("<a>")
        .attr("href", url)
        .attr("download", filename || "template.csv")
        .appendTo("body");

    a[0].click();
    a.remove();
}

function handleCustomChange() {
    var selectedValue = $(this).val();
    $(".loader-wrapper").removeClass("d-none");
    if ($("#custom option:selected").text() !== "") {
        $("#custom-template-container span:nth-child(2)").removeClass("d-none"); // 如果選擇自訂模板的話，顯示刪除模板的按鈕
        fetchCustomTemplates(selectedValue);
    } else {
        $("#custom-template-container span:nth-child(2)").addClass("d-none");
        location.reload();
    }
}

// 從伺服器獲取模板資料
function fetchCustomTemplates(id) {
    $.ajax({
        type: "GET",
        url: "/data-template/custom_templates/" + id,
        contentType: "application/json;charset=UTF-8",
        success: function (data) {
            $(".loader-wrapper").addClass("d-none");
            processTemplateContent(data.template_content);
        },
        error: function () {
            $(".loader-wrapper").addClass("d-none");
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}

// 處理模板資料
function processTemplateContent(records) {
    // $("#extension").val("simple-multimedia").trigger("change");
    var templateKeys = Object.keys(records); // 取得自訂模板中每一個 fieldset 的 legend
    templateKeys.forEach(function (key) {
        var columns = records[key].columns;
        var content = "";
        columns.forEach(function (column) {
            content += generateColumnHtml(column);
        });
        updateFieldsets(key, content);
    });
}

// 生成欄位 HTML
function generateColumnHtml(column) {
    return `
        <div class="checkbox" 
            data-name="${column.column_name}" 
            data-type="${column.column_type}" 
            data-description="${column.definition_zh}" 
            data-commonname="${column.common_name}" 
            data-example="${column.example}">
            <label>
                <input type="checkbox" class="required-col" 
                    name="${column.column_name}" 
                    ${column.is_required ? "disabled" : ""} 
                    ${column.is_recommended ? "checked" : ""}/>
                ${column.column_name}
            </label>
        </div>
    `;
}

// 更新欄位內容
function updateFieldsets(key, content) {
    const EXTENSION_KEY_TO_VALUES_MAP = {
        "延伸資料集欄位：Darwin Core Occurrence": "darwin-core-occurrence",
        "延伸資料集欄位：Simple Multimedia": "simple-multimedia",
        "延伸資料集欄位： Extended Measurement Or Facts":
            "extended-measurement-or-facts",
        "延伸資料集欄位：Resource Relationship": "resource-relationship",
        "延伸資料集欄位：DNA derived data": "dna-derived-data",
    };
    var fieldset;
    if (
        key === "資料集類型欄位：Checklist 物種名錄" ||
        key === "資料集類型欄位：Occurrence 出現紀錄" ||
        key === "資料集類型欄位：Sampling Event 調查活動" ||
        key === "資料集類型欄位：其他"
    ) {
        fieldset = `<fieldset class="required-fieldset">${content}<legend>${key}</legend></fieldset>`;
        $("#requiredFieldset").html(fieldset);
        var optionValue = CORE_TEXT_VALUE_MAP[key];
        updateSelect2("#core", optionValue);
        $("#core").prop("disabled", true);
        updateSelect2("#theme", "none", "無");
        $("#theme").prop("disabled", true);
        $(".lock-tag").removeClass("d-none");
    } else if (key === "自訂欄位") {
        fieldset = `<fieldset>${content}<legend>${key}</legend></fieldset>`;
        $("#customFieldset").html(fieldset);
    } else if (key.includes("主題欄位")) {
        fieldset = `<fieldset>${content}<legend>${key}</legend></fieldset>`;
        $("#themeFieldset").html(fieldset);
    } else {
        var extensionValue = EXTENSION_KEY_TO_VALUES_MAP[key];
        fieldset = `<fieldset value="${extensionValue}">${content}<legend>${key}</legend></fieldset>`;
        $("#extensionFieldset").html(fieldset);
    }
}

// 更新 Select2
function updateSelect2(selector, value, text) {
    $(selector)
        .val(value)
        .select2("data", { id: value, text: text || value }); // 更新顯示的文本
    $(selector).select2("destroy").select2(); // 重新初始化 Select2
}

function getCustomSelectedColumns(fieldset) {
    var columns = [];

    fieldset.find("input[type=checkbox]:checked").each(function () {
        var column = {
            column_name: $(this).closest(".checkbox").data("name"),
            column_type: $(this).closest(".checkbox").data("type"),
            definition_zh: $(this).closest(".checkbox").data("description"),
            common_name: $(this).closest(".checkbox").data("commonname"),
            example: $(this).closest(".checkbox").data("example"),
            is_required: $(this).is(":disabled") ? 1 : null,
            is_recommended: $(this).is(":checked") ? 1 : null,
        };
        columns.push(column);
    });

    return columns;
}

function buildTemplateData() {
    var data = {};
    var hasSelectedColumns = false;

    $("fieldset").each(function () {
        var legend = $(this).find("legend").text();
        var columns = getCustomSelectedColumns($(this));

        if (columns.length > 0) {
            data[legend] = { columns: columns };
            hasSelectedColumns = true;
        }
    });

    return { data: data, hasSelectedColumns: hasSelectedColumns };
}

function saveCustomTemplate(templateTitle, templateContent) {
    $.ajax({
        type: "POST",
        url: "/data-template/custom_templates",
        data: JSON.stringify({
            template_title: templateTitle,
            template_content: templateContent,
        }),
        contentType: "application/json;charset=UTF-8",
        success: function () {
            alert("儲存自訂模版成功");
            location.reload();
        },
        error: function () {
            $(".loader-wrapper").addClass("d-none");
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}

function deleteCustomTemplate(templateValue) {
    $.ajax({
        type: "DELETE",
        url: `/data-template/custom_templates/${templateValue}`,
        contentType: "application/json;charset=UTF-8",
        success: function () {
            alert("刪除自訂模版成功");
            location.reload();
        },
        error: function () {
            console.error("SYSTEM ALERT: NOT MATCH ANY MODELS");
        },
    });
}

function handleThemeChange(templateName, templateText) {
    var templateSet = THEME_TEMPALTE_SETS[templateName];

    if (templateSet) {
        $("#core").val(templateSet.core).trigger("change");
        if (templateSet.extension) {
            $("#extension").val(templateSet.extension).trigger("change");
        }
        getThemeTemplate(templateName, templateText);
        $("#core").prop("disabled", true);
        $(".lock-tag-core").removeClass("d-none");
    } else {
        location.reload();
    }
}

function deleteCustomTerm(termID) {
    $.ajax({
        type: "DELETE",
        url: `/data-template/custom_terms/${termID}`,
        success: function (response) {
            alert("刪除自訂欄位成功");
            renderCustomTerms();
        },
        error: function (xhr, status, error) {
            console.error("Error:", status, error);
        },
    });
}

function collectCustomTerms() {
    var customTerms = [];
    $("#customFieldset")
        .find("input[type=checkbox]:checked")
        .each(function () {
            customTerms.push($(this).attr("name"));
        });

    return customTerms;
}

function collectCoreTableTerms() {
    var coreTableTerms = {};
    var coreTableFieldsets = [
        $("#requiredFieldset"),
        $("#themeFieldset"),
        $("#customFieldset"),
    ];
    var coreTableName = $("#core").val();
    var columns = [];
    coreTableFieldsets.forEach(function (fieldset) {
        fieldset.find("input[type=checkbox]:checked").each(function () {
            columns.push($(this).attr("name"));
        });
    });
    coreTableTerms[coreTableName] = columns;

    return coreTableTerms;
}

function collectExtensionTableTerms() {
    var extensionTableTerms = {};
    $("#extensionFieldset fieldset").each(function () {
        var fieldsetValue = $(this).attr("value"); // 假設每個 fieldset 都有一個唯一的 id
        var checkedNames = $(this)
            .find(".checkbox input[type='checkbox']:checked")
            .map(function () {
                return $(this).attr("name");
            })
            .get();
        extensionTableTerms[fieldsetValue] = checkedNames;
    });

    return extensionTableTerms;
}

function goDataEditPage(
    allTableTerms,
    templateNames,
    CustomTerms,
    projectName,
    projectID
) {
    $.ajax({
        type: "POST",
        url: "/data-template",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
            checkbox_names: allTableTerms,
            template_names: templateNames,
            custom_columns: CustomTerms,
        }),
        success: function () {
            window.location.href = `/data-edit?project_name=${encodeURIComponent(
                projectName
            )}&project_id=${encodeURIComponent(projectID)}`;
        },
        error: function () {
            console.error("System: Failed to submit data");
        },
    });
}

function getProjectParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        projectID: urlParams.get("project_id"),
        projectName: urlParams.get("project_name"),
    };
}
