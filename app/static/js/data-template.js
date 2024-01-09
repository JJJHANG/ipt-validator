var allCheckedCheckboxNames = [];
var coreCheckedCheckboxNames = [];
// var extensionCheckedcheckboxNames = [];
var CheckedcheckboxNames = {};
var TemplateNames = [];

$(document).ready(function () {
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
    var request = window.indexedDB.open('IndexedDB', 1);
    var db;

    request.onsuccess = function (event) {
        db = request.result;
        console.log('IndexedDB: up');
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
    
        if (!db.objectStoreNames.contains('col_description')) {
            var objectStore = db.createObjectStore('col_description', { keyPath: 'name' });
            objectStore.createIndex('type', 'type', { unique: false });
            objectStore.createIndex('description', 'description', { unique: false });
            objectStore.createIndex('commonname', 'commonname', { unique: false });
            objectStore.createIndex('example', 'example', { unique: false });
        }
    };

    function addToIndexedDB() {
        var transaction = db.transaction(['col_description'], 'readwrite');
        var objectStore = transaction.objectStore('col_description');
        
        $('.checkbox input[type="checkbox"]:checked').each(function () {
            var name = $(this).parents('.checkbox').data('name');
            var type = $(this).parents('.checkbox').data('type');
            var description = $(this).parents('.checkbox').data('description');
            var commonname = $(this).parents('.checkbox').data('commonname');
            var example = $(this).parents('.checkbox').data('example');
    
            var request = objectStore.put({
                name: name,
                type: type, 
                description: description, 
                commonname: commonname,  
                example: example
            });
    
            request.onsuccess = function (event) {
                console.log(`IndexedDB: ${name} write successfully`);
            };
    
            request.onerror = function (event) {
                console.log(`IndexedDB: ${name} write fail, ${event.target.error}`);
            };
        });
    }
    
    // 初始化多選下拉選單
    $('#extension').fSelect();

    // 在頁面加載時讀取儲存的自定模版
    renderSavedOptions()

    // 下拉選單事件：主題下拉選單連動其他選單
    $('#theme').on('change', function() {
        updateDropdown(); // 指定核心以及延伸資料集
        updateFieldsetContent(); // 更新對應的核心欄位內容
        updateExtensionFieldsetContent(); // 更新對應的延伸資料集欄位內容
        updateCheckedCheckboxNames(); // 更新被勾選的欄位名稱
        // handleCheckboxClick(); // 檢查欄位是否重複勾選
    });

    // 下拉選單事件：更新資料集類型的欄位內容
    $('#core').on('change', function() {
        $('.fs-label').text('');
        $('.fs-option').removeClass('selected');
        $('#extensionFieldset').html('');
        CheckedcheckboxNames = {}; // 每換一次核心就清空前一次的數據

        updateFieldsetContent(); // 更新對應的核心欄位內容

        if ($('#custom option:selected').text() !== '') { // 有選擇自訂模板的情況下，再選擇資料集類型時要檢查欄位是否重複
            var coreFieldsetID = $(this).val();
            disableDuplicatedCheckbox(coreFieldsetID);
        }

        updateCheckedCheckboxNames(); // 更新被勾選的欄位名稱
        handelSpecificColumn(); // 處理特定欄位的規則

        // 檢查資料集類型和延伸資料集重複的欄位
        var selectedOptions = $('.fs-option.selected'); 
        selectedOptions.each(function () {
            var extensionFieldsetID = $(this).data('value');
            var target = "#" + extensionFieldsetID + " input[type='checkbox']"
            $(target).prop('disable', false);
            updateExtensionFieldsetContent();
            disableDuplicatedCheckbox(extensionFieldsetID);
        });

        updateCheckedCheckboxNames(); // 更新被勾選的欄位名稱
        // console.log(CheckedcheckboxNames);
    });

    // 下拉選單事件：更新延伸資料集的欄位內容
    $('#extension').on('change', function() {
        checkedExtensionCheckboxNames = [];
        updateExtensionFieldsetContent();
        handelSpecificColumn(); // 處理特定欄位的規則
        // updateCheckedCheckboxNames();

        // 檢查延伸資料集和其他重複的欄位
        if ($('#core option:selected').text() !== '' || $('#custom option:selected').text() !== '') {
            console.log('check duplicates');
            var selectedOptions = $('.fs-option.selected');
            selectedOptions.each(function () {
                var extensionFieldsetID = $(this).data('value');
                var target = "#" + extensionFieldsetID + " input[type='checkbox']"
                $(target).prop('disable', false);
                disableDuplicatedCheckbox(extensionFieldsetID);
            });
        }
        
        // updateCheckedCheckboxNames(); // 更新被勾選的欄位名稱 
    });

    // 下拉選單事件：更新自訂模板的欄位內容
    $('#custom').on('change', function() {
        if ($('#custom option:selected').text() !== '') {
            $('#custom-template-container span:nth-child(2)').removeClass('d-none');
            console.log($('#custom option:selected').text());
        } else {
            $('#custom-template-container span:nth-child(2)').addClass('d-none');
        }
        
        updateCheckedCheckboxNames(); // 更新被勾選的欄位名稱

        if ($('#requiredFieldset').length > 0) { // 只要重選自訂模板，其他的下拉選單一起重置
            $('#core').val('');
            $('.fs-label').text('');
            $('.fs-option').removeClass('selected');
            $('#requiredFieldset').html('');
            $('#extensionFieldset').html('');
        }

        updateFieldsetContent(); // 更新對應的核心欄位內容

        // 檢查自訂模板和延伸資料集重複的欄位
        var selectedOptions = $('.fs-option.selected');
        selectedOptions.each(function () {
            var extensionFieldsetID = $(this).data('value');
            disableDuplicatedCheckbox(extensionFieldsetID);
        });

        updateCheckedCheckboxNames(); // 更新被勾選的欄位名稱
        // handleCheckboxClick(); // 檢查欄位是否重複勾選
    });

    // 滑鼠事件之前隱藏樣式
    $("#description-name").hide();
    $("#description-type").hide();
    $("#description").hide();
    $("#description-commonname").hide();
    $("#description-example").hide();
    $(".description-title").hide();

    // 滑鼠事件：移入欄位顯示對應的說明
    $("#requiredFieldset, #extensionFieldset").on("mouseenter", ".checkbox", function () {
    
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

    $("#requiredFieldset, #extensionFieldset").on("mouseleave", ".checkbox", function () {
        $("#description-name").hide();
        $("#description-type").hide();
        $("#description").hide();
        $("#description-commonname").hide();
        $("#description-example").hide();
        $(".description-title").hide();
    });

    // 按鈕事件：下載模板
    $(".export-template-btn").on("click", function() {
        updateCheckedCheckboxNames()
        downloadCSV([allCheckedCheckboxNames.join(",")], "example.csv");
    });

    // 按鈕事件：下一步（建立模板，轉跳到編輯資料頁面）
    $(".next-btn").click(function () {
        if ($('#core').val() !== '' || $('#custom').val() !== '') { // 檢查有沒有選擇資料集類型，有的話才能下一步
            updateCheckedCheckboxNames();
            getTemplateNames();
            // console.log(TemplateNames);
            // console.log(CheckedcheckboxNames);
            if ($('#custom option:selected').val() == '') {
                addToIndexedDB();
            }

            $.ajax({
                type: 'POST',
                url: '/data-template',
                contentType: 'application/json;charset=UTF-8',
                data: JSON.stringify({ 'checkbox_names': CheckedcheckboxNames, 'template_names': TemplateNames }),
                success: function(data) {
                    console.log("Data submitted.");
                    window.location.href = "/data-edit";
                },
                error: function () {
                    console.error("Failed to submit data.");
                },
            })
        } else {
            $('.required-popup').removeClass('d-none');
        }
    });

    // 按鈕事件：新增欄位（新增自訂欄位到 fieldset）
    var columnType = "";

    $("#custom-column-type").change(function() { // 下拉選單變動時，更新 columnType 的值
        columnType = $("#custom-column-type option:selected").text();
    });

    $(".column-btn").click(function() {
        var columnName = $('.custom-column-input').val();

        if (columnName.length == 0) {
            $('.no-column-name-popup').removeClass('d-none');
        } else if (columnType.length == 0) {
            $('.no-column-type-popup').removeClass('d-none');
        } else { // columnName 和 columnType 都不為空時才新增欄位
            var existingFieldset = $("#customFieldset fieldset");
            if (existingFieldset.length > 0) {
                var newContent = `
                    <div class="checkbox" data-name=${columnName} data-type="自定義 ${columnType}" data-description="使用者自定義欄位" data-commonname="" data-example="">
                        <label>
                            <input type="checkbox" name=${columnName} checked />
                            ${columnName}
                        </label>
                    </div>
                `;
                existingFieldset.append(newContent);
            } else {
                var customfieldsetContent = "";
                customfieldsetContent += `
                <fieldset>
                    <legend>自訂欄位</legend>
                        <div class="checkbox" data-name=${columnName} data-type="自定義 ${columnType}" data-description="使用者自定義欄位" data-commonname="" data-example="">
                            <label>
                                <input type="checkbox" name=${columnName} checked />
                                ${columnName}
                            </label>
                        </div>
                </fieldset>
                `;

                $("#customFieldset").html(customfieldsetContent);
            }   
        }
    });

    // 彈出視窗事件：儲存模板
    $('.save-template-btn').on('click', function (event) {
        event.preventDefault();
        $('.save-popup').removeClass('d-none');
    }) 

    $('#save-btn').on('click', function (event) {
        updateCheckedCheckboxNames();
        console.log(CheckedcheckboxNames);
        const templateName = $('#template-name').val();
        const newOption = $("<option>")
        // .attr('value', CheckedcheckboxNames.join(','))
        .text(templateName);

        localStorage.setItem(templateName, JSON.stringify(CheckedcheckboxNames));

        $('.save-popup').addClass('d-none');
        $('#custom').append(newOption);
    });

    // 彈出視窗事件：刪除自訂模板
    $('#delete-template-btn').on('click', function (event) {
        $('.delete-template-popup').removeClass('d-none');
        var customTemplateName = $('#custom option:selected').text()
        var text = $('#custom-template-name');

        text.append('' + customTemplateName)
    });

    $('#delete-btn').on('click', function (event) {
        var customTemplateName = $('#custom option:selected').text()
        localStorage.removeItem(customTemplateName);
        $('.delete-template-popup').addClass('d-none');
        location.reload();
    });

    $('.xx').on('click', function (event) {
        $('.popup-container').addClass('d-none');
    }) 

    $('#requiredFieldset, #extensionFieldset').on('click', function(event) {
        // 檢查被點擊的元素是否是一個 checkbox
        if($(event.target).is('input[type="checkbox"]')) {
            handleCheckboxClick(event.target);
        }
    });
});

// 功能：處理必選欄位、ID類欄位
function handelSpecificColumn() {
    // required-col: 必填欄位
    // key-col: ID類欄位（eventID, occurrenceID, taxonID）

    $('.required-col').prop('disabled', true);
    $('.key-col').prop('disabled', false);
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

// 功能：讀取瀏覽器上儲存的自訂模板
function renderSavedOptions() {
    // 遍歷本地存儲項目並創建選項
    for (let i = 0; i < localStorage.length; i++) {
        const templateName = localStorage.key(i);
        const checkboxNames = JSON.parse(localStorage.getItem(templateName));

        const newOption = $("<option>")
            // .attr('value', checkboxNames.join(','))
            .text(templateName);
        $('#custom').append(newOption);
    }
}

// 功能：下拉選單連動（主題帶動資料及類型 ＆ 延伸資料集）
function updateDropdown() {
    const selectedTheme = $('#theme').val();

    // 先清掉下拉選單所有選項
    $('.fs-option').map(function () {
        $(this).removeClass('selected');
    })

    if (selectedTheme === 'ecological-survey') {
        $('#core').val('samplingevent').prop('disabled', true); // 指定核心，並鎖定下拉選單
        $('.fs-wrap').removeClass('fs-default');
        $('.fs-label').text('Darwin Core Occurrence'); // 指定延伸資料集
        $('.fs-option[data-value="darwin-core-occurrence"]').addClass('selected');
    } else if (selectedTheme === 'parasite') {
        $('#core').val('occurrence').prop('disabled', true); // 指定核心，並鎖定下拉選單
        $('.fs-wrap').removeClass('fs-default');
        $('.fs-label').text('Resource Relationship'); // 指定延伸資料集
        $('.fs-option[data-value="resource-relationship"]').addClass('selected');
    } else {
        $('#core').val('').prop('disabled', false);
        $('.fs-label').text('');
    }
}

// 功能：更新勾選的 checkboxes array
function updateCheckedCheckboxNames() {
    var checkedCheckboxNames = $("#requiredFieldset .checkbox input[type='checkbox']:checked").map(function () {
        return $(this).attr("name"); // 包含主題、資料集類型欄位
    }).get();

    var coreTemplateName = $('#core option:selected').val();
    if (coreTemplateName === 'None' || !coreTemplateName) {
        // 如果coreTemplateName是None或為空，則設定它為custom option的值
        coreTemplateName = $('#custom option:selected').val();
    }

    var checkedCustomCheckboxNames = $("#customFieldset .checkbox input[type='checkbox']:checked").map(function () {
        return $(this).attr("name"); // 包含自訂、自訂模板欄位
    }).get();

    if (checkedCustomCheckboxNames.length > 0) {
        checkedCheckboxNames = checkedCheckboxNames.concat(checkedCustomCheckboxNames);
    }

    CheckedcheckboxNames[coreTemplateName] = checkedCheckboxNames;


    var checkedExtensionCheckboxNames = $("#extensionFieldset .checkbox input[type='checkbox']:checked").map(function () {
        return $(this).attr("name"); // 包含延伸資料集欄位
    }).get();
    $("#extensionFieldset fieldset").each(function() {
        var fieldsetId = $(this).attr('id'); // 假設每個 fieldset 都有一個唯一的 id
        // console.log(fieldsetId);
    
        // 收集該 fieldset 下被勾選的 checkbox 名稱
        var checkedNames = $(this).find(".checkbox input[type='checkbox']:checked").map(function () {
            return $(this).attr("name");
        }).get();
    
        // 將收集到的名稱存儲到物件中
        CheckedcheckboxNames[fieldsetId] = checkedNames;
    });
    
    // 更新全域變數
    coreCheckedCheckboxNames = checkedCheckboxNames
    CheckedcheckboxNames = CheckedcheckboxNames
    // extensionCheckedcheckboxNames = checkedExtensionCheckboxNames
    allCheckedCheckboxNames = checkedCheckboxNames.concat(checkedCustomCheckboxNames, checkedExtensionCheckboxNames);
}

function getTemplateNames() {
    var coreTemplateNameValue = $('#core option:selected').val();
    var coreTemplateName = {
        '資料集類型': [coreTemplateNameValue]
    };

    if (coreTemplateNameValue === 'None' || !coreTemplateNameValue) {
        // 如果coreTemplateName是None或為空，則設定它為custom option的值
        var customTemplateNameValue = $('#custom option:selected').val();
        coreTemplateName = {
            '資料集類型': [customTemplateNameValue]
        };
    }

    var extensionTemplateNameValue = $('.fs-option.selected').map(function() {
        return $(this).data('value');
    }).get();
    
    var extensionTemplateName = {
        '延伸資料集': extensionTemplateNameValue.length > 0 ? extensionTemplateNameValue : $('#extensionFieldset').find('fieldset').map(function() {
            return $(this).attr('id');
        }).get()
    };

    TemplateNames = {
        '資料集類型': coreTemplateName['資料集類型'],
        '延伸資料集': extensionTemplateName['延伸資料集']
    };
}


// 功能：檢查欄位勾選是否重複
function handleCheckboxClick(checkbox) {
    // console.log('yes');
    // console.log(allCheckedCheckboxNames);

    if ($(checkbox).hasClass('key-col')) {
        return; // ID類欄位需要重複勾選
    }

    // 檢查勾選狀態之前的 allCheckedCheckboxNames
    const wasPreviouslyChecked = allCheckedCheckboxNames.includes($(checkbox).attr('name'));
    // console.log('wasPreviouslyChecked: ', wasPreviouslyChecked)
    // 更新 allCheckedCheckboxNames
    updateCheckedCheckboxNames();

    // 檢查勾選狀態之後的 allCheckedCheckboxNames
    const isCurrentlyChecked = allCheckedCheckboxNames.includes($(checkbox).attr('name'));
    // console.log('isCurrentlyChecked: ', isCurrentlyChecked)

    // 如果在前一個檢查時該 checkbox 是勾選的，但在當前檢查時已經不是了，則表示該 checkbox 已經被取消勾選。
    if (wasPreviouslyChecked && isCurrentlyChecked) {
        $(checkbox).prop('disabled', true);
        $(checkbox).prop('checked', false);
        $('.duplicated-popup').removeClass('d-none');
        return; // 結束函數，不進行後續的操作
    }
    // updateCheckedCheckboxNames();
}

// 功能：檢查欄位是否重複，有重複的話取消選選取並禁用。優先順序實作寫在每個下拉選單變動的地方，自訂模板 > 資料集類型 > 延伸資料集
function disableDuplicatedCheckbox (fieldsetID) {
    var target = "#" + fieldsetID + " input[type='checkbox']"
    $(target).each(function () {
        var chec = $(this).attr('name');

        if ($(this).hasClass('key-col')) {
            return; // ID類欄位需要重複勾選
        }

        if (allCheckedCheckboxNames.includes(chec)) {
            $(this).prop('checked', false);
            $(this).prop('disabled', true);
        }
    });
}

// 功能：更新 fieldset 的內容，包含自訂模板、主題、資料集類型
function updateFieldsetContent() {
    const selectedCore = $("#core").val();
    const selectedTheme = $("#theme").val();
    const selectedCustom = $("#custom").val();

    var fieldsetContent = "";

    if (selectedCore === "occurrence") {
        fieldsetContent += `
        <fieldset class="required-fieldset" id="occurrence">
            <legend>資料集類型欄位：Occurrence</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01 6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="eventID" class="required-col" checked />
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼" data-commonname="出現紀錄ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="occurrenceID" class="required-col" checked />
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="basisOfRecord" data-type="Record-level" data-description="資料紀錄的特定性質、類型，建議使用 Darwin Core 的控制詞彙" data-commonname="紀錄類型" data-example="材料實體 MaterialEntity,<br>保存標本 PreservedSpecimen,<br>化石標本 FossilSpecimen,<br>活體標本 LivingSpecimen,<br>人為觀測 HumanObservation,<br>材料樣本 MaterialSample,<br>機器觀測 MachineObservation,<br>調查活動 Event,<br>名錄/分類群 Taxon,<br>出現紀錄 Occurrence,<br>文獻紀錄 MaterialCitation">
                <label>
                    <input type="checkbox" name="basisOfRecord" class="required-col" checked/>
                    basisOfRecord
                </label>
            </div>
            <div class="checkbox" data-name="eventDate" data-type="Event" data-description="該筆資料被記錄的日期" data-commonname="調查日期、Date、時間" data-example="「1994-11-05」代表單日，「1996-06」代表 1996 年 6 月">
                <label>
                    <input type="checkbox" name="eventDate" class="required-col" checked />
                    eventDate
                </label>
            </div>
            <div class="checkbox" data-name="locality" data-type="Location" data-description="採集或觀測地點的明確描述" data-commonname="地點" data-example="觀音山,<br>Caribbean Sea,<br>Florida">
                <label>
                    <input type="checkbox" name="locality" class="required-col" checked />
                    locality
                </label>
            </div>
            <div class="checkbox" data-name="countryCode" data-type="Location" data-description="國家標準代碼" data-commonname="國家代碼" data-example="TW">
                <label>
                    <input type="checkbox" name="countryCode" class="required-col" checked />
                    countryCode
                </label>
            </div>
            <div class="checkbox" data-name="samplingProtocol" data-type="Event" data-description="調查方法或流程的名稱、描述，或其參考文獻。同一筆調查活動最好不要包含超過一個調查方法，如果超過則建議分為不同筆的調查活動" data-commonname="調查方法、材料方法、Method、Sampling method" data-example="UV light trap,<br>mist net,<br>bottom trawl,<br>ad hoc observation,<br>https://doi.org/10.1111/j.1466-8238.2009.00467.x,<br>Takats et al. 2001. Guidelines for Nocturnal Owl Monitoring in North America.">
                <label>
                    <input type="checkbox" name="samplingProtocol" class="required-col" checked />
                    samplingProtocol
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeValue" data-type="Event" data-description="採樣調查中單次採樣的大小數值(時間間隔、長度、範圍，或體積)。須搭配 dwc:sampleSizeUnit 欄位。" data-commonname="採樣大小、採樣量、取樣大小" data-example="5 (sampleSizeValue) with metre (sampleSizeUnit)">
                <label>
                    <input type="checkbox" name="sampleSizeValue" class="required-col" checked />
                    sampleSizeValue
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeUnit" data-type="Event" data-description="採樣大小的量測單位" data-commonname="採樣大小單位、採樣量單位" data-example="minute,<br>day,<br>metre,<br>square metre">
                <label>
                    <input type="checkbox" name="sampleSizeUnit" class="required-col" checked />
                    sampleSizeUnit
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="taxonID" class="required-col" checked />
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="scientificName" data-type="Taxon, Occurrence" data-description="完整的學名，包括已知的作者和日期資訊。若是作為鑑定的一部分，應是可確定的最低分類階層的名稱" data-commonname="學名、Name、名字" data-example="Coleoptera (目),<br>Vespertilionidae (科),<br>Manis (屬),<br>Ctenomys sociabilis (屬 + 種小名),<br>Ambystoma tigrinum diaboli (屬 +種小名 + 亞種小名),<br>Roptrocerus typographi (Györfi, 1952) (屬 + 種小名 + 學名命名者),<br>Quercus agrifolia var. oxyadenia (Torr.) J.T.">
                <label>
                    <input type="checkbox" name="scientificName" class="required-col" checked />
                    scientificName
                </label>
            </div>
            <div class="checkbox" data-name="taxonRank" data-type="Taxon" data-description="與dwc:scientificName欄位搭配，填上該筆紀錄的最低分類位階" data-commonname="分類位階、分類階層" data-example="genus,<br>species,<br>subspecies,<br>family">
                <label>
                    <input type="checkbox" name="taxonRank" class="required-col" checked />
                    taxonRank
                </label>
            </div>
            <div class="checkbox" data-name="samplingEffort" data-type="Event" data-description="一次調查的努力量" data-commonname="調查努力量" data-example="40 trap-nights,<br>10 observer-hours,<br>10 km by foot">
                <label>
                    <input type="checkbox" name="samplingEffort" checked />
                    samplingEffort
                </label>
            </div>
            <div class="checkbox" data-name="decimalLatitude" data-type="Location" data-description="十進位緯度" data-commonname="十進位緯度" data-example="-41.0983423">
                <label>
                    <input type="checkbox" name="decimalLatitude" checked />
                    decimalLatitude
                </label>
            </div>
            <div class="checkbox" data-name="decimalLongitude" data-type="Location" data-description="十進位經度" data-commonname="十進位經度" data-example="-121.1761111">
                <label>
                    <input type="checkbox" name="decimalLongitude" checked />
                    decimalLongitude
                </label>
            </div>
            <div class="checkbox" data-name="geodeticDatum" data-type="Location" data-description="座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="大地基準、大地系統" data-example="EPSG:4326,<br>WGS84,<br>EPSG:3826 (TWD97 / TM2 臺灣),<br>EPSG:3828（TWD67 / TM2 臺灣）">
                <label>
                    <input type="checkbox" name="geodeticDatum" checked />
                    geodeticDatum
                </label>
            </div>
            <div class="checkbox" data-name="coordinateUncertaintyInMeters" data-type="Occurrence, Location" data-description="從給定的十進位緯度（decimalLatitude）和十進位經度（decimalLongitude）到包含整個位置的最小圓的水平距離（以公尺為單位）。如果座標不確定、無法估計或不適用（因爲没有座標），則將該值留空。零值不是該項的有效值" data-commonname="座標誤差（公尺）" data-example="30 (reasonable lower limit on or after 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time).<br>100 (reasonable lower limit before 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time).<br>71 (uncertainty for a UTM coordinate having 100 meter precision and a known spatial reference system).">
                <label>
                    <input type="checkbox" name="coordinateUncertaintyInMeters" checked />
                    coordinateUncertaintyInMeters
                </label>
            </div>
            <div class="checkbox" data-name="recordedBy" data-type="Occurrence" data-description="記錄此資料的人或最初的觀察者，可以是個人、一份名單、一個群體、一個組織" data-commonname="記錄者、採集者" data-example="Melissa Liu | Daphne Hoh">
                <label>
                    <input type="checkbox" name="recordedBy" checked/>
                    recordedBy
                </label>
            </div>
            <div class="checkbox" data-name="individualCount" data-type="Occurrence" data-description="出現紀錄被記錄時存在的個體數量，只能為正整數" data-commonname="數量、個體數" data-example="0, 1, 25">
                <label>
                    <input type="checkbox" name="individualCount" checked />
                    individualCount
                </label>
            </div>
            <div class="checkbox" data-name="organismQuantity" data-type="Occurrence" data-description="該筆紀錄所包含的生物體的量，若非正整數時可用此欄位記錄。須與dwc: organismQuantityType 搭配使用。" data-commonname="生物體數量" data-example="27 (organismQuantity) with individuals (organismQuantityType),<br>12.5 (organismQuantity) with % biomass (organismQuantityType),<br>r (organismQuantity) with Braun Blanquet Scale (organismQuantityType),<br>many (organismQuantity) with individuals (organismQuantityType).">
                <label>
                    <input type="checkbox" name="organismQuantity" checked/>
                    organismQuantity
                </label>
            </div>
            <div class="checkbox" data-name="organismQuantityType" data-type="Occurrence" data-description="生物體數量的單位，若非正整數時可用此欄位記錄。" data-commonname="生物體數量單位" data-example="27 (organismQuantity) with individuals (organismQuantityType),<br>12.5 (organismQuantity) with % biomass (organismQuantityType),<br>r (organismQuantity) with Braun Blanquet Scale (organismQuantityType)">
                <label>
                    <input type="checkbox" name="organismQuantityType" checked/>
                    organismQuantityType
                </label>
            </div>
            <div class="checkbox" data-name="kingdom" data-type="Taxon" data-description="界" data-commonname="界" data-example="Animalia,<br>Archaea,<br>Bacteria,<br>Chromista,<br>Fungi,<br>Plantae,<br>Protozoa,<br>Viruses">
                <label>
                    <input type="checkbox" name="kingdom" checked />
                    kingdom 
                </label>
            </div>
            <div class="checkbox" data-name="phylum" data-type="Taxon" data-description="門" data-commonname="門" data-example="Chordata (phylum),<br>Bryophyta (division)">
                <label>
                    <input type="checkbox" name="phylum"/>
                    phylum 
                </label>
            </div>
            <div class="checkbox" data-name="class" data-type="Taxon" data-description="綱" data-commonname="綱" data-example="Mammalia,<br>Hepaticopsida">
                <label>
                    <input type="checkbox" name="class"/>
                    class 
                </label>
            </div>
            <div class="checkbox" data-name="order" data-type="Taxon" data-description="目" data-commonname="目" data-example="Carnivora,<br>Monocleales">
                <label>
                    <input type="checkbox" name="order"/>
                    order 
                </label>
            </div>
            <div class="checkbox" data-name="family" data-type="Taxon" data-description="科" data-commonname="科" data-example="Felidae,<br>Monocleaceae">
                <label>
                    <input type="checkbox" name="family"/>
                    family 
                </label>
            </div>
            <div class="checkbox" data-name="subfamily" data-type="Taxon" data-description="亞科" data-commonname="亞科" data-example="Periptyctinae,<br>Orchidoideae,<br>Sphindociinae">
                <label>
                    <input type="checkbox" name="subfamily"/>
                    subfamily 
                </label>
            </div>
            <div class="checkbox" data-name="genus" data-type="Taxon" data-description="屬" data-commonname="屬" data-example="Puma,<br>Monoclea">
                <label>
                    <input type="checkbox" name="genus"/>
                    genus 
                </label>
            </div>
            <div class="checkbox" data-name="subgenus" data-type="Taxon" data-description="亞屬" data-commonname="亞屬" data-example="Strobus,<br>Amerigo,<br>Pilosella">
                <label>
                    <input type="checkbox" name="subgenus"/>
                    subgenus 
                </label>
            </div>
            <div class="checkbox" data-name="infragenericEpithet" data-type="Taxon" data-description="屬以下別名" data-commonname="屬以下別名" data-example="Abacetillus (for scientificName Abacetus (Abacetillus) ambiguus),<br>Cracca (for scientificName Vicia sect. Cracca)">
                <label>
                    <input type="checkbox" name="infragenericEpithet"/>
                    infragenericEpithet 
                </label>
            </div>
            <div class="checkbox" data-name="specificEpithet" data-type="Taxon" data-description="種小名" data-commonname="種小名" data-example="concolor,<br>gottschei">
                <label>
                    <input type="checkbox" name="specificEpithet"/>
                    specificEpithet 
                </label>
            </div>
            <div class="checkbox" data-name="infraspecificEpithet" data-type="Taxon" data-description="種以下別名" data-commonname="種以下別名" data-example="concolor (for scientificName Puma concolor concolor (Linnaeus, 1771)),<br>oxyadenia (for scientificName Quercus agrifolia var. oxyadenia (Torr.) J.T. Howell),<br>laxa (for scientificName Cheilanthes hirta f. laxa (Kunze) W.Jacobsen & N.Jacobsen),<br>scaberrima (for scientificName Indigofera charlieriana var. scaberrima (Schinz) J.B.Gillett)">
                <label>
                    <input type="checkbox" name="infraspecificEpithet"/>
                    infraspecificEpithet 
                </label>
            </div>
            <div class="checkbox" data-name="cultivarEpithet" data-type="Taxon" data-description="栽培種小名" data-commonname="栽培種小名" data-example="King Edward (for scientificName Solanum tuberosum 'King Edward' and taxonRank cultivar),<br>Mishmiense (for scientificName Rhododendron boothii Mishmiense Group and taxonRank cultivar group),<br>Atlantis (for scientificName Paphiopedilum Atlantis grex and taxonRank grex)">
                <label>
                    <input type="checkbox" name="cultivarEpithet"/>
                    cultivarEpithet 
                </label>
            </div>
            <div class="checkbox" data-name="parentEventID" data-type="Event" data-description="上階層調查活動ID" data-commonname="上階層調查活動ID、母事件ID" data-example="A1 (parentEventID to identify the main Whittaker Plot in nested samples, each with its own eventID - A1:1, A1:2)">
                <label>
                    <input type="checkbox" name="parentEventID"/>
                    parentEventID
                </label>
            </div>
            <div class="checkbox" data-name="fieldNumber" data-type="Event" data-description="在野外給此調查活動的編號" data-commonname="野外調查編號" data-example="RV Sol 87-03-08">
                <label>
                    <input type="checkbox" name="fieldNumber"/>
                    fieldNumber 
                </label>
            </div>
            <div class="checkbox" data-name="eventTime" data-type="Event" data-description="該筆資料被記錄的時間。建議格式參考 ISO 8601-1:2019" data-commonname="調查時間" data-example="14:07-0600 (2:07 pm UTC+6),<br>08:40Z (8:40 am UTC時區),<br>13:00Z/15:30Z (1:00-3:30 pm UTC時區)">
                <label>
                    <input type="checkbox" name="eventTime"/>
                    eventTime
                </label>
            </div>
            <div class="checkbox" data-name="year" data-type="Event, Occurrence" data-description="西元年" data-commonname="年、西元年" data-example="1996,<br>2023">
                <label>
                    <input type="checkbox" name="year"/>
                    year
                </label>
            </div>
            <div class="checkbox" data-name="month" data-type="Event, Occurrence" data-description="月" data-commonname="月" data-example="11,<br>01">
                <label>
                    <input type="checkbox" name="month"/>
                    month
                </label>
            </div>
            <div class="checkbox" data-name="day" data-type="Event, Occurrence" data-description="日" data-commonname="日" data-example="26,<br>01">
                <label>
                    <input type="checkbox" name="day"/>
                    day 
                </label>
            </div>
            <div class="checkbox" data-name="verbatimEventDate" data-type="Event, Occurrence" data-description="最原始記錄且未被轉譯過的調查日期" data-commonname="字面上調查日期、原始調查日期" data-example="spring 1910,<br>Marzo 2002,<br>1999-03-XX,<br>17IV1934">
                <label>
                    <input type="checkbox" name="verbatimEventDate"/>
                    verbatimEventDate 
                </label>
            </div>
            <div class="checkbox" data-name="habitat" data-type="Event" data-description="調查樣區的棲地類型" data-commonname="棲地" data-example="樹,<br>灌叢,<br>道路">
                <label>
                    <input type="checkbox" name="habitat"/>
                    habitat 
                </label>
            </div>
            <div class="checkbox" data-name="fieldNotes" data-type="Event" data-description="野外調查的筆記、註記" data-commonname="野外調查註記" data-example="Notes available in the Grinnell-Miller Library.">
                <label>
                    <input type="checkbox" name="fieldNotes"/>
                    fieldNotes
                </label>
            </div>
            <div class="checkbox" data-name="eventRemarks" data-type="Event" data-description="可註記天氣或調查狀況等任何文字資訊" data-commonname="調查備註" data-example="陣雨,<br>濃霧,<br>部分有雲">
                <label>
                    <input type="checkbox" name="eventRemarks"/>
                    eventRemarks 
                </label>
            </div>
            <div class="checkbox" data-name="typeStatus" data-type="Identification" data-description="學名標本模式，最好能使用控制詞彙" data-commonname="學名標本模式" data-example="正模標本 HOLOTYPE,<br>副模標本 PARATYPE,<br>複模標本 ISOTYPE,<br>配模標本 ALLOTYPE,<br>總模標本 SYNTYPE,<br>選模標本 LECTOTYPE,<br>副選模標本 PARALECTOTYPE,<br>新模標本 NEOTYPE,<br>模式地標本 TOPOTYPE">
                <label>
                    <input type="checkbox" name="typeStatus"/>
                    typeStatus 
                </label>
            </div>
            <div class="checkbox" data-name="identifiedBy" data-type="Identification" data-description="鑑定此筆紀錄分類相關資訊的人、群體或組織。若有多人則以 '|' 符號區隔" data-commonname="學名鑑定人" data-example="James L. Patton, Theodore Pappenfuss | Robert Macey">
                <label>
                    <input type="checkbox" name="identifiedBy"/>
                    identifiedBy 
                </label>
            </div>
            <div class="checkbox" data-name="identificationReferences" data-type="" data-description="鑑定此紀錄的物種分類資訊的參考文獻連結" data-commonname="學名鑑定參考" data-example="Aves del Noroeste Patagonico. Christie et al. 2004.,<br>Stebbins, R. Field Guide to Western Reptiles and Amphibians. 3rd Edition. 2003. | Irschick, D.J. and Shaffer, H.B. (1997). The polytypic species revisited: Morphological differentiation among tiger salamanders (Ambystoma tigrinum) (Amphibia: Caudata). Herpetologica, 53(1), 30-49">
                <label>
                    <input type="checkbox" name="identificationReferences"/>
                    identificationReferences
                </label>
            </div>
            <div class="checkbox" data-name="identificationVerificationStatus" data-type="Identification" data-description="為表示此紀錄的分類資訊驗證狀態的指標，來判斷是否需要驗證或修正。建議使用控制詞彙" data-commonname="學名鑑定驗證狀態" data-example="0 ('unverified' in HISPID/ABCD)">
                <label>
                    <input type="checkbox" name="identificationVerificationStatus"/>
                    identificationVerificationStatus
                </label>
            </div>
            <div class="checkbox" data-name="identificationRemarks" data-type="Identification" data-description="" data-commonname="學名鑑定備註" data-example="Distinguished between Anthus correndera and Anthus hellmayri based on the comparative lengths of the uñas">
                <label>
                    <input type="checkbox" name="identificationRemarks"/>
                    identificationRemarks
                </label>
            </div>
            <div class="checkbox" data-name="continent" data-type="Location" data-description="洲" data-commonname="洲" data-example="非洲 Africa,<br>南極洲 Antarctica,<br>亞洲 Asia,<br>歐洲 Europe,<br>北美洲 North America,<br>大洋洲 Oceania,<br>南美洲 South America">
                <label>
                    <input type="checkbox" name="continent"/>
                    continent 
                </label>
            </div>
            <div class="checkbox" data-name="waterBody" data-type="Location" data-description="水體" data-commonname="水體" data-example="Indian Ocean,<br>Baltic Sea,<br>Hudson River,<br>Lago Nahuel Huapi">
                <label>
                    <input type="checkbox" name="waterBody"/>
                    waterBody 
                </label>
            </div>
            <div class="checkbox" data-name="islandGroup" data-type="Location" data-description="群島" data-commonname="群島" data-example="Alexander Archipelago,<br>Archipiélago Diego Ramírez,<br>Seychelles">
                <label>
                    <input type="checkbox" name="islandGroup"/>
                    islandGroup 
                </label>
            </div>
            <div class="checkbox" data-name="island" data-type="Location" data-description="島嶼" data-commonname="島嶼" data-example="Nosy Be,<br>Bikini Atoll,<br>Vancouver,<br>Viti Levu,<br>Zanzibar">
                <label>
                    <input type="checkbox" name="island"/>
                    island 
                </label>
            </div>
            <div class="checkbox" data-name="country" data-type="Location" data-description="國家" data-commonname="國家" data-example="Taiwan">
                <label>
                    <input type="checkbox" name="country"/>
                    country 
                </label>
            </div>
            <div class="checkbox" data-name="stateProvince" data-type="Location" data-description="省份/州" data-commonname="省份/州" data-example="Montana,<br>Minas Gerais,<br>Córdoba">
                <label>
                    <input type="checkbox" name="stateProvince"/>
                    stateProvince 
                </label>
            </div>
            <div class="checkbox" data-name="county" data-type="Location" data-description="縣市" data-commonname="縣市" data-example="Nantou County">
                <label>
                    <input type="checkbox" name="county"/>
                    county 
                </label>
            </div>
            <div class="checkbox" data-name="municipality" data-type="Location" data-description="行政區" data-commonname="行政區" data-example="Yuchi Township">
                <label>
                    <input type="checkbox" name="municipality"/>
                    municipality 
                </label>
            </div>
            <div class="checkbox" data-name="minimumElevationInMeters" data-type="Location" data-description="最低海拔（公尺）" data-commonname="最低海拔（公尺）" data-example="-100,<br>3952">
                <label>
                    <input type="checkbox" name="minimumElevationInMeters"/>
                    minimumElevationInMeters 
                </label>
            </div>
            <div class="checkbox" data-name="maximumElevationInMeters" data-type="Location" data-description="最高海拔（公尺）" data-commonname="最高海拔（公尺）" data-example="-205,<br>1236">
                <label>
                    <input type="checkbox" name="maximumElevationInMeters"/>
                    maximumElevationInMeters 
                </label>
            </div>
            <div class="checkbox" data-name="verbatimElevation" data-type="Location" data-description="" data-commonname="字面上海拔" data-example="100-200 m">
                <label>
                    <input type="checkbox" name="verbatimElevation"/>
                    verbatimElevation 
                </label>
            </div>
            <div class="checkbox" data-name="minimumDepthInMeters" data-type="Location" data-description="最小深度（公尺）" data-commonname="最小深度（公尺）" data-example="0,<br>100">
                <label>
                    <input type="checkbox" name="minimumDepthInMeters"/>
                    minimumDepthInMeters 
                </label>
            </div>
            <div class="checkbox" data-name="maximumDepthInMeters" data-type="Location" data-description="最大深度（公尺）" data-commonname="最大深度（公尺）" data-example="0,<br>200">
                <label>
                    <input type="checkbox" name="maximumDepthInMeters"/>
                    maximumDepthInMeters 
                </label>
            </div>
            <div class="checkbox" data-name="locationRemarks" data-type="Location" data-description="地區註記" data-commonname="字面地區註記上深度" data-example="under water since 2005">
                <label>
                    <input type="checkbox" name="locationRemarks"/>
                    locationRemarks 
                </label>
            </div>
            <div class="checkbox" data-name="coordinatePrecision" data-type="Occurrence, Location" data-description="依據十進位緯度（decimalLatitude）和十進位經度（decimalLongitude）中給出的座標精確度的十進位表示" data-commonname="座標精準度" data-example="0.00001 (normal GPS limit for decimal degrees),<br>0.000278 (nearest second),<br>0.01667 (nearest minute),<br>1.0 (nearest degree)">
                <label>
                    <input type="checkbox" name="coordinatePrecision"/>
                    coordinatePrecision
                </label>
            </div>
            <div class="checkbox" data-name="verbatimCoordinates" data-type="Location" data-description="字面上座標，意即最初採集或觀測取得紀錄的經度和緯度，且尚未被轉譯過，任何座標系統皆可" data-commonname="字面上座標" data-example="41 05 54S 121 05 34W, 17T 630000 4833400">
                <label>
                    <input type="checkbox" name="verbatimCoordinates"/>
                    verbatimCoordinates
                </label>
            </div>
            <div class="checkbox" data-name="verbatimLatitude" data-type="Location" data-description="字面緯度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="緯度" data-example="41d 16’N">
                <label>
                    <input type="checkbox" name="verbatimLatitude"/>
                    verbatimLatitude
                </label>
            </div>
            <div class="checkbox" data-name="verbatimLongitude" data-type="Location" data-description="字面經度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="經度" data-example="121d 10’ 34" W">
                <label>
                    <input type="checkbox" name="verbatimLongitude"/>
                    verbatimLongitude
                </label>
            </div>
            <div class="checkbox" data-name="verbatimCoordinateSystem" data-type="Location" data-description="紀錄的座標單位" data-commonname="座標單位" data-example="decimal degrees,<br>degrees decimal minutes,<br>degrees minutes seconds">
                <label>
                    <input type="checkbox" name="verbatimCoordinateSystem"/>
                    verbatimCoordinateSystem
                </label>
            </div>
            <div class="checkbox" data-name="verbatimSRS" data-type="Location" data-description="字面上座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="字面上空間參照系統" data-example="unknown,<br>EPSG:4326,<br>WGS84,<br>NAD27,<br>Campo Inchauspe,<br>European 1950,<br>Clarke 1866">
                <label>
                    <input type="checkbox" name="verbatimSRS"/>
                    verbatimSRS
                </label>
            </div>
            <div class="checkbox" data-name="footprintWKT" data-type="Location" data-description="一個位置可能既有點半徑表示法（見十進位緯度），也有足跡表示法，兩者可能互不相同。若該筆紀錄無法以一個點位或點半徑記錄，則可參考使用此欄位" data-commonname="地理足跡WKT" data-example="epsg:4326, GEOGCS['GCS_WGS_1984', DATUM['D_WGS_1984', SPHEROID['WGS_1984',6378137,298.257223563]], PRIMEM['Greenwich',0], UNIT['Degree',0.0174532925199433]] (WKT for the standard WGS84 Spatial Reference System EPSG:4326)">
                <label>
                    <input type="checkbox" name="footprintWKT"/>
                    footprintWKT
                </label>
            </div>
            <div class="checkbox" data-name="catalogNumber" data-type="Occurrence" data-description="通常為典藏標本納入館藏時所獲得的序號" data-commonname="館藏號" data-example="145732,<br>145732a,<br>2008.1334,<br>R-4313">
                <label>
                    <input type="checkbox" name="catalogNumber"/>
                    catalogNumber
                </label>
            </div>
            <div class="checkbox" data-name="recordNumber" data-type="Occurrence" data-description="採集樣本並記錄時所寫下的序號" data-commonname="採集號" data-example="OPP 7101">
                <label>
                    <input type="checkbox" name="recordNumber"/>
                    recordNumber
                </label>
            </div>
            <div class="checkbox" data-name="recordedByID" data-type="Occurrence" data-description="記錄者的相關個人連結，如ORCID" data-commonname="記錄者連結、記錄者ID" data-example="https://orcid.org/0000-0002-1825-0097 (for an individual),<br>https://orcid.org/0000-0002-1825-0097 | https://orcid.org/0000-0002-1825-0098 (for a list of people)">
                <label>
                    <input type="checkbox" name="recordedByID"/>
                    recordedByID
                </label>
            </div>
            <div class="checkbox" data-name="sex" data-type="Occurrence" data-description="該筆紀錄中生物個體的性別，建議使用控制詞彙。" data-commonname="性別" data-example="雌性 female,<br>雄性 male,<br>雌雄同體 hermaphrodite">
                <label>
                    <input type="checkbox" name="sex"/>
                    sex
                </label>
            </div>
            <div class="checkbox" data-name="lifeStage" data-type="Occurrence" data-description="該筆紀錄中生物的生活史階段" data-commonname="生活史階段" data-example="zygote,<br>larva,<br>juvenile,<br>adult,<br>seedling,<br>flowering,<br>fruiting">
                <label>
                    <input type="checkbox" name="lifeStage"/>
                    lifeStage
                </label>
            </div>
            <div class="checkbox" data-name="reproductiveCondition" data-type="Occurrence" data-description="該筆紀錄中生物的生殖狀態" data-commonname="生殖狀態" data-example="non-reproductive,<br>pregnant,<br>in bloom,<br>fruit-bearing">
                <label>
                    <input type="checkbox" name="reproductiveCondition"/>
                    reproductiveCondition
                </label>
            </div>
            <div class="checkbox" data-name="behavior" data-type="Occurrence" data-description="該筆紀錄的生物被觀察時，正進行的行為" data-commonname="行為" data-example="roosting,<br>foraging,<br>running">
                <label>
                    <input type="checkbox" name="behavior"/>
                    behavior
                </label>
            </div>
            <div class="checkbox" data-name="establishmentMeans" data-type="Occurrence" data-description="關於一種或多種生物是否藉由現代人類的直接或間接活動引入特定地點和時間的聲明或評估" data-commonname="原生或引入定義評估" data-example="原生 native,<br>原生：再引進 nativeReintroduced,<br>引進（外來、非原生、非原住） introduced,<br>引進（協助拓殖） introducedAssistedColonisation,<br>流浪的 vagrant,<br>不確定的（未知、隱源性） uncertain">
                <label>
                    <input type="checkbox" name="establishmentMeans"/>
                    establishmentMeans
                </label>
            </div>
            <div class="checkbox" data-name="degreeOfEstablishment" data-type="Occurrence" data-description="生物在特定地點和時間的生存、繁殖和擴大範圍的程度" data-commonname="原生或引入階段評估" data-example="原生 native,<br>收容 captive,<br>栽培 cultivated,<br>野放 released,<br>衰退中 failing,<br>偶然出現的 casual,<br>繁殖中 reproducing,<br>歸化 established,<br>拓殖中 colonising,<br>入侵 invasive,<br>廣泛入侵 widespreadInvasive">
                <label>
                    <input type="checkbox" name="degreeOfEstablishment"/>
                    degreeOfEstablishment
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceStatus" data-type="Occurrence" data-description="該筆紀錄在特定時間和地點，為生物有出現或未出現的狀態，須使用DwC規範之控制詞彙" data-commonname="出現狀態" data-example="出現 present,<br>未出現 absent">
                <label>
                    <input type="checkbox" name="occurrenceStatus"/>
                    occurrenceStatus
                </label>
            </div>
            <div class="checkbox" data-name="associatedMedia" data-type="Occurrence" data-description="與該筆紀錄相關的多媒體連結，若有多個連結以 '|' 分隔。" data-commonname="相關多媒體資訊、影片、照片、聲音檔" data-example="https://arctos.database.museum/media/10520962 | https://arctos.database.museum/media/10520964">
                <label>
                    <input type="checkbox" name="associatedMedia"/>
                    associatedMedia
                </label>
            </div>
            <div class="checkbox" data-name="associatedOccurrences" data-type="Occurrence" data-description="與該筆紀錄相關的其他出現紀錄，若有多個連結以 '|' 分隔。" data-commonname="相關物種出現紀錄" data-example="parasite collected from: https://arctos.database.museum/guid/MSB:Mamm:215895?seid=950760,<br>encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3175067 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177393 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177394 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177392 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3609139">
                <label>
                    <input type="checkbox" name="associatedOccurrences"/>
                    associatedOccurrences
                </label>
            </div>
            <div class="checkbox" data-name="associatedReferences" data-type="Occurrence" data-description="與該筆紀錄相關的其他出現紀錄，若有多個連結以 '|' 分隔。" data-commonname="相關參考資料" data-example="http://www.sciencemag.org/cgi/content/abstract/322/5899/261, Christopher J. Conroy, Jennifer L. Neuwald. 2008. Phylogeographic study of the California vole, Microtus californicus Journal of Mammalogy, 89(3):755-767., Steven R. Hoofer and Ronald A. Van Den Bussche. 2001. Phylogenetic Relationships of Plecotine Bats and Allies Based on Mitochondrial Ribosomal Sequences. Journal of Mammalogy 82(1):131-137. | Walker, Faith M., Jeffrey T. Foster, Kevin P. Drees, Carol L. Chambers. 2014. Spotted bat (Euderma maculatum) microsatellite discovery using illumina sequencing. Conservation Genetics Resources.">
                <label>
                    <input type="checkbox" name="associatedReferences"/>
                    associatedReferences
                </label>
            </div>
            <div class="checkbox" data-name="associatedSequences" data-type="Occurrence" data-description="與該筆紀錄相關的基因序列（提供其於開放基因資料庫或文獻中的連結），若有多個連結則以 '|' 分隔。" data-commonname="相關基因序列" data-example="http://www.ncbi.nlm.nih.gov/nuccore/U34853.1, http://www.ncbi.nlm.nih.gov/nuccore/GU328060 | http://www.ncbi.nlm.nih.gov/nuccore/AF326093">
                <label>
                    <input type="checkbox" name="associatedSequences"/>
                    associatedSequences
                </label>
            </div>
            <div class="checkbox" data-name="associatedTaxa" data-type="Occurrence" data-description="與該筆紀錄相關的物種（如有交互作用的物種），若有多個則以 '|' 分隔。" data-commonname="相關物種" data-example="host: Quercus alba,<br>host: gbif.org/species/2879737,<br>parasitoid of: Cyclocephala signaticollis | predator of: Apis mellifera">
                <label>
                    <input type="checkbox" name="associatedTaxa"/>
                    associatedTaxa
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceRemarks" data-type="Occurrence" data-description="該筆出現紀錄註記、備註" data-commonname="出現紀錄註記" data-example="found dead on road">
                <label>
                    <input type="checkbox" name="occurrenceRemarks"/>
                    occurrenceRemarks
                </label>
            </div>
            <div class="checkbox" data-name="organismID" data-type="Organism" data-description="若該筆紀錄可追溯至生物個體，則可給予生物體ID。可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)" data-commonname="生物體ID、個體ID" data-example="http://arctos.database.museum/guid/WNMU:Mamm:1249">
                <label>
                    <input type="checkbox" name="organismID"/>
                    organismID
                </label>
            </div>
            <div class="checkbox" data-name="organismName" data-type="Organism" data-description="給該生物體取的名字或標籤" data-commonname="生物體名、個體名稱" data-example="Huberta,<br>Boab Prison Tree,<br>J pod,<br>小破洞,<br>傑尼龜">
                <label>
                    <input type="checkbox" name="organismName"/>
                    organismName
                </label>
            </div>
            <div class="checkbox" data-name="associatedOrganisms" data-type="Organism" data-description="與該生物體相關的其他生物個體" data-commonname="相關生物體、相關個體" data-example="sibling of: http://arctos.database.museum/guid/DMNS:Mamm:14171,<br>parent of: http://arctos.database.museum/guid/MSB:Mamm:196208 | parent of: http://arctos.database.museum/guid/MSB:Mamm:196523 | sibling of: http://arctos.database.museum/guid/MSB:Mamm:142638">
                <label>
                    <input type="checkbox" name="associatedOrganisms"/>
                    associatedOrganisms
                </label>
            </div>
            <div class="checkbox" data-name="organismRemarks" data-type="Organism" data-description="該生物體的註記、備註" data-commonname="生物體註記" data-example="One of a litter of six">
                <label>
                    <input type="checkbox" name="organismRemarks"/>
                    organismRemarks
                </label>
            </div>
            <div class="checkbox" data-name="type" data-type="Record-level" data-description="該筆資源/媒體的性質或類型，必須填入 DCMI 類型詞彙表中的值(http://dublincore.org/documents/2010/10/11/dcmi-type-vocabulary/)" data-commonname="資源類型、媒體類型" data-example="靜態影像 StillImage,<br>動態影像 MovingImage,<br>聲音 Sound,<br>實體物件 PhysicalObject,<br>事件 Event,<br>文字 Text">
                <label>
                    <input type="checkbox" name="type"/>
                    type
                </label>
            </div>
            <div class="checkbox" data-name="modified" data-type="Record-level" data-description="該筆紀錄最近被修改的日期時間" data-commonname="紀錄修改時間" data-example="1963-03-08T14:07-0600 (1963年3月8日 2:07 pm UTC+6),<br>2009-02-20T08:40Z (2009年2月20日 8:40 am UTC時區),<br>2018-08-29T15:19 (2018年8月29日 3:15 pm 當地時間),<br>1809-02-12 (只顯示日期),<br>1906-06 (只顯示到月份),<br>2007-11-13/15 (用'/'表示某個日期區段)">
                <label>
                    <input type="checkbox" name="modified"/>
                    modified
                </label>
            </div>
            <div class="checkbox" data-name="language" data-type="Record-level" data-description="該紀錄所用的語言，建議使用控制詞彙(RFC 5646標準)" data-commonname="語言" data-example="en (英文),<br>zh-TW (繁體中文)">
                <label>
                    <input type="checkbox" name="language"/>
                    language
                </label>
            </div>
            <div class="checkbox" data-name="license" data-type="Record-level" data-description="正式允許對資料進行操作的一份法律授權文件。這裡所用的授權主要為創用CC授權，須使用控制詞彙" data-commonname="授權標示、資料授權" data-example="CC0 1.0, <br>CC BY 4.0 ,<br>CC BY-NC 4.0,<br>無授權標示, <br>無法辨識">
                <label>
                    <input type="checkbox" name="license"/>
                    license
                </label>
            </div>
            <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="擁有或管理資料權利的個人或組織" data-commonname="所有權、所有權人" data-example="Taiwan Biodiversity Information Facility, TaiBIF<br>National Taiwan University, NTU<br>Forestry and Nature Conservation Agency">
                <label>
                    <input type="checkbox" name="rightsHolder"/>
                    rightsHolder
                </label>
            </div>
            <div class="checkbox" data-name="bibliographicCitation" data-type="Record-level" data-description="此筆資料的引用方式" data-commonname="資料引用方式" data-example="Museum of Vertebrate Zoology, UC Berkeley. MVZ Mammal Collection (Arctos). Record ID: http://arctos.database.museum/guid/MVZ:Mamm:165861?seid=101356.">
                <label>
                    <input type="checkbox" name="bibliographicCitation"/>
                    bibliographicCitation
                </label>
            </div>
            <div class="checkbox" data-name="references" data-type="Record-level" data-description="被描述的資源參考、引用或以其他方式指向的相關資源" data-commonname="資料參考來源、參考文獻、參考資源、參考來源" data-example="http://arctos.database.museum/guid/MVZ:Mamm:165861 (MaterialEntity example),<br>https://www.catalogueoflife.org/data/taxon/32664 (Taxon example)">
                <label>
                    <input type="checkbox" name="references"/>
                    references
                </label>
            </div>
            <div class="checkbox" data-name="collectionID" data-type="Record-level" data-description="該筆紀錄在發布機構的典藏ID，最好為全球唯一的URL" data-commonname="館藏ID、典藏號、館藏號" data-example="http://biocol.org/urn:lsid:biocol.org:col:1001, http://grbio.org/cool/p5fp-c036">
                <label>
                    <input type="checkbox" name="collectionID"/>
                    collectionID
                </label>
            </div>
            <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="該筆紀錄在來源資料集中的ID，最好為全球唯一或於該發布機構唯一的ID" data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
                <label>
                    <input type="checkbox" name="datasetID"/>
                    datasetID
                </label>
            </div>
            <div class="checkbox" data-name="institutionCode" data-type="Record-level" data-description="發布機構所使用的名稱（博物館）代碼或縮寫" data-commonname="機構代碼" data-example="GBIF,<br>TaiBIF,<br>NTM,<br>NSTC">
                <label>
                    <input type="checkbox" name="institutionCode"/>
                    institutionCode
                </label>
            </div>
            <div class="checkbox" data-name="datasetName" data-type="Record-level" data-description="該筆紀錄來源的資料集名稱" data-commonname="資料集名稱、來源計畫名稱" data-example="Taiwan Wild Bird Federation Bird Records Database,<br>Data-set of Moth Specimen from TESRI">
                <label>
                    <input type="checkbox" name="datasetName"/>
                    datasetName
                </label>
            </div>
            <div class="checkbox" data-name="informationWithheld" data-type="Record-level" data-description="若有隸屬於此資料集但尚未開放的其他資訊，可在此欄位補充" data-commonname="隱藏資訊" data-example="location information not given for endangered species,<br>collector identities withheld | ask about tissue samples">
                <label>
                    <input type="checkbox" name="informationWithheld"/>
                    informationWithheld
                </label>
            </div>
            <div class="checkbox" data-name="dataGeneralizations" data-type="Record-level" data-description="針對共享資料採取的措施，使其比原始形式更不具體或完整（如將點位模糊化）。可表明若有需要更高品質的替代資料可提出申請" data-commonname="資料模糊化、屏蔽資料" data-example="Coordinates generalized from original GPS coordinates to the nearest half degree grid cell">
                <label>
                    <input type="checkbox" name="dataGeneralizations"/>
                    dataGeneralizations
                </label>
            </div>
            <div class="checkbox" data-name="verbatimTaxonRank" data-type="Taxon" data-description="原始紀錄的學名中，最具體且尚未被轉譯過的分類位階等級。" data-commonname="字面上分類位階" data-example="Agamospecies, sub-lesus, prole, apomict, nothogrex, sp., subsp., var.">
                <label>
                    <input type="checkbox" name="verbatimTaxonRank"/>
                    verbatimTaxonRank
                </label>
            </div>
            <div class="checkbox" data-name="scientificNameAuthorship" data-type="Taxon" data-description="學名命名者" data-commonname="學名命名者" data-example="(Torr.) J.T. Howell, (Martinovský) Tzvelev, (Györfi, 1952)">
                <label>
                    <input type="checkbox" name="scientificNameAuthorship"/>
                    scientificNameAuthorship
                </label>
            </div>
            <div class="checkbox" data-name="vernacularName" data-type="Taxon" data-description="俗名、中文名" data-commonname="俗名、中文名" data-example="小花蔓澤蘭,<br>大翅鯨,<br>紫斑蝶">
                <label>
                    <input type="checkbox" name="vernacularName"/>
                    vernacularName
                </label>
            </div>
            <div class="checkbox" data-name="taxonomicStatus" data-type="Taxon" data-description="學名作為分類群標籤的使用狀況。需要分類學意見來界定分類群的範圍，然後結合專家意見，使用優先權規則來定義該範圍内所含命名的分類地位。它必須與定義該概念的具體分類參考資料相互連結" data-commonname="分類狀態" data-example="invalid,<br>misapplied,<br>homotypic synonym,<br>accepted">
                <label>
                    <input type="checkbox" name="taxonomicStatus"/>
                    taxonomicStatus
                </label>
            </div>
            <div class="checkbox" data-name="taxonRemarks" data-type="Taxon" data-description="分類註記" data-commonname="分類註記" data-example="this name is a misspelling in common use">
                <label>
                    <input type="checkbox" name="taxonRemarks"/>
                    taxonRemarks
                </label>
            </div>
        </fieldset>
        `;
    } else if (selectedCore === "samplingevent") {
        fieldsetContent += `
        <fieldset class="required-fieldset" id="samplingevent">
            <legend>資料集類型欄位：Sampling Event</legend>
                <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01 6d2dd029-f534-42e6-9805-96db874fdd3a">
                    <label>
                        <input type="checkbox" name="eventID" class="required-col" checked />
                        eventID
                    </label>
                </div>
                <div class="checkbox" data-name="eventDate" data-type="Event" data-description="該筆資料被記錄的日期。通用格式為yyyy-mm-dd，詳見範例" data-commonname="調查日期、Date、時間" data-example="「1994-11-05」代表單日；<br>「1996-06」代表 1996 年 6 月；<br>「2022-01/02」代表2022年1-2月(以 '/' 區分)；<br>「2023-05-06/12」代表2023年5月6-12日；<br>「1989/1993」代表1989-1993年">
                    <label>
                        <input type="checkbox" name="eventDate" class="required-col"checked />
                        eventDate
                    </label>
                </div>
                <div class="checkbox" data-name="samplingProtocol" data-type="Event" data-description="調查方法或流程的名稱、描述，或其參考文獻。同一筆調查活動最好不要包含超過一個調查方法，如果超過則建議分為不同筆的調查活動" data-commonname="調查方法、材料方法、Method、Sampling method" data-example="UV light trap,<br>mist net,<br>bottom trawl,<br>ad hoc observation,<br>https://doi.org/10.1111/j.1466-8238.2009.00467.x,<br>Takats et al. 2001. Guidelines for Nocturnal Owl Monitoring in North America.">
                    <label>
                        <input type="checkbox" name="samplingProtocol" class="required-col" checked />
                        samplingProtocol
                    </label>
                </div>
                <div class="checkbox" data-name="sampleSizeValue" data-type="Event" data-description="採樣調查中單次採樣的大小數值(時間間隔、長度、範圍，或體積)。須搭配 dwc:sampleSizeUnit 欄位。" data-commonname="採樣大小、採樣量、取樣大小" data-example="5 (sampleSizeValue) with metre (sampleSizeUnit)">
                    <label>
                        <input type="checkbox" name="sampleSizeValue" class="required-col" checked />
                        sampleSizeValue
                    </label>
                </div>
                <div class="checkbox" data-name="sampleSizeUnit" data-type="Event" data-description="採樣大小的量測單位" data-commonname="採樣大小單位、採樣量單位" data-example="minute,<br>day,<br>metre,<br>square metre">
                    <label>
                        <input type="checkbox" name="sampleSizeUnit" class="required-col" checked />
                        sampleSizeUnit
                    </label>
                </div>
                <div class="checkbox" data-name="samplingEffort" data-type="Event" data-description="一次調查的努力量" data-commonname="調查努力量" data-example="40 trap-nights,<br>10 observer-hours,<br>10 km by foot">
                    <label>
                        <input type="checkbox" name="samplingEffort" checked />
                        samplingEffort
                    </label>
                </div>
                <div class="checkbox" data-name="countryCode" data-type="Occurrence, Location" data-description="國家標準代碼" data-commonname="國家代碼" data-example="TW">
                    <label>
                        <input type="checkbox" name="countryCode" checked/>
                        countryCode
                    </label>
                </div>
                <div class="checkbox" data-name="decimalLatitude" data-type="Occurrence, Location" data-description="十進位緯度" data-commonname="十進位緯度" data-example="-41.0983423">
                    <label>
                        <input type="checkbox" name="decimalLatitude" checked />
                        decimalLatitude
                    </label>
                </div>
                <div class="checkbox" data-name="decimalLongitude" data-type="Occurrence, Location" data-description="十進位經度" data-commonname="十進位經度" data-example="-121.1761111">
                    <label>
                        <input type="checkbox" name="decimalLongitude" checked />
                        decimalLongitude
                    </label>
                </div>
                <div class="checkbox" data-name="geodeticDatum" data-type="Occurrence, Location" data-description="座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="大地基準、大地系統" data-example="EPSG:4326,<br>WGS84,<br>EPSG:3826 (TWD97 / TM2 臺灣),<br>EPSG:3828（TWD67 / TM2 臺灣）">
                    <label>
                        <input type="checkbox" name="geodeticDatum" checked />
                        geodeticDatum
                    </label>
                </div>
                <div class="checkbox" data-name="coordinateUncertaintyInMeters" data-type="Occurrence, Location" data-description="從給定的十進位緯度（decimalLatitude）和十進位經度（decimalLongitude）到包含整個位置的最小圓的水平距離（以公尺為單位）。如果座標不確定、無法估計或不適用（因爲没有座標），則將該值留空。零值不是該項的有效值" data-commonname="座標誤差（公尺）" data-example="30 (reasonable lower limit on or after 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time).<br>100 (reasonable lower limit before 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time).<br>71 (uncertainty for a UTM coordinate having 100 meter precision and a known spatial reference system).">
                    <label>
                        <input type="checkbox" name="coordinateUncertaintyInMeters" checked />
                        coordinateUncertaintyInMeters
                    </label>
                </div>
                <div class="checkbox" data-name="coordinatePrecision" data-type="Occurrence, Location" data-description="依據十進位緯度（decimalLatitude）和十進位經度（decimalLongitude）中給出的座標精確度的十進位表示" data-commonname="座標精準度" data-example="0.00001 (normal GPS limit for decimal degrees),<br>0.000278 (nearest second),<br>0.01667 (nearest minute),<br>1.0 (nearest degree)">
                    <label>
                        <input type="checkbox" name="coordinatePrecision"/>
                        coordinatePrecision
                    </label>
                </div>
                <div class="checkbox" data-name="parentEventID" data-type="Event" data-description="上階層調查活動ID" data-commonname="上階層調查活動ID、母事件ID" data-example="A1 (parentEventID to identify the main Whittaker Plot in nested samples, each with its own eventID - A1:1, A1:2)">
                    <label>
                        <input type="checkbox" name="parentEventID"/>
                        parentEventID
                    </label>
                </div>
                <div class="checkbox" data-name="eventTime" data-type="Event" data-description="該筆資料被記錄的時間。建議格式參考 ISO 8601-1:2019" data-commonname="調查時間" data-example="14:07-0600 (2:07 pm UTC+6),<br>08:40Z (8:40 am UTC時區),<br>13:00Z/15:30Z (1:00-3:30 pm UTC時區)">
                    <label>
                        <input type="checkbox" name="eventTime"/>
                        eventTime
                    </label>
                </div>
                <div class="checkbox" data-name="year" data-type="Event, Occurrence" data-description="西元年" data-commonname="年、西元年" data-example="1996,<br>2023">
                    <label>
                        <input type="checkbox" name="year"/>
                        year
                    </label>
                </div>
                <div class="checkbox" data-name="month" data-type="Event, Occurrence" data-description="月" data-commonname="月" data-example="11,<br>01">
                    <label>
                        <input type="checkbox" name="month"/>
                        month
                    </label>
                </div>
                <div class="checkbox" data-name="day" data-type="Event, Occurrence" data-description="日" data-commonname="日" data-example="26,<br>01">
                    <label>
                        <input type="checkbox" name="day"/>
                        day 
                    </label>
                </div>
                <div class="checkbox" data-name="verbatimEventDate" data-type="Event, Occurrence" data-description="最原始記錄且未被轉譯過的調查日期" data-commonname="字面上調查日期、原始調查日期" data-example="spring 1910,<br>Marzo 2002,<br>1999-03-XX,<br>17IV1934">
                    <label>
                        <input type="checkbox" name="verbatimEventDate"/>
                        verbatimEventDate 
                    </label>
                </div>
                <div class="checkbox" data-name="habitat" data-type="Event" data-description="調查樣區的棲地類型" data-commonname="棲地" data-example="樹,<br>灌叢,<br>道路">
                    <label>
                        <input type="checkbox" name="habitat"/>
                        habitat 
                    </label>
                </div>
                <div class="checkbox" data-name="fieldNumber" data-type="Event" data-description="在野外給此調查活動的編號" data-commonname="野外調查編號" data-example="RV Sol 87-03-08">
                    <label>
                        <input type="checkbox" name="fieldNumber"/>
                        fieldNumber 
                    </label>
                </div>
                <div class="checkbox" data-name="eventRemarks" data-type="Event" data-description="可註記天氣或調查狀況等任何文字資訊" data-commonname="調查備註" data-example="陣雨,<br>濃霧,<br>部分有雲">
                    <label>
                        <input type="checkbox" name="eventRemarks"/>
                        eventRemarks 
                    </label>
                </div>
                <div class="checkbox" data-name="continent" data-type="Location" data-description="洲" data-commonname="洲" data-example="非洲 Africa,<br>南極洲 Antarctica,<br>亞洲 Asia,<br>歐洲 Europe,<br>北美洲 North America,<br>大洋洲 Oceania,<br>南美洲 South America">
                    <label>
                        <input type="checkbox" name="continent"/>
                        continent 
                    </label>
                </div>
                <div class="checkbox" data-name="waterBody" data-type="Location" data-description="水體" data-commonname="水體" data-example="Indian Ocean,<br>Baltic Sea,<br>Hudson River,<br>Lago Nahuel Huapi">
                    <label>
                        <input type="checkbox" name="waterBody"/>
                        waterBody 
                    </label>
                </div>
                <div class="checkbox" data-name="islandGroup" data-type="Location" data-description="群島" data-commonname="群島" data-example="Alexander Archipelago,<br>Archipiélago Diego Ramírez,<br>Seychelles">
                    <label>
                        <input type="checkbox" name="islandGroup"/>
                        islandGroup 
                    </label>
                </div>
                <div class="checkbox" data-name="island" data-type="Location" data-description="島嶼" data-commonname="島嶼" data-example="Nosy Be,<br>Bikini Atoll,<br>Vancouver,<br>Viti Levu,<br>Zanzibar">
                    <label>
                        <input type="checkbox" name="island"/>
                        island 
                    </label>
                </div>
                <div class="checkbox" data-name="country" data-type="Location" data-description="國家" data-commonname="國家" data-example="Taiwan">
                    <label>
                        <input type="checkbox" name="country"/>
                        country 
                    </label>
                </div>
                <div class="checkbox" data-name="stateProvince" data-type="Location" data-description="省份/州" data-commonname="省份/州" data-example="Montana,<br>Minas Gerais,<br>Córdoba">
                    <label>
                        <input type="checkbox" name="stateProvince"/>
                        stateProvince 
                    </label>
                </div>
                <div class="checkbox" data-name="county" data-type="Location" data-description="縣市" data-commonname="縣市" data-example="Nantou County">
                    <label>
                        <input type="checkbox" name="county"/>
                        county 
                    </label>
                </div>
                <div class="checkbox" data-name="municipality" data-type="Location" data-description="行政區" data-commonname="行政區" data-example="Yuchi Township">
                    <label>
                        <input type="checkbox" name="municipality"/>
                        municipality 
                    </label>
                </div>
                <div class="checkbox" data-name="locality" data-type="Location" data-description="該筆紀錄的最小地點描述" data-commonname="地區" data-example="Sun Moon Lake">
                    <label>
                        <input type="checkbox" name="locality"/>
                        locality 
                    </label>
                </div>
                <div class="checkbox" data-name="minimumElevationInMeters" data-type="Location" data-description="最低海拔（公尺）" data-commonname="最低海拔（公尺）" data-example="-100,<br>3952">
                    <label>
                        <input type="checkbox" name="minimumElevationInMeters"/>
                        minimumElevationInMeters 
                    </label>
                </div>
                <div class="checkbox" data-name="maximumElevationInMeters" data-type="Location" data-description="最高海拔（公尺）" data-commonname="最高海拔（公尺）" data-example="-205,<br>1236">
                    <label>
                        <input type="checkbox" name="maximumElevationInMeters"/>
                        maximumElevationInMeters 
                    </label>
                </div>
                <div class="checkbox" data-name="minimumDepthInMeters" data-type="Location" data-description="最小深度（公尺）" data-commonname="最小深度（公尺）" data-example="0,<br>100">
                    <label>
                        <input type="checkbox" name="minimumDepthInMeters"/>
                        minimumDepthInMeters 
                    </label>
                </div>
                <div class="checkbox" data-name="maximumDepthInMeters" data-type="Location" data-description="最大深度（公尺）" data-commonname="最大深度（公尺）" data-example="0,<br>200">
                    <label>
                        <input type="checkbox" name="maximumDepthInMeters"/>
                        maximumDepthInMeters 
                    </label>
                </div>
                <div class="checkbox" data-name="locationRemarks" data-type="Location" data-description="地區註記" data-commonname="字面地區註記上深度" data-example="under water since 2005">
                    <label>
                        <input type="checkbox" name="locationRemarks"/>
                        locationRemarks 
                    </label>
                </div>
                <div class="checkbox" data-name="verbatimCoordinates" data-type="Location" data-description="字面上座標，意即最初採集或觀測取得紀錄的經度和緯度，且尚未被轉譯過，任何座標系統皆可" data-commonname="字面上座標" data-example="41 05 54S 121 05 34W, 17T 630000 4833400">
                    <label>
                        <input type="checkbox" name="verbatimCoordinates"/>
                        verbatimCoordinates
                    </label>
                </div>
                <div class="checkbox" data-name="verbatimLatitude" data-type="Location" data-description="字面緯度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="字面上緯度" data-example="41d 16’N">
                    <label>
                        <input type="checkbox" name="verbatimLatitude"/>
                        verbatimLatitude
                    </label>
                </div>
                <div class="checkbox" data-name="verbatimLongitude" data-type="Location" data-description="字面經度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="字面上經度" data-example="121d 10’ 34" W">
                    <label>
                        <input type="checkbox" name="verbatimLongitude"/>
                        verbatimLongitude
                    </label>
                </div>
                <div class="checkbox" data-name="verbatimCoordinateSystem" data-type="Location" data-description="紀錄的座標單位" data-commonname="字面上座標格式" data-example="decimal degrees,<br>degrees decimal minutes,<br>degrees minutes seconds">
                    <label>
                        <input type="checkbox" name="verbatimCoordinateSystem"/>
                        verbatimCoordinateSystem
                    </label>
                </div>
                <div class="checkbox" data-name="verbatimSRS" data-type="Location" data-description="字面上座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="字面上空間參照系統" data-example="unknown,<br>EPSG:4326,<br>WGS84,<br>NAD27,<br>Campo Inchauspe,<br>European 1950,<br>Clarke 1866">
                    <label>
                        <input type="checkbox" name="verbatimSRS"/>
                        verbatimSRS
                    </label>
                </div>
                <div class="checkbox" data-name="footprintWKT" data-type="Location" data-description="一個位置可能既有點半徑表示法（見十進位緯度），也有足跡表示法，兩者可能互不相同。若該筆紀錄無法以一個點位或點半徑記錄，則可參考使用此欄位" data-commonname="地理足跡WKT" data-example="epsg:4326, GEOGCS['GCS_WGS_1984', DATUM['D_WGS_1984', SPHEROID['WGS_1984',6378137,298.257223563]], PRIMEM['Greenwich',0], UNIT['Degree',0.0174532925199433]] (WKT for the standard WGS84 Spatial Reference System EPSG:4326)">
                    <label>
                        <input type="checkbox" name="footprintWKT"/>
                        footprintWKT
                    </label>
                </div>
                <div class="checkbox" data-name="type" data-type="Record-level" data-description="該筆資源/媒體的性質或類型，必須填入 DCMI 類型詞彙表中的值(http://dublincore.org/documents/2010/10/11/dcmi-type-vocabulary/)" data-commonname="資源類型、媒體類型" data-example="靜態影像 StillImage,<br>動態影像 MovingImage,<br>聲音 Sound,<br>實體物件 PhysicalObject,<br>事件 Event,<br>文字 Text">
                    <label>
                        <input type="checkbox" name="type"/>
                        type
                    </label>
                </div>
                <div class="checkbox" data-name="modified" data-type="Record-level" data-description="該筆紀錄最近被修改的日期時間" data-commonname="紀錄修改時間" data-example="1963-03-08T14:07-0600 (1963年3月8日 2:07 pm UTC+6),<br>2009-02-20T08:40Z (2009年2月20日 8:40 am UTC時區),<br>2018-08-29T15:19 (2018年8月29日 3:15 pm 當地時間),<br>1809-02-12 (只顯示日期),<br>1906-06 (只顯示到月份),<br>2007-11-13/15 (用'/'表示某個日期區段)">
                    <label>
                        <input type="checkbox" name="modified"/>
                        modified
                    </label>
                </div>
                <div class="checkbox" data-name="language" data-type="Record-level" data-description="該紀錄所用的語言，建議使用控制詞彙(RFC 5646標準)" data-commonname="語言" data-example="en (英文),<br>zh-TW (繁體中文)">
                    <label>
                        <input type="checkbox" name="language"/>
                        language
                    </label>
                </div>
                <div class="checkbox" data-name="license" data-type="Record-level" data-description="正式允許對資料進行操作的一份法律授權文件。這裡所用的授權主要為創用CC授權，須使用控制詞彙" data-commonname="授權標示、資料授權" data-example="CC0 1.0, <br>CC BY 4.0 ,<br>CC BY-NC 4.0,<br>無授權標示, <br>無法辨識">
                    <label>
                        <input type="checkbox" name="license"/>
                        license
                    </label>
                </div>
                <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="擁有或管理資料權利的個人或組織" data-commonname="所有權、所有權人" data-example="Taiwan Biodiversity Information Facility, TaiBIF<br>National Taiwan University, NTU<br>Forestry and Nature Conservation Agency">
                    <label>
                        <input type="checkbox" name="rightsHolder"/>
                        rightsHolder
                    </label>
                </div>
                <div class="checkbox" data-name="bibliographicCitation" data-type="Record-level" data-description="此筆資料的引用方式" data-commonname="資料引用方式" data-example="Museum of Vertebrate Zoology, UC Berkeley. MVZ Mammal Collection (Arctos). Record ID: http://arctos.database.museum/guid/MVZ:Mamm:165861?seid=101356.">
                    <label>
                        <input type="checkbox" name="bibliographicCitation"/>
                        bibliographicCitation
                    </label>
                </div>
                <div class="checkbox" data-name="references" data-type="Record-level" data-description="被描述的資源參考、引用或以其他方式指向的相關資源" data-commonname="資料參考來源、參考文獻、參考資源、參考來源" data-example="http://arctos.database.museum/guid/MVZ:Mamm:165861 (MaterialEntity example),<br>https://www.catalogueoflife.org/data/taxon/32664 (Taxon example)">
                    <label>
                        <input type="checkbox" name="references"/>
                        references
                    </label>
                </div>
                <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="該筆紀錄在來源資料集中的ID，最好為全球唯一或於該發布機構唯一的ID" data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
                    <label>
                        <input type="checkbox" name="datasetID"/>
                        datasetID
                    </label>
                </div>
                <div class="checkbox" data-name="datasetName" data-type="Record-level" data-description="該筆紀錄來源的資料集名稱" data-commonname="資料集名稱、來源計畫名稱" data-example="Taiwan Wild Bird Federation Bird Records Database,<br>Data-set of Moth Specimen from TESRI">
                    <label>
                        <input type="checkbox" name="datasetName"/>
                        datasetName
                    </label>
                </div>
                <div class="checkbox" data-name="institutionCode" data-type="Record-level" data-description="發布機構所使用的名稱（博物館）代碼或縮寫" data-commonname="機構代碼" data-example="GBIF,<br>TaiBIF,<br>NTM,<br>NSTC">
                    <label>
                        <input type="checkbox" name="institutionCode"/>
                        institutionCode
                    </label>
                </div>
                <div class="checkbox" data-name="informationWithheld" data-type="Record-level" data-description="若有隸屬於此資料集但尚未開放的其他資訊，可在此欄位補充" data-commonname="隱藏資訊" data-example="location information not given for endangered species,<br>collector identities withheld | ask about tissue samples">
                    <label>
                        <input type="checkbox" name="informationWithheld"/>
                        informationWithheld
                    </label>
                </div>
                <div class="checkbox" data-name="dataGeneralizations" data-type="Record-level" data-description="針對共享資料採取的措施，使其比原始形式更不具體或完整（如將點位模糊化）。可表明若有需要更高品質的替代資料可提出申請" data-commonname="資料模糊化、屏蔽資料" data-example="Coordinates generalized from original GPS coordinates to the nearest half degree grid cell">
                    <label>
                        <input type="checkbox" name="dataGeneralizations"/>
                        dataGeneralizations
                    </label>
                </div>
        </fieldset>
        `;
    } else if (selectedCore === "checklist") {
        fieldsetContent += `
        <fieldset class="required-fieldset" id="checklist">
            <legend>資料集類型欄位：Chescklist</legend>
                <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                    <label>
                        <input type="checkbox" name="taxonID" class="required-col" checked />
                        taxonID
                    </label>
                </div>
                <div class="checkbox" data-name="scientificName" data-type="Taxon, Occurrence" data-description="完整的學名，包括已知的作者和日期資訊。若是作為鑑定的一部分，應是可確定的最低分類階層的名稱" data-commonname="學名、Name、名字" data-example="Coleoptera (目),<br>Vespertilionidae (科),<br>Manis (屬),<br>Ctenomys sociabilis (屬 + 種小名),<br>Ambystoma tigrinum diaboli (屬 +種小名 + 亞種小名),<br>Roptrocerus typographi (Györfi, 1952) (屬 + 種小名 + 學名命名者),<br>Quercus agrifolia var. oxyadenia (Torr.) J.T.">
                    <label>
                        <input type="checkbox" name="scientificName" class="required-col" checked />
                        scientificName
                    </label>
                </div>
                <div class="checkbox" data-name="taxonRank" data-type="Taxon" data-description="與dwc:scientificName欄位搭配，填上該筆紀錄的最低分類位階" data-commonname="分類位階、分類階層" data-example="genus,<br>species,<br>subspecies,<br>family">
                    <label>
                        <input type="checkbox" name="taxonRank" class="required-col" checked />
                        taxonRank
                    </label>
                </div>
                <div class="checkbox" data-name="modified" data-type="Record-level" data-description="該筆紀錄最近被修改的日期時間" data-commonname="紀錄修改時間" data-example="1963-03-08T14:07-0600 (1963年3月8日 2:07 pm UTC+6),<br>2009-02-20T08:40Z (2009年2月20日 8:40 am UTC時區),<br>2018-08-29T15:19 (2018年8月29日 3:15 pm 當地時間),<br>1809-02-12 (只顯示日期),<br>1906-06 (只顯示到月份),<br>2007-11-13/15 (用'/'表示某個日期區段)">
                <label>
                    <input type="checkbox" name="modified" checked/>
                    modified
                </label>
                </div>
                <div class="checkbox" data-name="language" data-type="Record-level" data-description="該紀錄所用的語言，建議使用控制詞彙(RFC 5646標準)" data-commonname="語言" data-example="en (英文),<br>zh-TW (繁體中文)">
                    <label>
                        <input type="checkbox" name="language" checked/>
                        language
                    </label>
                </div>
                <div class="checkbox" data-name="license" data-type="Record-level" data-description="正式允許對資料進行操作的一份法律授權文件。這裡所用的授權主要為創用CC授權，須使用控制詞彙" data-commonname="授權標示、資料授權" data-example="CC0 1.0, <br>CC BY 4.0 ,<br>CC BY-NC 4.0,<br>無授權標示, <br>無法辨識">
                    <label>
                        <input type="checkbox" name="license" checked/>
                        license
                    </label>
                </div>
                <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="擁有或管理資料權利的個人或組織" data-commonname="所有權、所有權人" data-example="Taiwan Biodiversity Information Facility, TaiBIF<br>National Taiwan University, NTU<br>Forestry and Nature Conservation Agency">
                    <label>
                        <input type="checkbox" name="rightsHolder" checked/>
                        rightsHolder
                    </label>
                </div>
                <div class="checkbox" data-name="bibliographicCitation" data-type="Record-level" data-description="此筆資料的引用方式" data-commonname="資料引用方式" data-example="Museum of Vertebrate Zoology, UC Berkeley. MVZ Mammal Collection (Arctos). Record ID: http://arctos.database.museum/guid/MVZ:Mamm:165861?seid=101356.">
                    <label>
                        <input type="checkbox" name="bibliographicCitation" checked/>
                        bibliographicCitation
                    </label>
                </div>
                <div class="checkbox" data-name="references" data-type="Record-level" data-description="被描述的資源參考、引用或以其他方式指向的相關資源" data-commonname="資料參考來源、參考文獻、參考資源、參考來源" data-example="http://arctos.database.museum/guid/MVZ:Mamm:165861 (MaterialEntity example),<br>https://www.catalogueoflife.org/data/taxon/32664 (Taxon example)">
                    <label>
                        <input type="checkbox" name="references" checked/>
                        references
                    </label>
                </div>
                <div class="checkbox" data-name="institutionCode" data-type="Record-level" data-description="發布機構所使用的名稱（博物館）代碼或縮寫" data-commonname="機構代碼" data-example="GBIF,<br>TaiBIF,<br>NTM,<br>NSTC">
                    <label>
                        <input type="checkbox" name="institutionCode" checked/>
                        institutionCode
                    </label>
                </div>
                <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="該筆紀錄在來源資料集中的ID，最好為全球唯一或於該發布機構唯一的ID" data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
                    <label>
                        <input type="checkbox" name="datasetID" checked/>
                        datasetID
                    </label>
                </div>
                <div class="checkbox" data-name="datasetName" data-type="Record-level" data-description="該筆紀錄來源的資料集名稱" data-commonname="資料集名稱、來源計畫名稱" data-example="Taiwan Wild Bird Federation Bird Records Database,<br>Data-set of Moth Specimen from TESRI">
                    <label>
                        <input type="checkbox" name="datasetName" checked/>
                        datasetName
                    </label>
                </div>
                <div class="checkbox" data-name="kingdom" data-type="Taxon" data-description="界" data-commonname="界" data-example="Animalia,<br>Archaea,<br>Bacteria,<br>Chromista,<br>Fungi,<br>Plantae,<br>Protozoa,<br>Viruses">
                    <label>
                        <input type="checkbox" name="kingdom" checked />
                        kingdom 
                    </label>
                </div>
                <div class="checkbox" data-name="phylum" data-type="Taxon" data-description="門" data-commonname="門" data-example="Chordata (phylum),<br>Bryophyta (division)">
                    <label>
                        <input type="checkbox" name="phylum"/>
                        phylum 
                    </label>
                </div>
                <div class="checkbox" data-name="class" data-type="Taxon" data-description="綱" data-commonname="綱" data-example="Mammalia,<br>Hepaticopsida">
                    <label>
                        <input type="checkbox" name="class"/>
                        class 
                    </label>
                </div>
                <div class="checkbox" data-name="order" data-type="Taxon" data-description="目" data-commonname="目" data-example="Carnivora,<br>Monocleales">
                    <label>
                        <input type="checkbox" name="order"/>
                        order 
                    </label>
                </div>
                <div class="checkbox" data-name="family" data-type="Taxon" data-description="科" data-commonname="科" data-example="Felidae,<br>Monocleaceae">
                    <label>
                        <input type="checkbox" name="family"/>
                        family 
                    </label>
                </div>
                <div class="checkbox" data-name="subfamily" data-type="Taxon" data-description="亞科" data-commonname="亞科" data-example="Periptyctinae,<br>Orchidoideae,<br>Sphindociinae">
                    <label>
                        <input type="checkbox" name="subfamily"/>
                        subfamily 
                    </label>
                </div>
                <div class="checkbox" data-name="genus" data-type="Taxon" data-description="屬" data-commonname="屬" data-example="Puma,<br>Monoclea">
                    <label>
                        <input type="checkbox" name="genus"/>
                        genus 
                    </label>
                </div>
                <div class="checkbox" data-name="subgenus" data-type="Taxon" data-description="亞屬" data-commonname="亞屬" data-example="Strobus,<br>Amerigo,<br>Pilosella">
                    <label>
                        <input type="checkbox" name="subgenus"/>
                        subgenus 
                    </label>
                </div>
                <div class="checkbox" data-name="infragenericEpithet" data-type="Taxon" data-description="屬以下別名" data-commonname="屬以下別名" data-example="Abacetillus (for scientificName Abacetus (Abacetillus) ambiguus),<br>Cracca (for scientificName Vicia sect. Cracca)">
                    <label>
                        <input type="checkbox" name="infragenericEpithet"/>
                        infragenericEpithet 
                    </label>
                </div>
                <div class="checkbox" data-name="specificEpithet" data-type="Taxon" data-description="種小名" data-commonname="種小名" data-example="concolor,<br>gottschei">
                    <label>
                        <input type="checkbox" name="specificEpithet"/>
                        specificEpithet 
                    </label>
                </div>
                <div class="checkbox" data-name="infraspecificEpithet" data-type="Taxon" data-description="種以下別名" data-commonname="種以下別名" data-example="concolor (for scientificName Puma concolor concolor (Linnaeus, 1771)),<br>oxyadenia (for scientificName Quercus agrifolia var. oxyadenia (Torr.) J.T. Howell),<br>laxa (for scientificName Cheilanthes hirta f. laxa (Kunze) W.Jacobsen & N.Jacobsen),<br>scaberrima (for scientificName Indigofera charlieriana var. scaberrima (Schinz) J.B.Gillett)">
                    <label>
                        <input type="checkbox" name="infraspecificEpithet"/>
                        infraspecificEpithet 
                    </label>
                </div>
                <div class="checkbox" data-name="cultivarEpithet" data-type="Taxon" data-description="栽培種小名" data-commonname="栽培種小名" data-example="King Edward (for scientificName Solanum tuberosum 'King Edward' and taxonRank cultivar),<br>Mishmiense (for scientificName Rhododendron boothii Mishmiense Group and taxonRank cultivar group),<br>Atlantis (for scientificName Paphiopedilum Atlantis grex and taxonRank grex)">
                    <label>
                        <input type="checkbox" name="cultivarEpithet"/>
                        cultivarEpithet 
                    </label>
                </div>
                <div class="checkbox" data-name="informationWithheld" data-type="Record-level" data-description="若有隸屬於此資料集但尚未開放的其他資訊，可在此欄位補充" data-commonname="隱藏資訊" data-example="location information not given for endangered species,<br>collector identities withheld | ask about tissue samples">
                    <label>
                        <input type="checkbox" name="informationWithheld"/>
                        informationWithheld
                    </label>
                </div>
                <div class="checkbox" data-name="scientificNameAuthorship" data-type="Taxon" data-description="學名命名者" data-commonname="學名命名者" data-example="(Torr.) J.T. Howell, (Martinovský) Tzvelev,<br>(Györfi, 1952)">
                    <label>
                        <input type="checkbox" name="scientificNameAuthorship"/>
                        scientificNameAuthorship
                    </label>
                </div>
                <div class="checkbox" data-name="vernacularName" data-type="Taxon" data-description="俗名、中文名" data-commonname="俗名、中文名" data-example="小花蔓澤蘭,<br>大翅鯨,<br>紫斑蝶">
                    <label>
                        <input type="checkbox" name="vernacularName"/>
                        vernacularName
                    </label>
                </div>
                <div class="checkbox" data-name="taxonRemarks" data-type="Taxon" data-description="分類註記" data-commonname="分類註記" data-example="this name is a misspelling in common use">
                    <label>
                        <input type="checkbox" name="taxonRemarks"/>
                        taxonRemarks
                    </label>
                </div>
        </fieldset>
        `;
    }

    if (selectedTheme === "ecological-survey") {
        const themeTemplateName = $("#theme option:selected").text();
        fieldsetContent += `
        <fieldset>
            <legend>主題欄位：${themeTemplateName}</legend>
            <div class="checkbox" data-name="fieldNumber" data-type="Event" data-description="An identifier given to the dwc:Event in the field. Often serves as a link between field notes and the dwc:Event." data-commonname="調查區域、區域編號" data-example="A-國家生技研究園區（開發區）,<br>B-生態研究區,<br>C-其餘位於202兵工廠之範圍">
                <label>
                    <input type="checkbox" name="fieldNumber"/>
                    fieldNumber
                </label>
            </div>
            <div class="checkbox" data-name="habitat" data-type="Event" data-description="A category or description of the habitat in which the dwc:Event occurred." data-commonname="棲地" data-example="樹,<br>灌叢,<br>道路">
                <label>
                    <input type="checkbox" name="habitat"/>
                    habitat
                </label>
            </div>
            <div class="checkbox" data-name="eventRemarks" data-type="Event" data-description="可註記天氣或調查狀況等任何文字資訊" data-commonname="調查備註" data-example="陣雨,<br>濃霧,<br>部分有雲">
                <label>
                    <input type="checkbox" name="eventRemarks"/>
                    eventRemarks
                </label>
            </div>
        </fieldset>
        `;
    }

    if (selectedTheme === "parasite") {
        const themeTemplateName = $("#theme option:selected").text();
        fieldsetContent += `
        <fieldset>
            <legend>主題欄位：${themeTemplateName}</legend>
            <div class="checkbox" data-name="scientificName" data-type="Taxon" data-description="完整的學名，包括已知的作者和日期資訊。若是作為鑑定的一部分，應是可確定的最低分類階層的名稱" data-commonname="學名、Name、名字" data-example="Coleoptera (目),<br>Vespertilionidae (科),<br>Manis (屬),<br>Ctenomys sociabilis (屬 + 種小名),<br>Ambystoma tigrinum diaboli (屬 +種小名 + 亞種小名),<br>Roptrocerus typographi (Györfi, 1952) (屬 + 種小名 + 學名命名者),<br>Quercus agrifolia var. oxyadenia (Torr.) J.T.">
                <label>
                    <input type="checkbox" name="scientificName"/>
                    scientificName
                </label>
            </div>
            <div class="checkbox" data-name="taxonRank" data-type="Taxon" data-description="物種的分類階層" data-commonname="分類階層" data-example="genus,<br>species,<br>subspecies,<br>family">
                <label>
                    <input type="checkbox" name="taxonRank"/>
                    taxonRank
                </label>
            </div>
            <div class="checkbox" data-name="order" data-type="Taxon" data-description="The full scientific name of the order in which the taxon is classified." data-commonname="目" data-example="Carnivora,<br>Monocleales">
                <label>
                    <input type="checkbox" name="order"/>
                    order
                </label>
            </div>
            <div class="checkbox" data-name="vernacularName" data-type="Taxon" data-description="A common or vernacular name." data-commonname="俗名" data-example="Andean Condor,<br>Condor Andino,<br>American Eagle,<br>Gänsegeier">
                <label>
                    <input type="checkbox" name="vernacularName"/>
                    vernacularName
                </label>
            </div>
            <div class="checkbox" data-name="verbatimSRS" data-type="Location" data-description="The ellipsoid, geodetic datum, or spatial reference system (SRS) upon which coordinates given in verbatimLatitude and verbatimLongitude, or verbatimCoordinates are based." data-commonname="字面上空間參照系統" data-example="unknown,<br>EPSG:4326,<br>WGS84,<br>NAD27,<br>Campo Inchauspe,<br>European 1950,<br>Clarke 1866">
                <label>
                    <input type="checkbox" name="verbatimSRS"/>
                    verbatimSRS
                </label>
            </div>
            <div class="checkbox" data-name="coordinateUncertaintyInMeters" data-type="Location" data-description="The horizontal distance (in meters) from the given decimalLatitude and decimalLongitude describing the smallest circle containing the whole of the Location. Leave the value empty if the uncertainty is unknown, cannot be estimated, or is not applicable (because there are no coordinates). Zero is not a valid value for this term." data-commonname="座標誤差（公尺）" data-example="30 (reasonable lower limit on or after 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time),<br>100 (reasonable lower limit before 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time),<br>71 (uncertainty for a UTM coordinate having 100 meter precision and a known spatial reference system)">
                <label>
                    <input type="checkbox" name="coordinateUncertaintyInMeters"/>
                    coordinateUncertaintyInMeters
                </label>
            </div>
            <div class="checkbox" data-name="county" data-type="Location" data-description="The name of the next smaller administrative region than country (state, province, canton, department, region, etc.) in which the Location occurs." data-commonname="縣市" data-example="Nantou County">
                <label>
                    <input type="checkbox" name="county"/>
                    county
                </label>
            </div>
            <div class="checkbox" data-name="country" data-type="Location" data-description="The name of the country or major administrative unit in which the Location occurs." data-commonname="國家" data-example="Taiwan">
                <label>
                    <input type="checkbox" name="country"/>
                    country
                </label>
            </div>
            <div class="checkbox" data-name="recordedBy" data-type="Occurrence" data-description="記錄此資料的人或最初的觀察者，可以是個人、一份名單、一個群體、一個組織" data-commonname="記錄者、採集者" data-example="Melissa Liu | Daphne Hoh">
                <label>
                    <input type="checkbox" name="recordedBy"/>
                    recordedBy
                </label>
            </div>
        </fieldset>
        `;
    }

    if (selectedCustom !== '') {
        // console.log(selectedCustom)
        // var checkboxNames = selectedCustom.split(',');
        // console.log(checkboxNames)
        
        var customTemplateName = $("#custom option:selected").text();
        var fieldsetContent = `<fieldset id="custom-core" class="required-fieldset"><legend>${customTemplateName}：資料集類型欄位</legend>`;
        var customExtensionFieldsetContent = '';

        const storedData = JSON.parse(localStorage.getItem(customTemplateName));

        for (const key in storedData) {
            if (Array.isArray(storedData[key])) {
                console.log(`${key}:`, storedData[key]);
                if (['checklist', 'samplingevent', 'occurrence'].includes(key)) {
                    for (let i = 0; i < storedData[key].length; i++) {
                        fieldsetContent += `
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" name="${storedData[key][i]}" checked />
                                    ${storedData[key][i]}
                                </label>
                            </div>
                        `;
                    }
                } else if (['darwin-core-occurrence', 'simple-multimedia', 'extended-measurement-or-facts', 'resource-relationship', 'dna-derived-data'].includes(key)) {
                    customExtensionFieldsetContent += `<fieldset id="${key}"><legend>${customTemplateName} ${key}：延伸資料集欄位</legend>`;
                    for (let i = 0; i < storedData[key].length; i++) {
                        customExtensionFieldsetContent += `
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" name="${storedData[key][i]}" checked />
                                    ${storedData[key][i]}
                                </label>
                            </div>
                        `;
                    }
                    customExtensionFieldsetContent += '</fieldset>';
                }
            }
        }
        customExtensionFieldsetContent += '</fieldset>';
        $("#extensionFieldset").html(customExtensionFieldsetContent);
        fieldsetContent += '</fieldset>';
    } else {
        $("#customFieldset").html('');
    }

    $("#requiredFieldset").html(fieldsetContent);

    // 鎖定必填欄位的選項
    // $('.required-fieldset input[type="checkbox"]').prop('disabled', true);

    if ($('#requiredFieldset').children().length > 0) {
        $('.checkbox-container').removeClass('border-none');
    }
}

// 功能：更新 fieldset 的內容，包含延伸資料集
function updateExtensionFieldsetContent() {
    const selectedExtension = $(".extension-container .fs-option.selected").map(function() {
        return $(this).data('value');
    }).get();

    var fieldsetContent = "";

    if (selectedExtension.includes("darwin-core-occurrence")) {
        fieldsetContent += `
        <fieldset id="darwin-core-occurrence">
            <legend>延伸資料集欄位：Darwin Core Occurrence</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="eventID" class="required-col key-col" checked/>
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號在此資料集中不可有重複。" data-commonname="ID、編號" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="occurrenceID" class="required-col key-col" checked/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="taxonID" class="required-col key-col" checked/>
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="basisOfRecord" data-type="Record-level" data-description="資料紀錄的特定性質、類型，建議使用 Darwin Core 的控制詞彙" data-commonname="紀錄類型" data-example="材料實體 MaterialEntity,<br>保存標本 PreservedSpecimen,<br>化石標本 FossilSpecimen,<br>活體標本 LivingSpecimen,<br>人為觀測 HumanObservation,<br>材料樣本 MaterialSample,<br>機器觀測 MachineObservation,<br>調查活動 Event,<br>名錄/分類群 Taxon,<br>出現紀錄 Occurrence,<br>文獻紀錄 MaterialCitation">
                <label>
                    <input type="checkbox" name="basisOfRecord" class="required-col" checked/>
                    basisOfRecord
                </label>
            </div>
            <div class="checkbox" data-name="eventDate" data-type="Event" data-description="該筆資料被記錄的日期。通用格式為yyyy-mm-dd，詳見範例" data-commonname="調查日期、Date、日期" data-example="「1994-11-05」代表單日；,<br>「1996-06」代表 1996 年 6 月；,<br>「2022-01/02」代表2022年1-2月(以 '/' 區分)；,<br>「2023-05-06/12」代表2023年5月6-12日；,<br>「1989/1993」代表1989-1993年">
                <label>
                    <input type="checkbox" name="eventDate" class="required-col" checked/>
                    eventDate
                </label>
            </div>
            <div class="checkbox" data-name="samplingProtocol" data-type="Event" data-description="調查方法或流程的名稱、描述，或其參考文獻。同一筆調查活動最好不要包含超過一個調查方法，如果超過則建議分為不同筆的調查活動" data-commonname="調查方法、材料方法、Method、Sampling method" data-example="UV light trap,<br>mist net,<br>bottom trawl,<br>ad hoc observation,<br>https://doi.org/10.1111/j.1466-8238.2009.00467.x,<br>Takats et al. 2001. Guidelines for Nocturnal Owl Monitoring in North America.">
                <label>
                    <input type="checkbox" name="samplingProtocol" class="required-col" checked/>
                    samplingProtocol
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeValue" data-type="Event" data-description="採樣調查中單次採樣的大小數值(時間間隔、長度、範圍，或體積)。須搭配  dwc:sampleSizeUnit 欄位" data-commonname="採樣大小、採樣量、取樣大小" data-example="5 (sampleSizeValue) with metre (sampleSizeUnit)">
                <label>
                    <input type="checkbox" name="sampleSizeValue" class="required-col" checked/>
                    sampleSizeValue
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeUnit" data-type="Event" data-description="採樣大小的量測單位" data-commonname="採樣大小單位、採樣量單位" data-example="minute,<br>day,<br>metre,<br>square metre">
                <label>
                    <input type="checkbox" name="sampleSizeUnit" class="required-col" checked/>
                    sampleSizeUnit
                </label>
            </div>
            <div class="checkbox" data-name="scientificName" data-type="Taxon" data-description="完整的學名，包括已知的作者和日期資訊。若是作為鑑定的一部分，應是可確定的最低分類階層的名稱" data-commonname="學名" data-example="Coleoptera (目),<br>Vespertilionidae (科),<br>Manis (屬),<br>Ctenomys sociabilis (屬 + 種小名),<br>Ambystoma tigrinum diaboli (屬 +種小名 + 亞種小名),<br>Roptrocerus typographi (Györfi, 1952) (屬 + 種小名 + 學名命名者),<br>Quercus agrifolia var. oxyadenia (Torr.) J.T.">
                <label>
                    <input type="checkbox" name="scientificName" class="required-col" checked/>
                    scientificName
                </label>
            </div>
            <div class="checkbox" data-name="kingdom" data-type="Taxon" data-description="界" data-commonname="界" data-example="Animalia,<br>Archaea,<br>Bacteria,<br>Chromista,<br>Fungi,<br>Plantae,<br>Protozoa,<br>Viruses">
                <label>
                    <input type="checkbox" name="kingdom" class="required-col" checked/>
                    kingdom
                </label>
            </div>
            <div class="checkbox" data-name="taxonRank" data-type="Taxon" data-description="與dwc:scientificName欄位搭配，填上該筆紀錄的最低分類位階" data-commonname="分類位階、分類階層" data-example="genus,<br>species,<br>subspecies,<br>family">
                <label>
                    <input type="checkbox" name="taxonRank" class="required-col" checked/>
                    taxonRank
                </label>
            </div>
            <div class="checkbox" data-name="samplingEffort" data-type="Event" data-description="一次調查的努力量" data-commonname="調查努力量" data-example="40 trap-nights,<br>10 observer-hours,<br>10 km by foot">
                <label>
                    <input type="checkbox" name="samplingEffort" checked/>
                    samplingEffort
                </label>
            </div>
            <div class="checkbox" data-name="countryCode" data-type="Location" data-description="國家標準代碼" data-commonname="國家代碼" data-example="TW">
                <label>
                    <input type="checkbox" name="countryCode" checked/>
                    countryCode
                </label>
            </div>
            <div class="checkbox" data-name="decimalLatitude" data-type="Location" data-description="十進位緯度" data-commonname="十進位緯度" data-example="-41.0983423">
                <label>
                    <input type="checkbox" name="decimalLatitude" checked/>
                    decimalLatitude
                </label>
            </div>
            <div class="checkbox" data-name="decimalLongitude" data-type="Location" data-description="十進位經度" data-commonname="十進位經度" data-example="-121.1761111">
                <label>
                    <input type="checkbox" name="decimalLongitude" checked/>
                    decimalLongitude
                </label>
            </div>
            <div class="checkbox" data-name="geodeticDatum" data-type="Location" data-description="座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="大地基準、大地系統" data-example="EPSG:4326,<br>WGS84,<br>EPSG:3826 (TWD97 / TM2 臺灣),<br>EPSG:3828（TWD67 / TM2 臺灣）">
                <label>
                    <input type="checkbox" name="geodeticDatum" checked/>
                    geodeticDatum
                </label>
            </div>
            <div class="checkbox" data-name="coordinateUncertaintyInMeters" data-type="Location" data-description="從給定的十進位緯度（decimalLatitude）和十進位經度（decimalLongitude）到包含整個位置的最小圓的水平距離（以公尺為單位）。如果座標不確定、無法估計或不適用（因爲没有座標），則將該值留空。零值不是該項的有效值。" data-commonname="座標誤差（公尺）" data-example="30 (reasonable lower limit on or after 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time),<br>100 (reasonable lower limit before 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time),<br>71 (uncertainty for a UTM coordinate having 100 meter precision and a known spatial reference system)">
                <label>
                    <input type="checkbox" name="coordinateUncertaintyInMeters" checked/>
                    coordinateUncertaintyInMeters
                </label>
            </div>
            <div class="checkbox" data-name="recordedBy" data-type="Occurrence" data-description="記錄此資料的人或最初的觀察者，可以是個人、一份名單、一個群體、一個組織" data-commonname="記錄者" data-example="José E. Crespo. Oliver P. Pearson | Anita K. Pearson (where the value in recordNumber OPP 7101 corresponds to the collector number for the specimen in the field catalog of Oliver P. Pearson)">
                <label>
                    <input type="checkbox" name="recordedBy" checked/>
                    recordedBy
                </label>
            </div>
            <div class="checkbox" data-name="individualCount" data-type="Occurrence" data-description="出現紀錄被記錄時存在的個體數量，只能為正整數" data-commonname="個體數量" data-example="0, 1, 25">
                <label>
                    <input type="checkbox" name="individualCount" checked/>
                    individualCount
                </label>
            </div>
            <div class="checkbox" data-name="organismQuantity" data-type="Occurrence" data-description="該筆紀錄所包含的生物體的量，若非正整數時可用此欄位記錄。須與dwc: organismQuantityType 搭配使用。" data-commonname="生物體數量" data-example="27 (organismQuantity) with individuals (organismQuantityType),<br>12.5 (organismQuantity) with % biomass (organismQuantityType),<br>r (organismQuantity) with Braun Blanquet Scale (organismQuantityType),<br>many (organismQuantity) with individuals (organismQuantityType).">
                <label>
                    <input type="checkbox" name="organismQuantity" checked/>
                    organismQuantity
                </label>
            </div>
            <div class="checkbox" data-name="organismQuantityType" data-type="Occurrence" data-description="生物體數量的單位，若非正整數時可用此欄位記錄。" data-commonname="生物體數量單位" data-example="27 (organismQuantity) with individuals (organismQuantityType),<br>12.5 (organismQuantity) with % biomass (organismQuantityType),<br>r (organismQuantity) with Braun Blanquet Scale (organismQuantityType)">
                <label>
                    <input type="checkbox" name="organismQuantityType" checked/>
                    organismQuantityType
                </label>
            </div>
            <div class="checkbox" data-name="parentEventID" data-type="Event" data-description="上階層調查活動ID" data-commonname="上階層調查活動ID、母事件ID" data-example="A1 (parentEventID to identify the main Whittaker Plot in nested samples, each with its own eventID - A1:1, A1:2)">
                <label>
                    <input type="checkbox" name="parentEventID" />
                    parentEventID
                </label>
            </div>
            <div class="checkbox" data-name="fieldNumber" data-type="Event" data-description="在野外給此調查活動的編號" data-commonname="野外調查編號" data-example="RV Sol 87-03-08">
                <label>
                    <input type="checkbox" name="fieldNumber" />
                    fieldNumber
                </label>
            </div>
            <div class="checkbox" data-name="eventTime" data-type="Event" data-description="該筆資料被記錄的時間。建議格式參考 ISO 8601-1:2019" data-commonname="調查時間" data-example="14:07-0600 (2:07 pm UTC+6),<br>08:40Z (8:40 am UTC時區),<br>13:00Z/15:30Z (1:00-3:30 pm UTC時區)">
                <label>
                    <input type="checkbox" name="eventTime"/>
                    eventTime
                </label>
            </div>
            <div class="checkbox" data-name="year" data-type="Event" data-description="西元年" data-commonname="年、西元年" data-example="1996,<br>2023">
                <label>
                    <input type="checkbox" name="year"/>
                    year
                </label>
            </div>
            <div class="checkbox" data-name="month" data-type="Event" data-description="月" data-commonname="月" data-example="11,<br>01">
                <label>
                    <input type="checkbox" name="month"/>
                    month
                </label>
            </div>
            <div class="checkbox" data-name="day" data-type="Event" data-description="日" data-commonname="日" data-example="26,<br>01">
                <label>
                    <input type="checkbox" name="day"/>
                    day
                </label>
            </div>
            <div class="checkbox" data-name="verbatimEventDate" data-type="Event" data-description="最原始記錄且未被轉譯過的調查日期" data-commonname="字面上調查日期、原始調查日期" data-example="spring 1910,<br>Marzo 2002,<br>1999-03-XX,<br>17IV1934">
                <label>
                    <input type="checkbox" name="verbatimEventDate"/>
                    verbatimEventDate
                </label>
            </div>
            <div class="checkbox" data-name="habitat" data-type="Event" data-description="調查樣區的棲地類型" data-commonname="棲地" data-example="樹,<br>灌叢,<br>道路">
                <label>
                    <input type="checkbox" name="habitat"/>
                    habitat
                </label>
            </div>
            <div class="checkbox" data-name="fieldNotes" data-type="Event" data-description="野外調查的筆記、註記" data-commonname="野外調查註記" data-example="Notes available in the Grinnell-Miller Library.">
                <label>
                    <input type="checkbox" name="fieldNotes"/>
                    fieldNotes
                </label>
            </div>
            <div class="checkbox" data-name="eventRemarks" data-type="Event" data-description="可註記天氣或調查狀況等任何文字資訊" data-commonname="調查備註" data-example="陣雨,<br>濃霧,<br>部分有雲">
                <label>
                    <input type="checkbox" name="eventRemarks"/>
                    eventRemarks
                </label>
            </div>
            <div class="checkbox" data-name="typeStatus" data-type="Identification" data-description="學名標本模式，最好能使用控制詞彙" data-commonname="學名標本模式" data-example="正模標本 HOLOTYPE,<br>副模標本 PARATYPE,<br>複模標本 ISOTYPE,<br>配模標本 ALLOTYPE,<br>總模標本 SYNTYPE,<br>選模標本 LECTOTYPE,<br>副選模標本 PARALECTOTYPE,<br>新模標本 NEOTYPE,<br>模式地標本 TOPOTYPE">
                <label>
                    <input type="checkbox" name="typeStatus"/>
                    typeStatus
                </label>
            </div>
            <div class="checkbox" data-name="identifiedBy" data-type="Identification" data-description="鑑定此筆紀錄分類相關資訊的人、群體或組織。若有多人則以 '|' 符號區隔" data-commonname="學名鑑定人" data-example="James L. Patton, Theodore Pappenfuss | Robert Macey">
                <label>
                    <input type="checkbox" name="identifiedBy"/>
                    identifiedBy
                </label>
            </div>
            <div class="checkbox" data-name="identificationReferences" data-type="Identification" data-description="鑑定此紀錄的物種分類資訊的參考文獻連結" data-commonname="學名鑑定參考" data-example="Aves del Noroeste Patagonico. Christie et al. 2004.,<br>Stebbins, R. Field Guide to Western Reptiles and Amphibians. 3rd Edition. 2003. | Irschick, D.J. and Shaffer, H.B. (1997). The polytypic species revisited: Morphological differentiation among tiger salamanders (Ambystoma tigrinum) (Amphibia: Caudata). Herpetologica, 53(1), 30-49">
                <label>
                    <input type="checkbox" name="identificationReferences"/>
                    identificationReferences
                </label>
            </div>
            <div class="checkbox" data-name="identificationVerificationStatus" data-type="Identification" data-description="為表示此紀錄的分類資訊驗證狀態的指標，來判斷是否需要驗證或修正。建議使用控制詞彙" data-commonname="學名鑑定驗證狀態" data-example="0 ('unverified' in HISPID/ABCD)">
                <label>
                    <input type="checkbox" name="identificationVerificationStatus"/>
                    identificationVerificationStatus
                </label>
            </div>
            <div class="checkbox" data-name="identificationRemarks" data-type="Identification" data-description="學名鑑定其他補充內容或備註" data-commonname="學名鑑定備註" data-example="Distinguished between Anthus correndera and Anthus hellmayri based on the comparative lengths of the uñas">
                <label>
                    <input type="checkbox" name="identificationRemarks"/>
                    identificationRemarks
                </label>
            </div>
            <div class="checkbox" data-name="country" data-type="Location" data-description="國家" data-commonname="國家" data-example="Taiwan">
                <label>
                    <input type="checkbox" name="country"/>
                    country
                </label>
            </div>
            <div class="checkbox" data-name="stateProvince" data-type="Location" data-description="省份/州" data-commonname="省份/州" data-example="Montana,<br>Minas Gerais,<br>Córdoba">
                <label>
                    <input type="checkbox" name="stateProvince"/>
                    stateProvince
                </label>
            </div>
            <div class="checkbox" data-name="county" data-type="Location" data-description="縣市" data-commonname="縣市" data-example="Nantou County">
                <label>
                    <input type="checkbox" name="county"/>
                    county
                </label>
            </div>
            <div class="checkbox" data-name="municipality" data-type="Location" data-description="行政區" data-commonname="行政區" data-example="Yuchi Township">
                <label>
                    <input type="checkbox" name="municipality"/>
                    municipality
                </label>
            </div>
            <div class="checkbox" data-name="locality" data-type="Location" data-description="The specific description of the place." data-commonname="地區" data-example="Sun Moon Lake">
                <label>
                    <input type="checkbox" name="locality"/>
                    locality
                </label>
            </div>
            <div class="checkbox" data-name="minimumElevationInMeters" data-type="Location" data-description="最低海拔（公尺）" data-commonname="最低海拔（公尺）" data-example="-100,<br>3952">
                <label>
                    <input type="checkbox" name="minimumElevationInMeters"/>
                    minimumElevationInMeters
                </label>
            </div>
            <div class="checkbox" data-name="maximumElevationInMeters" data-type="Location" data-description="最高海拔（公尺）." data-commonname="最高海拔（公尺）" data-example="-205,<br>1236">
                <label>
                    <input type="checkbox" name="maximumElevationInMeters"/>
                    maximumElevationInMeters
                </label>
            </div>
            <div class="checkbox" data-name="minimumDepthInMeters" data-type="Location" data-description="最小深度（公尺）" data-commonname="最小深度（公尺）" data-example="0,<br>100">
                <label>
                    <input type="checkbox" name="minimumDepthInMeters"/>
                    minimumDepthInMeters
                </label>
            </div>
            <div class="checkbox" data-name="maximumDepthInMeters" data-type="Location" data-description="最大深度（公尺）" data-commonname="最大深度（公尺）" data-example="0,<br>200">
                <label>
                    <input type="checkbox" name="maximumDepthInMeters"/>
                    maximumDepthInMeters
                </label>
            </div>
            <div class="checkbox" data-name="locationRemarks" data-type="Location" data-description="地區註記" data-commonname="地區註記" data-example="under water since 2005">
                <label>
                    <input type="checkbox" name="locationRemarks"/>
                    locationRemarks
                </label>
            </div>
            <div class="checkbox" data-name="coordinatePrecision" data-type="Location" data-description="依據十進位緯度（decimalLatitude）和十進位經度（decimalLongitude）中給出的座標精確度的十進位表示" data-commonname="座標精準度、座標精確度" data-example="0.00001 (normal GPS limit for decimal degrees),<br>0.000278 (nearest second),<br>0.01667 (nearest minute),<br>1.0 (nearest degree)">
                <label>
                    <input type="checkbox" name="coordinatePrecision"/>
                    coordinatePrecision
                </label>
            </div>
            <div class="checkbox" data-name="verbatimCoordinates" data-type="Location" data-description="字面上座標，意即最初採集或觀測取得紀錄的經度和緯度，且尚未被轉譯過，任何座標系統皆可" data-commonname="字面上座標" data-example="41 05 54S 121 05 34W, 17T 630000 4833400">
                <label>
                    <input type="checkbox" name="verbatimCoordinates"/>
                    verbatimCoordinates
                </label>
            </div>
            <div class="checkbox" data-name="verbatimLatitude" data-type="Location" data-description="字面緯度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="字面上緯度" data-example="41d 16’N">
                <label>
                    <input type="checkbox" name="verbatimLatitude"/>
                    verbatimLatitude
                </label>
            </div>
            <div class="checkbox" data-name="verbatimLongitude" data-type="Location" data-description="字面經度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="字面上經度" data-example="121d 10’ 34" W">
                <label>
                    <input type="checkbox" name="verbatimLongitude"/>
                    verbatimLongitude
                </label>
            </div>
            <div class="checkbox" data-name="verbatimCoordinateSystem" data-type="Location" data-description="紀錄的座標單位" data-commonname="字面上座標格式" data-example="decimal degrees,<br>degrees decimal minutes,<br>degrees minutes seconds">
                <label>
                    <input type="checkbox" name="verbatimCoordinateSystem"/>
                    verbatimCoordinateSystem
                </label>
            </div>
            <div class="checkbox" data-name="verbatimSRS" data-type="Location" data-description="字面上座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="字面上空間參照系統" data-example="unknown,<br>EPSG:4326,<br>WGS84,<br>NAD27,<br>Campo Inchauspe,<br>European 1950,<br>Clarke 1866">
                <label>
                    <input type="checkbox" name="verbatimSRS"/>
                    verbatimSRS
                </label>
            </div>
            <div class="checkbox" data-name="footprintWKT" data-type="Location" data-description="一個位置可能既有點半徑表示法（見十進位緯度），也有足跡表示法，兩者可能互不相同。若該筆紀錄無法以一個點位或點半徑記錄，則可參考使用此欄位" data-commonname="地理足跡WKT" data-example="POLYGON ((10 20, 11 20, 11 21, 10 21, 10 20)) (the one-degree bounding box with opposite corners at longitude=10, latitude=20 and longitude=11, latitude=21)">
                <label>
                    <input type="checkbox" name="footprintWKT"/>
                    footprintWKT
                </label>
            </div>
            <div class="checkbox" data-name="catalogNumber" data-type="Occurrence" data-description="通常為典藏標本納入館藏時所獲得的序號" data-commonname="館藏號" data-example="145732,<br>145732a,<br>2008.1334,<br>R-4313">
                <label>
                    <input type="checkbox" name="catalogNumber"/>
                    catalogNumber
                </label>
            </div>
            <div class="checkbox" data-name="recordNumber" data-type="Occurrence" data-description="採集樣本並記錄時所寫下的序號" data-commonname="採集號" data-example="OPP 7101">
                <label>
                    <input type="checkbox" name="recordNumber"/>
                    recordNumber
                </label>
            </div>
            <div class="checkbox" data-name="recordedByID" data-type="Occurrence" data-description="記錄者的相關個人連結，如ORCID" data-commonname="記錄者連結、記錄者ID" data-example="https://orcid.org/0000-0002-1825-0097 (for an individual),<br>https://orcid.org/0000-0002-1825-0097 | https://orcid.org/0000-0002-1825-0098 (for a list of people)">
                <label>
                    <input type="checkbox" name="recordedByID"/>
                    recordedByID
                </label>
            </div>
            <div class="checkbox" data-name="sex" data-type="Occurrence" data-description="該筆紀錄中生物個體的性別，建議使用控制詞彙。" data-commonname="性別" data-example="雌性 female,<br>雄性 male,<br>雌雄同體 hermaphrodite">
                <label>
                    <input type="checkbox" name="sex"/>
                    sex
                </label>
            </div>
            <div class="checkbox" data-name="lifeStage" data-type="Occurrence" data-description="該筆紀錄中生物的生活史階段" data-commonname="生活史階段" data-example="zygote,<br>larva,<br>juvenile,<br>adult,<br>seedling,<br>flowering,<br>fruiting">
                <label>
                    <input type="checkbox" name="lifeStage"/>
                    lifeStage
                </label>
            </div>
            <div class="checkbox" data-name="reproductiveCondition" data-type="Occurrence" data-description="該筆紀錄中生物的生殖狀態" data-commonname="生殖狀態" data-example="non-reproductive,<br>pregnant,<br>in bloom,<br>fruit-bearing">
                <label>
                    <input type="checkbox" name="reproductiveCondition"/>
                    reproductiveCondition
                </label>
            </div>
            <div class="checkbox" data-name="behavior" data-type="Occurrence" data-description="該筆紀錄的生物被觀察時，正進行的行為" data-commonname="行為" data-example="roosting,<br>foraging,<br>running">
                <label>
                    <input type="checkbox" name="behavior"/>
                    behavior
                </label>
            </div>
            <div class="checkbox" data-name="establishmentMeans" data-type="Occurrence" data-description="關於一種或多種生物是否藉由現代人類的直接或間接活動引入特定地點和時間的聲明或評估" data-commonname="原生或引入定義評估" data-example="原生 native,<br>原生：再引進 nativeReintroduced,<br>引進（外來、非原生、非原住） introduced,<br>引進（協助拓殖） introducedAssistedColonisation,<br>流浪的 vagrant,<br>不確定的（未知、隱源性） uncertain">
                <label>
                    <input type="checkbox" name="establishmentMeans"/>
                    establishmentMeans
                </label>
            </div>
            <div class="checkbox" data-name="degreeOfEstablishment" data-type="Occurrence" data-description="生物在特定地點和時間的生存、繁殖和擴大範圍的程度" data-commonname="原生或引入階段評估" data-example="原生 native,<br>收容 captive,<br>栽培 cultivated,<br>野放 released,<br>衰退中 failing,<br>偶然出現的 casual,<br>繁殖中 reproducing,<br>歸化 established,<br>拓殖中 colonising,<br>入侵 invasive,<br>廣泛入侵 widespreadInvasive">
                <label>
                    <input type="checkbox" name="degreeOfEstablishment"/>
                    degreeOfEstablishment
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceStatus" data-type="Occurrence" data-description="該筆紀錄在特定時間和地點，為生物有出現或未出現的狀態，須使用DwC規範之控制詞彙" data-commonname="出現狀態" data-example="出現 present,<br>未出現 absent">
                <label>
                    <input type="checkbox" name="occurrenceStatus"/>
                    occurrenceStatus
                </label>
            </div>
            <div class="checkbox" data-name="associatedOccurrences" data-type="Occurrence" data-description="與該筆紀錄相關的其他出現紀錄，若有多個連結以 '|' 分隔。" data-commonname="相關物種出現紀錄" data-example="parasite collected from: https://arctos.database.museum/guid/MSB:Mamm:215895?seid=950760,<br>encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3175067 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177393 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177394 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177392 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3609139">
                <label>
                    <input type="checkbox" name="associatedOccurrences"/>
                    associatedOccurrences
                </label>
            </div>
            <div class="checkbox" data-name="associatedReferences" data-type="Occurrence" data-description="與該筆紀錄相關的其他出現紀錄，若有多個連結以 '|' 分隔。" data-commonname="相關參考資料" data-example="http://www.sciencemag.org/cgi/content/abstract/322/5899/261, Christopher J. Conroy, Jennifer L. Neuwald. 2008. Phylogeographic study of the California vole, Microtus californicus Journal of Mammalogy, 89(3):755-767., Steven R. Hoofer and Ronald A. Van Den Bussche. 2001. Phylogenetic Relationships of Plecotine Bats and Allies Based on Mitochondrial Ribosomal Sequences. Journal of Mammalogy 82(1):131-137. | Walker, Faith M., Jeffrey T. Foster, Kevin P. Drees, Carol L. Chambers. 2014. Spotted bat (Euderma maculatum) microsatellite discovery using illumina sequencing. Conservation Genetics Resources.">
                <label>
                    <input type="checkbox" name="associatedReferences"/>
                    associatedReferences
                </label>
            </div>
            <div class="checkbox" data-name="associatedSequences" data-type="Occurrence" data-description="與該筆紀錄相關的基因序列（提供其於開放基因資料庫或文獻中的連結），若有多個連結則以 '|' 分隔。" data-commonname="相關基因序列" data-example="http://www.ncbi.nlm.nih.gov/nuccore/U34853.1, http://www.ncbi.nlm.nih.gov/nuccore/GU328060 | http://www.ncbi.nlm.nih.gov/nuccore/AF326093">
                <label>
                    <input type="checkbox" name="associatedSequences"/>
                    associatedSequences
                </label>
            </div>
            <div class="checkbox" data-name="associatedTaxa" data-type="Occurrence" data-description="與該筆紀錄相關的物種（如有交互作用的物種），若有多個則以 '|' 分隔。" data-commonname="相關物種" data-example="host: Quercus alba,<br>host: gbif.org/species/2879737,<br>parasitoid of: Cyclocephala signaticollis | predator of: Apis mellifera">
                <label>
                    <input type="checkbox" name="associatedTaxa"/>
                    associatedTaxa
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceRemarks" data-type="Occurrence" data-description="該筆出現紀錄註記、備註" data-commonname="出現紀錄註記" data-example="found dead on road">
                <label>
                    <input type="checkbox" name="occurrenceRemarks"/>
                    occurrenceRemarks
                </label>
            </div>
            <div class="checkbox" data-name="organismID" data-type="Organism" data-description="若該筆紀錄可追溯至生物個體，則可給予生物體ID。可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)" data-commonname="生物體ID、個體ID" data-example="http://arctos.database.museum/guid/WNMU:Mamm:1249">
                <label>
                    <input type="checkbox" name="organismID"/>
                    organismID
                </label>
            </div>
            <div class="checkbox" data-name="organismName" data-type="Organism" data-description="給該生物體取的名字或標籤" data-commonname="生物體名、個體名稱" data-example="Huberta,<br>Boab Prison Tree,<br>J pod,<br>小破洞,<br>傑尼龜">
                <label>
                    <input type="checkbox" name="organismName"/>
                    organismName
                </label>
            </div>
            <div class="checkbox" data-name="associatedOrganisms" data-type="Organism" data-description="與該生物體相關的其他生物個體" data-commonname="相關生物體、相關個體" data-example="sibling of: http://arctos.database.museum/guid/DMNS:Mamm:14171,<br>parent of: http://arctos.database.museum/guid/MSB:Mamm:196208 | parent of: http://arctos.database.museum/guid/MSB:Mamm:196523 | sibling of: http://arctos.database.museum/guid/MSB:Mamm:142638">
                <label>
                    <input type="checkbox" name="associatedOrganisms"/>
                    associatedOrganisms
                </label>
            </div>
            <div class="checkbox" data-name="organismRemarks" data-type="Organism" data-description="該生物體的註記、備註" data-commonname="生物體註記" data-example="One of a litter of six">
                <label>
                    <input type="checkbox" name="organismRemarks"/>
                    organismRemarks
                </label>
            </div>
            <div class="checkbox" data-name="type" data-type="Record-level" data-description="該筆資源/媒體的性質或類型，必須填入 DCMI 類型詞彙表中的值(http://dublincore.org/documents/2010/10/11/dcmi-type-vocabulary/)" data-commonname="資源類型、媒體類型" data-example="靜態影像 StillImage,<br>動態影像 MovingImage,<br>聲音 Sound,<br>實體物件 PhysicalObject,<br>事件 Event,<br>文字 Text">
                <label>
                    <input type="checkbox" name="type"/>
                    type
                </label>
            </div>
            <div class="checkbox" data-name="modified" data-type="Record-level" data-description="該筆紀錄最近被修改的日期時間" data-commonname="IPT資料修改時間" data-example="1963-03-08T14:07-0600 (8 Mar 1963 at 2:07 pm in the time zone six hours earlier than UTC),<br>2009-02-20T08:40Z (20 February 2009 8:40 am UTC),<br>2018-08-29T15:19 (3:19 pm local time on 29 August 2018),<br>1809-02-12 (some time during 12 February 1809),<br>1906-06 (some time in June 1906),<br>1971 (some time in the year 1971),<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z (some time during the interval between 1 March 2007 1pm UTC and 11 May 2008 3:30 pm UTC),<br>1900/1909 (some time during the interval between the beginning of the year 1900 and the end of the year 1909),<br>2007-11-13/15 (some time in the interval between 13 November 2007 and 15 November 2007)">
                <label>
                    <input type="checkbox" name="modified"/>
                    modified
                </label>
            </div>
            <div class="checkbox" data-name="language" data-type="Record-level" data-description="該紀錄所用的語言，建議使用控制詞彙(RFC 5646標準)" data-commonname="語言" data-example="en (英文),<br>zh-TW (繁體中文)">
                <label>
                    <input type="checkbox" name="language"/>
                    language
                </label>
            </div>
            <div class="checkbox" data-name="license" data-type="Record-level" data-description="正式允許對資料進行操作的一份法律授權文件。這裡所用的授權主要為創用CC授權，須使用控制詞彙" data-commonname="授權標示、資料授權" data-example="http://creativecommons.org/publicdomain/zero/1.0/legalcode,<br>http://creativecommons.org/licenses/by/4.0/legalcode">
                <label>
                    <input type="checkbox" name="license"/>
                    license
                </label>
            </div>
            <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="擁有或管理資料權利的個人或組織" data-commonname="所有權、所有權人" data-example="The Regents of the University of California">
                <label>
                    <input type="checkbox" name="rightsHolder"/>
                    rightsHolder
                </label>
            </div>
            <div class="checkbox" data-name="bibliographicCitation" data-type="Record-level" data-description="此筆資料的引用方式" data-commonname="引用此資料的方式" data-example="Occurrence example: Museum of Vertebrate Zoology, UC Berkeley. MVZ Mammal Collection (Arctos). Record ID: http://arctos.database.museum/guid/MVZ:Mamm:165861?seid=101356. Source: http://ipt.vertnet.org:8080/ipt/resource.do?r=mvz_mammal,<br>Taxon example: https://www.gbif.org/species/2439608 Source: GBIF Taxonomic Backbone,<br>Event example: Rand, K.M., Logerwell, E.A. The first demersal trawl survey of benthic fish and invertebrates in the Beaufort Sea since the late 1970s. Polar Biol 34, 475–488 (2011). https://doi.org/10.1007/s00300-010-0900-2">
                <label>
                    <input type="checkbox" name="bibliographicCitation"/>
                    bibliographicCitation
                </label>
            </div>
            <div class="checkbox" data-name="references" data-type="Record-level" data-description="被描述的資源參考、引用或以其他方式指向的相關資源" data-commonname="資料參考來源、參考文獻、參考資源、參考來源" data-example="MaterialSample example: http://arctos.database.museum/guid/MVZ:Mamm:165861,<br>Taxon example: https://www.catalogueoflife.org/data/taxon/32664">
                <label>
                    <input type="checkbox" name="references"/>
                    references
                </label>
            </div>
            <div class="checkbox" data-name="collectionID" data-type="Record-level" data-description="該筆紀錄在發布機構的典藏ID，最好為全球唯一的URL" data-commonname="館藏ID、典藏號、館藏號" data-example="http://biocol.org/urn:lsid:biocol.org:col:1001, http://grbio.org/cool/p5fp-c036">
                <label>
                    <input type="checkbox" name="collectionID"/>
                    collectionID
                </label>
            </div>
            <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="該筆紀錄在來源資料集中的ID，最好為全球唯一或於該發布機構唯一的ID" data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
                <label>
                    <input type="checkbox" name="datasetID"/>
                    datasetID
                </label>
            </div>
            <div class="checkbox" data-name="institutionCode" data-type="Record-level" data-description="發布機構所使用的名稱（博物館）代碼或縮寫" data-commonname="機構代碼" data-example="GBIF,<br>TaiBIF,<br>NTM,<br>NSTC">
                <label>
                    <input type="checkbox" name="institutionCode"/>
                    institutionCode
                </label>
            </div>
            <div class="checkbox" data-name="datasetName" data-type="Record-level" data-description="該筆紀錄來源的資料集名稱" data-commonname="資料集名稱、來源計畫名稱" data-example="Grinnell Resurvey Mammals,<br>Lacey Ctenomys Recaptures">
                <label>
                    <input type="checkbox" name="datasetName"/>
                    datasetName
                </label>
            </div>
            <div class="checkbox" data-name="informationWithheld" data-type="Record-level" data-description="若有隸屬於此資料集但尚未開放的其他資訊，可在此欄位補充" data-commonname="隱藏資訊" data-example="location information not given for endangered species,<br>collector identities withheld | ask about tissue samples">
                <label>
                    <input type="checkbox" name="informationWithheld"/>
                    informationWithheld
                </label>
            </div>
            <div class="checkbox" data-name="dataGeneralizations" data-type="Record-level" data-description="針對共享資料採取的措施，使其比原始形式更不具體或完整（如將點位模糊化）。可表明若有需要更高品質的替代資料可提出申請" data-commonname="資料模糊化、屏蔽資料" data-example="Coordinates generalized from original GPS coordinates to the nearest half degree grid cell">
                <label>
                    <input type="checkbox" name="dataGeneralizations"/>
                    dataGeneralizations
                </label>
            </div>
            <div class="checkbox" data-name="acceptedNameUsage" data-type="Taxon" data-description="目前有效（動物）或接受（植物）並包含命名作者及年代（若已知）的完整學名" data-commonname="有效學名" data-example="Tamias minimus (valid name for Eutamias minimus)">
                <label>
                    <input type="checkbox" name="acceptedNameUsage"/>
                    acceptedNameUsage
                </label>
            </div>
            <div class="checkbox" data-name="phylum" data-type="Taxon" data-description="門" data-commonname="門" data-example="Chordata (phylum),<br>Bryophyta (division)">
                <label>
                    <input type="checkbox" name="phylum"/>
                    phylum
                </label>
            </div>
            <div class="checkbox" data-name="class" data-type="Taxon" data-description="綱" data-commonname="綱" data-example="Mammalia,<br>Hepaticopsida">
                <label>
                    <input type="checkbox" name="class"/>
                    class
                </label>
            </div>
            <div class="checkbox" data-name="order" data-type="Taxon" data-description="目" data-commonname="目" data-example="Carnivora,<br>Monocleales">
                <label>
                    <input type="checkbox" name="order"/>
                    order
                </label>
            </div>
            <div class="checkbox" data-name="family" data-type="Taxon" data-description="科" data-commonname="科" data-example="Felidae,<br>Monocleaceae">
                <label>
                    <input type="checkbox" name="family"/>
                    family
                </label>
            </div>
            <div class="checkbox" data-name="subfamily" data-type="Taxon" data-description="亞科" data-commonname="亞科" data-example="Periptyctinae,<br>Orchidoideae,<br>Sphindociinae">
                <label>
                    <input type="checkbox" name="subfamily"/>
                    subfamily
                </label>
            </div>
            <div class="checkbox" data-name="genus" data-type="Taxon" data-description="屬" data-commonname="屬" data-example="Puma,<br>Monoclea">
                <label>
                    <input type="checkbox" name="genus"/>
                    genus
                </label>
            </div>
            <div class="checkbox" data-name="genericName" data-type="Taxon" data-description="屬名" data-commonname="屬名" data-example="Felis (for scientificName 'Felis concolor', with accompanying values of 'Puma concolor' in acceptedNameUsage and 'Puma' in genus)">
                <label>
                    <input type="checkbox" name="genericName"/>
                    genericName
                </label>
            </div>
            <div class="checkbox" data-name="subgenus" data-type="Taxon" data-description="亞屬" data-commonname="亞屬" data-example="Strobus,<br>Amerigo,<br>Pilosella">
                <label>
                    <input type="checkbox" name="subgenus"/>
                    subgenus
                </label>
            </div>
            <div class="checkbox" data-name="infragenericEpithet" data-type="Taxon" data-description="屬以下別名" data-commonname="屬以下別名" data-example="Abacetillus (for scientificName 'Abacetus (Abacetillus) ambiguus',<br>Cracca (for scientificName 'Vicia sect. Cracca')">
                <label>
                    <input type="checkbox" name="infragenericEpithet"/>
                    infragenericEpithet
                </label>
            </div>
            <div class="checkbox" data-name="specificEpithet" data-type="Taxon" data-description="種小名" data-commonname="種小名" data-example="concolor,<br>gottschei">
                <label>
                    <input type="checkbox" name="specificEpithet"/>
                    specificEpithet
                </label>
            </div>
            <div class="checkbox" data-name="infraspecificEpithet" data-type="Taxon" data-description="種以下別名" data-commonname="種以下別名" data-example="concolor (for scientificName 'Puma concolor concolor),<br>oxyadenia (for scientificName 'Quercus agrifolia var. oxyadenia'),<br>laxa (for scientificName 'Cheilanthes hirta f. laxa'),<br>scaberrima (for scientificName 'Indigofera charlieriana var. scaberrima')">
                <label>
                    <input type="checkbox" name="infraspecificEpithet"/>
                    infraspecificEpithet
                </label>
            </div>
            <div class="checkbox" data-name="cultivarEpithet" data-type="Taxon" data-description="字面上分類位階" data-commonname="字面上分類位階" data-example="King Edward (for scientificName Solanum tuberosum 'King Edward' and taxonRank 'cultivar'); Mishmiense (for scientificName Rhododendron boothii Mishmiense Group and taxonRank 'cultivar group'); Atlantis (for scientificName Paphiopedilum Atlantis grex and taxonRank 'grex')">
                <label>
                    <input type="checkbox" name="cultivarEpithet"/>
                    cultivarEpithet
                </label>
            </div>
            <div class="checkbox" data-name="verbatimTaxonRank" data-type="Taxon" data-description="原始紀錄的學名中，最具體且尚未被轉譯過的分類位階等級。" data-commonname="字面上分類位階" data-example="Agamospecies, sub-lesus, prole, apomict, nothogrex, sp., subsp., var.">
                <label>
                    <input type="checkbox" name="verbatimTaxonRank"/>
                    verbatimTaxonRank
                </label>
            </div>
            <div class="checkbox" data-name="scientificNameAuthorship" data-type="Taxon" data-description="學名命名者" data-commonname="學名命名者" data-example="(Torr.) J.T. Howell, (Martinovský) Tzvelev, (Györfi, 1952)">
                <label>
                    <input type="checkbox" name="scientificNameAuthorship"/>
                    scientificNameAuthorship
                </label>
            </div>
            <div class="checkbox" data-name="vernacularName" data-type="Taxon" data-description="俗名、中文名" data-commonname="俗名、中文名" data-example="小花蔓澤蘭,<br>大翅鯨,<br>紫斑蝶">
                <label>
                    <input type="checkbox" name="vernacularName"/>
                    vernacularName
                </label>
            </div>
            <div class="checkbox" data-name="taxonomicStatus" data-type="Taxon" data-description="學名作為分類群標籤的使用狀況。需要分類學意見來界定分類群的範圍，然後結合專家意見，使用優先權規則來定義該範圍内所含命名的分類地位。它必須與定義該概念的具體分類參考資料相互連結" data-commonname="分類狀態" data-example="invalid,<br>misapplied,<br>homotypic synonym,<br>accepted">
                <label>
                    <input type="checkbox" name="taxonomicStatus"/>
                    taxonomicStatus
                </label>
            </div>
            <div class="checkbox" data-name="taxonRemarks" data-type="Taxon" data-description="分類註記" data-commonname="分類註記" data-example="this name is a misspelling in common use">
                <label>
                    <input type="checkbox" name="taxonRemarks"/>
                    taxonRemarks
                </label>
            </div>
        </fieldset>
        `;
    } 
    
    if (selectedExtension.includes("simple-multimedia")) {
        fieldsetContent += `
        <fieldset id="simple-multimedia">
            <legend>延伸資料集欄位：Simple Multimedia</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="eventID" class="required-col key-col" checked/>
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號在此資料集中不可有重複。" data-commonname="ID、編號" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="occurrenceID" class="required-col key-col" checked/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="taxonID" class="required-col key-col" checked/>
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="identifier" data-type="" data-description="該筆媒體的位置URL連結" data-commonname="媒體位置連結" data-example="http://farm6.static.flickr.com/5127/5242866958_98afd8cbce_o.jpg">
                <label>
                    <input type="checkbox" name="identifier" class="required-col" checked/>
                    identifier
                </label>
            </div>
            <div class="checkbox" data-name="license" data-type="Record-level" data-description="正式允許對資料進行操作的一份法律授權文件。這裡所用的授權主要為創用CC授權，須使用控制詞彙。" data-commonname="授權標示" data-example="http://creativecommons.org/publicdomain/zero/1.0/legalcode,<br>http://creativecommons.org/licenses/by/4.0/legalcode">
                <label>
                    <input type="checkbox" name="license" class="required-col" checked/>
                    license
                </label>
            </div>
            <div class="checkbox" data-name="type" data-type="" data-description="該筆資源/媒體的性質或類型，必須填入 DCMI 類型詞彙表中的值(http://dublincore.org/documents/2010/10/11/dcmi-type-vocabulary/)" data-commonname="資源類型" data-example="靜態影像 StillImage,<br>動態影像 MovingImage,<br>聲音 Sound,<br>實體物件 PhysicalObject,<br>事件 Event,<br>文字 Text">
                <label>
                    <input type="checkbox" name="type" checked/>
                    type
                </label>
            </div>
            <div class="checkbox" data-name="title" data-type="" data-description="媒體的檔案名稱" data-commonname="媒體的檔案名稱" data-example="">
                <label>
                    <input type="checkbox" name="title" checked/>
                    title
                </label>
            </div>
            <div class="checkbox" data-name="created" data-type="" data-description="媒體獲取(拍攝、錄音等)的日期、時間" data-commonname="媒體建立日期/時間" data-example="1996-11-26">
                <label>
                    <input type="checkbox" name="created" checked/>
                    created
                </label>
            </div>
            <div class="checkbox" data-name="creator" data-type="" data-description="拍攝者或錄音者" data-commonname="媒體建立者" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="creator" checked/>
                    creator
                </label>
            </div>
            <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="擁有或管理資料權利的個人或組織" data-commonname="所有權" data-example="The Regents of the University of California">
                <label>
                    <input type="checkbox" name="rightsHolder" checked/>
                    rightsHolder
                </label>
            </div>
            <div class="checkbox" data-name="format" data-type="" data-description="媒體的檔案格式" data-commonname="媒體的檔案格式" data-example="image/jpeg">
                <label>
                    <input type="checkbox" name="format"/>
                    format
                </label>
            </div>
            <div class="checkbox" data-name="references" data-type="Record-level" data-description="被描述的資源參考、引用或以其他方式指向的相關資源" data-commonname="資料來源參考" data-example="MaterialSample example: http://arctos.database.museum/guid/MVZ:Mamm:165861,<br>Taxon example: https://www.catalogueoflife.org/data/taxon/32664">
                <label>
                    <input type="checkbox" name="references"/>
                    references
                </label>
            </div>
            <div class="checkbox" data-name="description" data-type="" data-description="該筆媒體內容摘要描述" data-commonname="媒體描述" data-example="Female Tachycineta albiventer photographed in the Amazon, Brazil, in November 2010">
                <label>
                    <input type="checkbox" name="description"/>
                    description
                </label>
            </div>
            <div class="checkbox" data-name="contributor" data-type="" data-description="與媒體建立者共同參與或協助的人" data-commonname="媒體貢獻者" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="contributor"/>
                    contributor
                </label>
            </div>
            <div class="checkbox" data-name="publisher" data-type="" data-description="負責發布該媒體的人或組織" data-commonname=媒體發布者" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="publisher"/>
                    publisher
                </label>
            </div>
            <div class="checkbox" data-name="audience" data-type="" data-description="該媒體適合使用的受眾" data-commonname="媒體受眾" data-example="experts,<br>general public,<br>children">
                <label>
                    <input type="checkbox" name="audience"/>
                    audience
                </label>
            </div>
            <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="該筆紀錄在來源資料集中的ID，最好為全球唯一或於該發布機構唯一的ID" data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
                <label>
                    <input type="checkbox" name="datasetID"/>
                    datasetID
                </label>
            </div>
        </fieldset>
        `;
    }

    if (selectedExtension.includes("extended-measurement-or-facts")) {
        fieldsetContent += `
        <fieldset id="extended-measurement-or-facts">
            <legend>延伸資料集欄位：Extended Measurement Or Facts</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="eventID" class="required-col key-col" checked/>
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號在此資料集中不可有重複。" data-commonname="ID、編號" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="occurrenceID" class="required-col key-col" checked/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="taxonID" class="required-col key-col" checked/>
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="measurementID" data-type="" data-description="測量紀錄識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號在此資料集中不可有重複" data-commonname="測量紀錄ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="measurementID" class="required-col" checked/>
                    measurementID
                </label>
            </div>
            <div class="checkbox" data-name="measurementType" data-type="" data-description="測量值的類別名稱" data-commonname="測量種類" data-example="tail length,<br>temperature,<br>trap line length,<br>survey area,<br>trap type,<br>Dry weight biomass,<br>Sampling instrument name">
                <label>
                    <input type="checkbox" name="measurementType" class="required-col" checked/>
                    measurementType
                </label>
            </div>
            <div class="checkbox" data-name="measurementValue" data-type="" data-description="測量數值" data-commonname="測量定值" data-example="45,<br>20,<br>1,<br>14.5,<br>UV-light,<br>Van Veen grab">
                <label>
                    <input type="checkbox" name="measurementValue" class="required-col" checked/>
                    measurementValue
                </label>
            </div>
            <div class="checkbox" data-name="measurementUnit" data-type="" data-description="測量值的單位" data-commonname="測量值單位" data-example="mm,<br>C,<br>km,<br>ha">
                <label>
                    <input type="checkbox" name="measurementUnit" class="required-col" checked/>
                    measurementUnit
                </label>
            </div>
            <div class="checkbox" data-name="measurementDeterminedBy" data-type="" data-description="測量該筆紀錄的人、群體或組織" data-commonname="測量者" data-example="Javier de la Torre,<br>Julie Woodruff; Eileen Lacey">
                <label>
                    <input type="checkbox" name="measurementDeterminedBy" checked/>
                    measurementDeterminedBy
                </label>
            </div>
            <div class="checkbox" data-name="measurementAccuracy" data-type="" data-description="測量準確度" data-commonname="測量準確度" data-example="0.01,<br>normal distribution with variation of 2 m">
                <label>
                    <input type="checkbox" name="measurementAccuracy"/>
                    measurementAccuracy
                </label>
            </div>
            <div class="checkbox" data-name="measurementDeterminedDate" data-type="" data-description="該筆紀錄的測量日期" data-commonname="測量日期" data-example="1963-03-08T14:07-0600,<br>2009-02-20T08:40Z,<br>1809-02-12,<br>1906-06,<br>1971,<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z,<br>2007-11-13/15">
                <label>
                    <input type="checkbox" name="measurementDeterminedDate"/>
                    measurementDeterminedDate
                </label>
            </div>
            <div class="checkbox" data-name="measurementMethod" data-type="" data-description="測量方法，可提供參考文獻連結" data-commonname="測量方法" data-example="'minimum convex polygon around burrow entrances' for a home range area,<br>'barometric altimeter' for an elevation">
                <label>
                    <input type="checkbox" name="measurementMethod"/>
                    measurementMethod
                </label>
            </div>
            <div class="checkbox" data-name="measurementRemarks" data-type="" data-description="測量紀錄的註記" data-commonname="測量備註" data-example="tip of tail missing">
                <label>
                    <input type="checkbox" name="measurementRemarks"/>
                    measurementRemarks
                </label>
            </div>
        </fieldset>
        `;
    }

    if (selectedExtension.includes("resource-relationship")) {
        fieldsetContent += `
        <fieldset id="resource-relationship">
            <legend>延伸資料集欄位：Resource Relationship</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="eventID" class="required-col key-col" checked/>
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號在此資料集中不可有重複。" data-commonname="ID、編號" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="occurrenceID" class="required-col key-col" checked/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="taxonID" class="required-col key-col" checked/>
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="resourceID" data-type="" data-description="這筆紀錄的主體" data-commonname="主體紀錄ID" data-example="occ_HL20070207_001">
                <label>
                    <input type="checkbox" name="resourceID" class="required-col" checked/>
                    resourceID
                </label>
            </div>
            <div class="checkbox" data-name="relatedResourceID" data-type="" data-description="跟主體有關的紀錄" data-commonname="與主體有關係的對象ID" data-example="occ_HL20070207_001-1">
                <label>
                    <input type="checkbox" name="relatedResourceID" class="required-col" checked/>
                    relatedResourceID
                </label>
            </div>
            <div class="checkbox" data-name="relationshipOfResource" data-type="" data-description="記錄不同筆資料間的相關性，建議使用控制詞彙" data-commonname="關係描述" data-example="sameAs,<br>duplicate of,<br>mother of,<br>offspring of,<br>sibling of,<br>parasite of,<br>host of,<br>valid synonym of,<br>located within,<br>pollinator of members of taxon,<br>pollinated specific plant,<br>pollinated by members of taxon">
                <label>
                    <input type="checkbox" name="relationshipOfResource" class="required-col" checked/>
                    relationshipOfResource
                </label>
            </div>
            <div class="checkbox" data-name="resourceRelationshipID" data-type="" data-description="主體與其有關係的對象間的關係ID，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)" data-commonname="關係紀錄ID" data-example="04b16710-b09c-11e8-96f8-529269fb1459">
                <label>
                    <input type="checkbox" name="resourceRelationshipID" class="required-col" checked/>
                    resourceRelationshipID
                </label>
            </div>
            <div class="checkbox" data-name="relationshipAccordingTo" data-type="" data-description="定義該筆主體與對象關係的人" data-commonname="關係定義人" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="relationshipAccordingTo" checked/>
                    relationshipAccordingTo
                </label>
            </div>
            <div class="checkbox" data-name="relationshipRemarks" data-type="" data-description="relationshipOfResource的其他文字註記" data-commonname="關係備註" data-example="mother and offspring collected from the same nest,<br>pollinator captured in the act">
                <label>
                    <input type="checkbox" name="relationshipRemarks"/>
                    relationshipRemarks
                </label>
            </div>
            <div class="checkbox" data-name="relationshipEstablishedDate" data-type="" data-description="定義該筆主體與對象關係的日期時間" data-commonname="關係定義日期" data-example="1963-03-08T14:07-0600 (8 Mar 1963 at 2:07pm in the time zone six hours earlier than UTC),<br>2009-02-20T08:40Z (20 February 2009 8:40am UTC),<br>2018-08-29T15:19 (3:19pm local time on 29 August 2018),<br>1809-02-12 (some time during 12 February 1809),<br>1906-06 (some time in June 1906),<br>1971 (some time in the year 1971),<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z (some time during the interval between 1 March 2007 1pm UTC and 11 May 2008 3:30pm UTC),<br>1900/1909 (some time during the interval between the beginning of the year 1900 and the end of the year 1909),<br>2007-11-13/15 (some time in the interval between 13 November 2007 and 15 November 2007)">
                <label>
                    <input type="checkbox" name="relationshipEstablishedDate"/>
                    relationshipEstablishedDate
                </label>
            </div>
        </fieldset>
        `;
    }

    if (selectedExtension.includes("dna-derived-data")) {
        fieldsetContent += `
        <fieldset id="dna-derived-data">
            <legend>延伸資料集欄位：DNA derived data</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="調查活動ID、編號、採樣事件ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="eventID" class="required-col key-col" checked/>
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號在此資料集中不可有重複。" data-commonname="ID、編號" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="occurrenceID" class="required-col key-col" checked/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼，可設定有意義的組合格式，或使用全球唯一辨識碼(GUID)或通用唯一辨識碼(UUID)，序號不可有重複" data-commonname="物種分類ID" data-example="20190523-TP11-01,<br>6d2dd029-f534-42e6-9805-96db874fdd3a">
                <label>
                    <input type="checkbox" name="taxonID" class="required-col key-col" checked/>
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="annealingTemp" data-type="" data-description="PCR引子黏合反應所設定的溫度" data-commonname="PCR引子黏合溫度" data-example="60">
                <label>
                    <input type="checkbox" name="annealingTemp" checked/>
                    annealingTemp
                </label>
            </div>
            <div class="checkbox" data-name="annealingTempUnit" data-type="" data-description="PCR引子黏合反應所設定的溫度單位" data-commonname="PCR引子黏合溫度單位" data-example="Degrees celsius">
                <label>
                    <input type="checkbox" name="annealingTempUnit" checked/>
                    annealingTempUnit
                </label>
            </div>
            <div class="checkbox" data-name="target_gene" data-type="" data-description="Cloning vector type(s) used in construction of libraries" data-commonname="" data-example="12S rRNA,<br>16S rRNA,<br>18S rRNA,<br>nif,<br>amoA,<br>rpo">
                <label>
                    <input type="checkbox" name="target_gene" checked/>
                    target_gene
                </label>
            </div>
            <div class="checkbox" data-name="target_subfragment" data-type="" data-description="基因或子片段的名稱。對於識別基因上的特定區域（例如16S rRNA上的V6）等方面很重要" data-commonname="目標基因片段名稱" data-example="V6, V9, ITS">
                <label>
                    <input type="checkbox" name="target_subfragment" checked/>
                    target_subfragment
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primers" data-type="" data-description="Specify whether to expect single, paired, or other configuration of reads" data-commonname="" data-example="FWD: GTCGGTAAAACTCGTGCCAGC;<br>REV: CATAGTGGGGTATCTAATCCCAGTTTG">
                <label>
                    <input type="checkbox" name="pcr_primers" checked/>
                    pcr_primers
                </label>
            </div>
            <div class="checkbox" data-name="seq_meth" data-type="" data-description="使用的定序方法，例如 Sanger, ABI-solid 等，建議使用控制詞彙" data-commonname="定序方法" data-example="Illumina HiSeq 1500">
                <label>
                    <input type="checkbox" name="seq_meth" checked/>
                    seq_meth
                </label>
            </div>
            <div class="checkbox" data-name="otu_class_appr" data-type="" data-description="在將新的UViGs聚類到'物種級'OTUs時使用的截止值和方法。即使在分析過程中主要使用了其他方法或截至值來定義OTUs，應該提供使用標準的95% ANI / 85% AF聚類的結果。" data-commonname="" data-example="95% ANI;85% AF; greedy incremental clustering">
                <label>
                    <input type="checkbox" name="otu_class_appr" checked/>
                    otu_class_appr
                </label>
            </div>
            <div class="checkbox" data-name="otu_seq_comp_appr" data-type="" data-description="OTU分群工具與臨界點，用來計算'物種級'OTU" data-commonname="OTU分群工具" data-example="blastn;2.6.0+;e-value cutoff: 0.001">
                <label>
                    <input type="checkbox" name="otu_seq_comp_appr" checked/>
                    otu_seq_comp_appr
                </label>
            </div>
            <div class="checkbox" data-name="otu_db" data-type="" data-description="在'物種級' OTUs 中聚類新基因體時使用的參考資料庫" data-commonname="OTU分類參考資料庫" data-example="NCBI Viral RefSeq;83">
                <label>
                    <input type="checkbox" name="otu_db" checked/>
                    otu_db
                </label>
            </div>
            <div class="checkbox" data-name="sop" data-type="" data-description="Standard operating procedures used in assembly and/or annotation of genomes, metagenomes or environmental sequences" data-commonname="" data-example="http://press.igsb.anl.gov/earthmicrobiome/protocols-and-standards/its/">
                <label>
                    <input type="checkbox" name="sop" checked/>
                    sop
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_forward" data-type="" data-description="用於擴增目標基因或子片段序列的前向PCR引子序列。如果在單個PCR反應中存在多個前向或反向引子，則每個引子應該完整列出，並與相同的DwC出現紀錄做關聯。引子序列應以大寫字母報告" data-commonname="PCR前向引子序列" data-example="GTCGGTAAAACTCGTGCCAGC">
                <label>
                    <input type="checkbox" name="pcr_primer_forward" checked/>
                    pcr_primer_forward
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_reverse" data-type="" data-description="用於擴增目標基因或子片段序列的後向PCR引子序列。如果在單個PCR反應中存在多個前向或反向引子，則每個引子應該完整列出，並與相同的DwC出現紀錄做關聯。引子序列應以大寫字母報告" data-commonname="PCR後向引子序列" data-example="CATAGTGGGGTATCTAATCCCAGTTTG">
                <label>
                    <input type="checkbox" name="pcr_primer_reverse" checked/>
                    pcr_primer_reverse
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_name_forward" data-type="" data-description="用於擴增目標基因或子片段序列的前向PCR引子名稱。如果在單個PCR反應中存在多個前向或反向引子，則每個引子應該完整列出，並與相同的DwC出現紀錄做關聯。引子序列應以大寫字母報告" data-commonname="PCR前向引子名稱" data-example="MiFishU-F">
                <label>
                    <input type="checkbox" name="pcr_primer_name_forward" checked/>
                    pcr_primer_name_forward
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_name_reverse" data-type="" data-description="用於擴增目標基因或子片段序列的後向PCR引子名稱。如果在單個PCR反應中存在多個前向或反向引子，則每個引子應該完整列出，並與相同的DwC出現紀錄做關聯。引子序列應以大寫字母報告" data-commonname="PCR後向引子名稱" data-example="MiFishU-R">
                <label>
                    <input type="checkbox" name="pcr_primer_name_reverse" checked/>
                    pcr_primer_name_reverse
                </label>
            </div>
            <div class="checkbox" data-name="DNA_sequence" data-type="" data-description="DNA序列" data-commonname="DNA序列" data-example="TCTATCCTCAATTATAGGTCATAATTCACCATCAGTAGATTTAGGAATTTTCTCTATTCATATTGCAGGTGTATCATCAATTATAGGATCAATTAATTTTATTGTAACAATTTTAAATATACATACAAAAACTCATTCATTAAACTTTTTACCATTATTTTCATGATCAGTTCTAGTTACAGCAATTCTCCTTTTATTATCATTA">
                <label>
                    <input type="checkbox" name="DNA_sequence" checked/>
                    DNA_sequence
                </label>
            </div>
            <div class="checkbox" data-name="ampliconSize" data-type="" data-description="擴增子的長度，鹼基對為單位" data-commonname="擴增子長度" data-example="83">
                <label>
                    <input type="checkbox" name="ampliconSize"/>
                    ampliconSize
                </label>
            </div>
            <div class="checkbox" data-name="samp_name" data-type="" data-description="樣本名稱是您為樣本選擇的名稱。它可以有任何格式，但建議您使用簡潔、獨特以及一致性，並盡可能地列出足夠資訊。每個樣本名稱都必須是獨一的" data-commonname="樣本名稱" data-example="ST1,<br>ST2,<br>ST3">
                <label>
                    <input type="checkbox" name="samp_name"/>
                    samp_name
                </label>
            </div>
            <div class="checkbox" data-name="env_broad_scale" data-type="" data-description="列出樣本或標本來自哪個主要的環境系統。以粗糙的空間尺度來描述採樣地點的大概環境背景，例如，沙漠還是雨林中？我們建議使用ENVO生物群系類的子類的控制詞彙術語：http://purl.obolibrary.org/obo/ENVO_00000428。 輸入一個術語的格式：termLabel [termID]。輸入多個術語的格式：termLabel [termID]|termLabel [termID]|termLabel [termID]。 例如：對大西洋中部光層水樣本進行標註，考慮使用：oceanic epipelagic zone biome [ENVO:01000033]、對亞馬遜雨林樣本進行標註，考慮使用：tropical moist broadleaf forest biome [ENVO:01000228]。如有需要，請在ENVO跟踪器上提出新的term，會在這裡列出：http://www.obofoundry.org/ontology/envo.html" data-commonname="概略大環境種類" data-example="forest biome [ENVO:01000174]">
                <label>
                    <input type="checkbox" name="env_broad_scale"/>
                    env_broad_scale
                </label>
            </div>
            <div class="checkbox" data-name="env_local_scale" data-type="" data-description="列出樣本或標本的當地或附近的環境種類，並對樣本或標本具有影響。請使用存在於ENVO中且比env_broad_scale具更細空間尺度的術語。 輸入一個術語的格式：termLabel [termID]。輸入多個術語的格式：termLabel [termID]|termLabel [termID]|termLabel [termID]。 例如：對從森林中各種植被層中提取的混合樣本進行標註，考慮使用：canopy [ENVO:00000047]|herb and fern layer [ENVO:01000337]|litter layer [ENVO:01000338]|understory [ENVO:01000335]|shrub layer [ENVO:01000336]。 如有需要，請在ENVO跟踪器上提出新的term，會在這裡列出：http://www.obofoundry.org/ontology/envo.html" data-commonname="當地環境種類" data-example="litter layer [ENVO:01000338]">
                <label>
                    <input type="checkbox" name="env_local_scale"/>
                    env_local_scale
                </label>
            </div>
            <div class="checkbox" data-name="env_medium" data-type="" data-description="列出採樣之前直接環繞著樣本或標本的環境材料，使用ENVO的環境材料類的一個或多個子類（http://purl.obolibrary.org/obo/ENVO_00010483）。 輸入一個術語的格式：termLabel [termID]。輸入多個術語的格式：termLabel [termID]|termLabel [termID]|termLabel [termID]。 例如：對於在大西洋上部100米游泳的魚進行標註，考慮使用：ocean water [ENVO:00002151]、對於在池塘上的鴨進行標註，考慮使用：pond water [ENVO:00002228]|air [ENVO_00002005]。 如有需要，請在ENVO跟踪器上提出新的term，會在這裡列出：http://www.obofoundry.org/ontology/envo.html" data-commonname="環境介質種類" data-example="soil [ENVO:00001998]">
                <label>
                    <input type="checkbox" name="env_medium"/>
                    env_medium
                </label>
            </div>
            <div class="checkbox" data-name="project_name" data-type="" data-description="進行樣本定序的計畫名稱" data-commonname="計畫名稱" data-example="Forest soil metagenome">
                <label>
                    <input type="checkbox" name="project_name"/>
                    project_name
                </label>
            </div>
            <div class="checkbox" data-name="experimental_factor" data-type="" data-description="實驗參數是實驗設計裡的可變因素，用於以越來越詳細的方式來描述實驗或一組實驗。此欄位接受來自實驗因素本體控制詞彙（EFO）和/或生物醫學調查本體（OBI）的本體術語。對於EFO（v 2.95）術語的瀏覽器，請參見http://purl.bioontology.org/ontology/EFO；對於OBI（v 2018-02-12）術語的瀏覽器，請參見http://purl.bioontology.org/ontology/OBI" data-commonname="實驗參數" data-example="time series design [EFO:EFO_0001779]">
                <label>
                    <input type="checkbox" name="experimental_factor"/>
                    experimental_factor
                </label>
            </div>
            <div class="checkbox" data-name="concentration" data-type="" data-description="DNA濃度。單位為奈克/微升" data-commonname="濃度" data-example="67.5">
                <label>
                    <input type="checkbox" name="concentration"/>
                    concentration
                </label>
            </div>
            <div class="checkbox" data-name="concentrationUnit" data-type="" data-description="DNA濃度單位" data-commonname="濃度單位" data-example="ng/µl">
                <label>
                    <input type="checkbox" name="concentrationUnit"/>
                    concentrationUnit
                </label>
            </div>
            <div class="checkbox" data-name="methodDeterminationConcentrationAndRatios" data-type="" data-description="DNA測量濃度與比例的方法" data-commonname="測量濃度與比例的方法" data-example="Nanodrop,<br>Qubit">
                <label>
                    <input type="checkbox" name="methodDeterminationConcentrationAndRatios"/>
                    methodDeterminationConcentrationAndRatios
                </label>
            </div>
            <div class="checkbox" data-name="ratioOfAbsorbance260_230" data-type="" data-description="在DNA純度評估中，以260nm和230nm的吸光度比值為主要指標" data-commonname="260/230吸收光譜比值" data-example="1.89">
                <label>
                    <input type="checkbox" name="ratioOfAbsorbance260_230"/>
                    ratioOfAbsorbance260_230
                </label>
            </div>
            <div class="checkbox" data-name="ratioOfAbsorbance260_280" data-type="" data-description="在DNA純度評估中，以260nm和280nm的吸光度比值為主要指標" data-commonname="260/280吸收光譜比值" data-example="1.91">
                <label>
                    <input type="checkbox" name="ratioOfAbsorbance260_280"/>
                    ratioOfAbsorbance260_280
                </label>
            </div>
            <div class="checkbox" data-name="subspecf_gen_lin" data-type="" data-description="This should provide further information about the genetic distinctness of the sequenced organism by recording additional information e.g. serovar, serotype, biotype, ecotype, or any relevant genetic typing schemes like Group I plasmid. It can also contain alternative taxonomic information. It should contain both the lineage name, and the lineage rank, i.e. biovar:abc123" data-commonname="" data-example="serovar:Newport">
                <label>
                    <input type="checkbox" name="subspecf_gen_lin"/>
                    subspecf_gen_lin
                </label>
            </div>
            <div class="checkbox" data-name="ploidy" data-type="" data-description="The ploidy level of the genome (e.g. allopolyploid, haploid, diploid, triploid, tetraploid). It has implications for the downstream study of duplicated gene and regions of the genomes (and perhaps for difficulties in assembly). For terms, please select terms listed under class ploidy (PATO:001374) of Phenotypic Quality Ontology (PATO), and for a browser of PATO (v 2018-03-27) please refer to http://purl.bioontology.org/ontology/PATO" data-commonname="" data-example="allopolyploidy [PATO:0001379]">
                <label>
                    <input type="checkbox" name="ploidy"/>
                    ploidy
                </label>
            </div>
            <div class="checkbox" data-name="num_replicons" data-type="" data-description="Reports the number of replicons in a nuclear genome of eukaryotes, in the genome of a bacterium or archaea or the number of segments in a segmented virus. Always applied to the haploid chromosome count of a eukaryote" data-commonname="" data-example="2">
                <label>
                    <input type="checkbox" name="num_replicons"/>
                    num_replicons
                </label>
            </div>
            <div class="checkbox" data-name="extrachrom_elements" data-type="" data-description="Do plasmids exist of significant phenotypic consequence (e.g. ones that determine virulence or antibiotic resistance). Megaplasmids? Other plasmids (borrelia has 15+ plasmids)" data-commonname="" data-example="5">
                <label>
                    <input type="checkbox" name="extrachrom_elements"/>
                    extrachrom_elements
                </label>
            </div>
            <div class="checkbox" data-name="estimated_size" data-type="" data-description="基因體定序之前預估的大小。在（真核）基因體的定序中尤為重要，因爲它可能會以草稿形式存在很長時間或未指定的期間" data-commonname="基因體的預估大小" data-example="300000 bp">
                <label>
                    <input type="checkbox" name="estimated_size"/>
                    estimated_size
                </label>
            </div>
            <div class="checkbox" data-name="ref_biomaterial" data-type="" data-description="樣本或分離物在基因體定序前的主要參考文獻，如已定序，則引用基因體發表文獻" data-commonname="生物材料參考文獻" data-example="doi:10.1016/j.syapm.2018.01.009">
                <label>
                    <input type="checkbox" name="ref_biomaterial"/>
                    ref_biomaterial
                </label>
            </div>
            <div class="checkbox" data-name="source_mat_id" data-type="" data-description="這編號用於給材料樣本將後續萃取核酸和隨後定序的唯一識別編號。該編號可以是用於原始收集的材料，也可以是任何衍生的子樣本。INSDC裡的欄位，例如 /specimen_voucher、/bio_material 或 /culture_collection 裡的值是否與 source_mat_id 術語共享可能取決於情況。例如，/specimen_voucher 和 source_mat_id 可能都包含´UAM:Herps:14´，既指標本憑證又指相同標本憑證的取樣組織。但是，/culture_collection 可能指的是從初始培養（例如ATCC:11775）獲得的值，而 source_mat_id 將指的是從中萃取核酸的某個衍生培養的標識（例如xatc123或ark:/2154/R2）。" data-commonname="樣本材料來源ID" data-example="MPI012345">
                <label>
                    <input type="checkbox" name="source_mat_id"/>
                    source_mat_id
                </label>
            </div>
            <div class="checkbox" data-name="pathogenicity" data-type="" data-description="可致病於什麼宿主" data-commonname="宿主" data-example="human,<br>animal,<br>plant,<br>fungi,<br>bacteria">
                <label>
                    <input type="checkbox" name="pathogenicity"/>
                    pathogenicity
                </label>
            </div>
            <div class="checkbox" data-name="biotic_relationship" data-type="" data-description="主體生物與其它相關生物之間的關係描述。例如，寄生在物種X；與物種Y共生。目標生物是關係的主體，而其它生物是客體。建議使用控制詞彙" data-commonname="生物關係" data-example="free living">
                <label>
                    <input type="checkbox" name="biotic_relationship"/>
                    biotic_relationship
                </label>
            </div>
            <div class="checkbox" data-name="specific_host" data-type="" data-description="如有宿主，請提供其 taxid。如果該生物不是在死亡或活著的宿主分離出來，例如，病原體可能是從實驗臺上的擦拭中分離出來的，就輸入 environmental (環境)。並報告它是實驗室宿主還是自然宿主" data-commonname="宿主" data-example="9606">
                <label>
                    <input type="checkbox" name="specific_host"/>
                    specific_host
                </label>
            </div>
            <div class="checkbox" data-name="host_spec_range" data-type="" data-description="The NCBI taxonomy identifier of the specific host if it is known" data-commonname="" data-example="9606">
                <label>
                    <input type="checkbox" name="host_spec_range"/>
                    host_spec_range
                </label>
            </div>
            <div class="checkbox" data-name="host_disease_stat" data-type="" data-description="已被診斷宿主的疾病清單；可以包含多個。值取決於宿主；對於人類，術語應從https://www.disease-ontology.org 的DO（Human Disease Ontology）中選擇，非人類宿主疾病則無控制詞彙" data-commonname="宿主疾病狀態" data-example="dead">
                <label>
                    <input type="checkbox" name="host_disease_stat"/>
                    host_disease_stat
                </label>
            </div>
            <div class="checkbox" data-name="trophic_level" data-type="" data-description="食物階層是食物鏈中餵食的位置。微生物可以是各種生產者（例如，化能無機營養生物）。建議使用控制詞彙" data-commonname="食物階層" data-example="heterotroph">
                <label>
                    <input type="checkbox" name="trophic_level"/>
                    trophic_level
                </label>
            </div>
            <div class="checkbox" data-name="propagation" data-type="" data-description="This field is specific to different taxa. For phages: lytic/lysogenic, for plasmids: incompatibility group, for eukaryotes: sexual/asexual (Note: there is the strong opinion to name phage propagation obligately lytic or temperate, therefore we also give this choice" data-commonname="" data-example="lytic">
                <label>
                    <input type="checkbox" name="propagation"/>
                    propagation
                </label>
            </div>
            <div class="checkbox" data-name="encoded_traits" data-type="" data-description="Should include key traits like antibiotic resistance or xenobiotic degradation phenotypes for plasmids, converting genes for phage" data-commonname="" data-example="beta-lactamase class A">
                <label>
                    <input type="checkbox" name="encoded_traits"/>
                    encoded_traits
                </label>
            </div>
            <div class="checkbox" data-name="rel_to_oxygen" data-type="" data-description="Is this organism an aerobe, anaerobe? Please note that aerobic and anaerobic are valid descriptors for microbial environments" data-commonname="" data-example="aerobe">
                <label>
                    <input type="checkbox" name="rel_to_oxygen"/>
                    rel_to_oxygen
                </label>
            </div>
            <div class="checkbox" data-name="isol_growth_condt" data-type="" data-description="Publication reference in the form of pubmed ID (pmid), digital object identifier (doi) or url for isolation and growth condition specifications of the organism/material" data-commonname="" data-example="doi: 10.1016/j.syapm.2018.01.009">
                <label>
                    <input type="checkbox" name="isol_growth_condt"/>
                    isol_growth_condt
                </label>
            </div>
            <div class="checkbox" data-name="samp_collec_device" data-type="" data-description="用於收集環境樣本的設備。建議輸入列在environmental sampling device（http://purl.obolibrary.org/obo/ENVO）下的術語。此值也接受列在specimen collection device（http://purl.obolibrary.org/obo/GENEPIO_0002094）下的術語" data-commonname="樣本採集裝置" data-example="environmental swab sampling,<br>biopsy,<br>niskin bottle,<br>push core">
                <label>
                    <input type="checkbox" name="samp_collec_device"/>
                    samp_collec_device
                </label>
            </div>
            <div class="checkbox" data-name="samp_collec_method" data-type="" data-description="樣本採集的方法" data-commonname="樣本採集的方法" data-example="environmental swab sampling,<br>biopsy,<br>niskin bottle,<br>push core">
                <label>
                    <input type="checkbox" name="samp_collec_method"/>
                    samp_collec_method
                </label>
            </div>
            <div class="checkbox" data-name="samp_mat_process" data-type="" data-description="從環境中採樣本期間或之後對樣本進行的任何處理。此值接受OBI術語，請見http://purl.bioontology.org/ontology/OBI" data-commonname="採樣過程處理" data-example="filtering of seawater,<br>storing samples in ethanol">
                <label>
                    <input type="checkbox" name="samp_mat_process"/>
                    samp_mat_process
                </label>
            </div>
            <div class="checkbox" data-name="size_frac" data-type="" data-description="樣本製備中使用的過濾孔徑大小" data-commonname="過濾孔徑大小" data-example="0-0.22 micrometer">
                <label>
                    <input type="checkbox" name="size_frac"/>
                    size_frac
                </label>
            </div>
            <div class="checkbox" data-name="samp_size" data-type="" data-description="收集的樣本的量或大小（體積、質量或面積）" data-commonname="收集樣本量" data-example="5 liter">
                <label>
                    <input type="checkbox" name="samp_size"/>
                    samp_size
                </label>
            </div>
            <div class="checkbox" data-name="samp_vol_we_dna_ext" data-type="" data-description="DNA萃取的總樣本體積（毫升）或質量（克）。注意：應將收集的總樣本輸入到術語 samp_size 下" data-commonname="用來萃取DNA的樣本量" data-example="1500 milliliter">
                <label>
                    <input type="checkbox" name="samp_vol_we_dna_ext"/>
                    samp_vol_we_dna_ext
                </label>
            </div>
            <div class="checkbox" data-name="source_uvig" data-type="" data-description="Type of dataset from which the UViG was obtained" data-commonname="" data-example="viral fraction metagenome (virome)">
                <label>
                    <input type="checkbox" name="source_uvig"/>
                    source_uvig
                </label>
            </div>
            <div class="checkbox" data-name="virus_enrich_appr" data-type="" data-description="List of approaches used to enrich the sample for viruses, if any" data-commonname="" data-example="filtration + FeCl Precipitation + ultracentrifugation + DNAse">
                <label>
                    <input type="checkbox" name="virus_enrich_appr"/>
                    virus_enrich_appr
                </label>
            </div>
            <div class="checkbox" data-name="probeReporter" data-type="" data-description="Type of fluorophore (reporter) used. Probe anneals within amplified target DNA. Polymerase activity degrades the probe that has annealed to the template, and the probe releases the fluorophore from it and breaks the proximity to the quencher, thus allowing fluorescence of the fluorophore." data-commonname="" data-example="FAM">
                <label>
                    <input type="checkbox" name="probeReporter"/>
                    probeReporter
                </label>
            </div>
            <div class="checkbox" data-name="probeQuencher" data-type="" data-description="Type of quencher used. The quencher molecule quenches the fluorescence emitted by the fluorophore when excited by the cycler’s light source As long as fluorophore and the quencher are in proximity, quenching inhibits any fluorescence signals." data-commonname="" data-example="NFQ-MGB">
                <label>
                    <input type="checkbox" name="probeQuencher"/>
                    probeQuencher
                </label>
            </div>
            <div class="checkbox" data-name="thresholdQuantificationCycle" data-type="" data-description="Threshold for change in fluorescence signal between cycles" data-commonname="" data-example="0.3">
                <label>
                    <input type="checkbox" name="thresholdQuantificationCycle"/>
                    thresholdQuantificationCycle
                </label>
            </div>
            <div class="checkbox" data-name="baselineValue" data-type="" data-description="The number of cycles when fluorescence signal from the target amplification is below background fluorescence not originated from the real target amplification." data-commonname="" data-example="15">
                <label>
                    <input type="checkbox" name="baselineValue"/>
                    baselineValue
                </label>
            </div>
            <div class="checkbox" data-name="quantificationCycle" data-type="" data-description="The number of cycles required for the fluorescent signal to cross a given value threshold above the baseline. Quantification cycle (Cq), threshold cycle (Ct), crossing point (Cp), and take-off point (TOP) refer to the same value from the real-time instrument. Use of quantification cycle (Cq), is preferable according to the RDML (Real-Time PCR Data Markup Language) data standard (http://www.rdml.org). data-commonname="" data-example="37.9450950622558">
                <label>
                    <input type="checkbox" name="quantificationCycle"/>
                    quantificationCycle
                </label>
            </div>
            <div class="checkbox" data-name="automaticThresholdQuantificationCycle" data-type="" data-description="Whether the threshold was set by the instrument or manually." data-commonname="" data-example="true">
                <label>
                    <input type="checkbox" name="automaticThresholdQuantificationCycle"/>
                    automaticThresholdQuantificationCycle
                </label>
            </div>
            <div class="checkbox" data-name="automaticBaselineValue" data-type="" data-description="Whether the baseline value was set by the instrument or manually." data-commonname="" data-example="true">
                <label>
                    <input type="checkbox" name="automaticBaselineValue"/>
                    automaticBaselineValue
                </label>
            </div>
            <div class="checkbox" data-name="contaminationAssessment" data-type="" data-description="Whether DNA or RNA contamination assessment was done or not." data-commonname="" data-example="true">
                <label>
                    <input type="checkbox" name="contaminationAssessment"/>
                    contaminationAssessment
                </label>
            </div>
            <div class="checkbox" data-name="partitionVolume" data-type="" data-description="An accurate estimation of partition volume. The sum of the partitions multiplied by the partition volume will enable the total volume of the reaction to be calculated." data-commonname="" data-example="1">
                <label>
                    <input type="checkbox" name="partitionVolume"/>
                    partitionVolume
                </label>
            </div>
            <div class="checkbox" data-name="estimatedNumberOfCopies" data-type="" data-description="Number of target molecules per µl. Mean copies per partition (?) can be calculated using the number of partitions (n) and the estimated copy number in the total volume of all partitions (m) with a formula ?=m/n." data-commonname="" data-example="10300">
                <label>
                    <input type="checkbox" name="estimatedNumberOfCopies"/>
                    estimatedNumberOfCopies
                </label>
            </div>
            <div class="checkbox" data-name="amplificationReactionVolume" data-type="" data-description="PCR擴增反應的體積大小" data-commonname="擴增反應體積" data-example="22">
                <label>
                    <input type="checkbox" name="amplificationReactionVolume"/>
                    amplificationReactionVolume
                </label>
            </div>
            <div class="checkbox" data-name="amplificationReactionVolumeUnit" data-type="" data-description="PCR擴增反應的體積大小單位" data-commonname="擴增反應體積單位" data-example="µl">
                <label>
                    <input type="checkbox" name="amplificationReactionVolumeUnit"/>
                    amplificationReactionVolumeUnit
                </label>
            </div>
            <div class="checkbox" data-name="pcr_analysis_software" data-type="" data-description="The program used to analyse the d(d)PCR runs." data-commonname="" data-example="BIO-RAD QuantaSoft">
                <label>
                    <input type="checkbox" name="pcr_analysis_software"/>
                    pcr_analysis_software
                </label>
            </div>
            <div class="checkbox" data-name="experimentalVariance" data-type="" data-description="Multiple biological replicates are encouraged to assess total experimental variation. When single dPCR experiments are performed, a minimal estimate of variance due to counting error alone must be calculated from the binomial (or suitable equivalent) distribution." data-commonname="" data-example="">
                <label>
                    <input type="checkbox" name="experimentalVariance"/>
                    experimentalVariance
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_lod" data-type="" data-description="The assay’s ability to detect the target at low levels." data-commonname="" data-example="51">
                <label>
                    <input type="checkbox" name="pcr_primer_lod"/>
                    pcr_primer_lod
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_loq" data-type="" data-description="The assay’s ability to quantify copy number at low levels." data-commonname="" data-example="184">
                <label>
                    <input type="checkbox" name="pcr_primer_loq"/>
                    pcr_primer_loq
                </label>
            </div>
            <div class="checkbox" data-name="nucl_acid_ext" data-type="" data-description="描述從樣本中透過物質分離來萃取核酸的文獻參考、電子資源或標準操作程序（SOP）的連結" data-commonname="核酸萃取方法引用文獻" data-example="https://mobio.com/media/wysiwyg/pdfs/protocols/12888.pdf">
                <label>
                    <input type="checkbox" name="nucl_acid_ext"/>
                    nucl_acid_ext
                </label>
            </div>
            <div class="checkbox" data-name="nucl_acid_amp" data-type="" data-description="描述從核酸擴增過程與方法的文獻參考、電子資源或標準操作程序（SOP）的連結" data-commonname="核酸擴增方法引用文獻" data-example="https://phylogenomics.me/protocols/16s-pcr-protocol/">
                <label>
                    <input type="checkbox" name="nucl_acid_amp"/>
                    nucl_acid_amp
                </label>
            </div>
            <div class="checkbox" data-name="lib_size" data-type="" data-description="Total number of clones in the library prepared for the project" data-commonname="" data-example="50">
                <label>
                    <input type="checkbox" name="lib_size"/>
                    lib_size
                </label>
            </div>
            <div class="checkbox" data-name="lib_reads_seqd" data-type="" data-description="Total number of clones sequenced from the library" data-commonname="" data-example="20">
                <label>
                    <input type="checkbox" name="lib_reads_seqd"/>
                    lib_reads_seqd
                </label>
            </div>
            <div class="checkbox" data-name="lib_layout" data-type="" data-description="Specify whether to expect single, paired, or other configuration of reads" data-commonname="" data-example="paired">
                <label>
                    <input type="checkbox" name="lib_layout"/>
                    lib_layout
                </label>
            </div>
            <div class="checkbox" data-name="lib_vector" data-type="" data-description="Cloning vector type(s) used in construction of libraries" data-commonname="" data-example="Bacteriophage P1">
                <label>
                    <input type="checkbox" name="lib_vector"/>
                    lib_vector
                </label>
            </div>
            <div class="checkbox" data-name="lib_screen" data-type="" data-description="Specific enrichment or screening methods applied before and/or after creating libraries" data-commonname="" data-example="enriched,<br>screened,<br>normalized">
                <label>
                    <input type="checkbox" name="lib_screen"/>
                    lib_screen
                </label>
            </div>
            <div class="checkbox" data-name="mid" data-type="" data-description="Molecular barcodes, called Multiplex Identifiers (MIDs), that are used to specifically tag unique samples in a sequencing run. Sequence should be reported in uppercase letters" data-commonname="" data-example="GTGAATAT">
                <label>
                    <input type="checkbox" name="mid"/>
                    mid
                </label>
            </div>
            <div class="checkbox" data-name="adapters" data-type="" data-description="轉接子為樣本library片段的擴增和定序提供引物序列。應列出兩個轉接子並使用大寫字母" data-commonname="轉接子序列" data-example="AATGATACGGCGACCACCGAGATCTACACGCT;CAAGCAGAAGACGGCATACGAGAT">
                <label>
                    <input type="checkbox" name="adapters"/>
                    adapters
                </label>
            </div>
            <div class="checkbox" data-name="pcr_cond" data-type="" data-description="PCR反應放法的描述：´initial denaturation:94degC_1.5min; annealing=.." data-commonname="PCR反應方法" data-example="initial denaturation: 94_3;<br>annealing: 50_1;<br>elongation: 72_1.5;<br>final elongation: 72_10;<br>35">
                <label>
                    <input type="checkbox" name="pcr_cond"/>
                    pcr_cond
                </label>
            </div>
            <div class="checkbox" data-name="seq_quality_check" data-type="" data-description="Indicate if the sequence has been called by automatic systems (none) or undergone a manual editing procedure (e.g. by inspecting the raw data or chromatograms). Applied only for sequences that are not submitted to SRA,ENA or DRA" data-commonname="" data-example="none">
                <label>
                    <input type="checkbox" name="seq_quality_check"/>
                    seq_quality_check
                </label>
            </div>
            <div class="checkbox" data-name="chimera_check" data-type="" data-description="A chimeric sequence, or chimera for short, is a sequence comprised of two or more phylogenetically distinct parent sequences. Chimeras are usually PCR artifacts thought to occur when a prematurely terminated amplicon reanneals to a foreign DNA strand and is copied to completion in the following PCR cycles. The point at which the chimeric sequence changes from one parent to the next is called the breakpoint or conversion point" data-commonname="" data-example="uchime;v4.1;default parameters">
                <label>
                    <input type="checkbox" name="chimera_check"/>
                    chimera_check
                </label>
            </div>
            <div class="checkbox" data-name="tax_ident" data-type="" data-description="所使用的遺傳標記基因名稱，建議使用控制詞彙" data-commonname="遺傳標記基因名稱" data-example="other: rpoB gene">
                <label>
                    <input type="checkbox" name="tax_ident"/>
                    tax_ident
                </label>
            </div>
            <div class="checkbox" data-name="assembly_qual" data-type="" data-description="The assembly quality category is based on sets of criteria outlined for each assembly quality category. For MISAG/MIMAG; Finished: Single, validated, contiguous sequence per replicon without gaps or ambiguities with a consensus error rate equivalent to Q50 or better. High Quality Draft:Multiple fragments where gaps span repetitive regions. Presence of the 23S, 16S and 5S rRNA genes and at least 18 tRNAs. Medium Quality Draft:Many fragments with little to no review of assembly other than reporting of standard assembly statistics. Low Quality Draft:Many fragments with little to no review of assembly other than reporting of standard assembly statistics. Assembly statistics include, but are not limited to total assembly size, number of contigs, contig N50/L50, and maximum contig length. For MIUVIG; Finished: Single, validated, contiguous sequence per replicon without gaps or ambiguities, with extensive manual review and editing to annotate putative gene functions and transcriptional units. High-quality draft genome: One or multiple fragments, totaling ≥ 90% of the expected genome or replicon sequence or predicted complete. Genome fragment(s): One or multiple fragments, totalling < 90% of the expected genome or replicon sequence, or for which no genome size could be estimated" data-commonname="" data-example="High-quality draft genome">
                <label>
                    <input type="checkbox" name="assembly_qual"/>
                    assembly_qual
                </label>
            </div>
            <div class="checkbox" data-name="assembly_name" data-type="" data-description="基因組組裝的名稱或版本，發布者分享此基因組至基因體平台所使用的基因組組裝名稱" data-commonname="基因組組裝名稱" data-example="HuRef,<br>JCVI_ISG_i3_1.0">
                <label>
                    <input type="checkbox" name="assembly_name"/>
                    assembly_name
                </label>
            </div>
            <div class="checkbox" data-name="assembly_software" data-type="" data-description="基因組組裝軟體或工具的名稱，應包括版本與使用參數" data-commonname="基因組組裝工具" data-example="metaSPAdes;3.11.0;kmer set 21,33,55,77,99,121, default parameters otherwise">
                <label>
                    <input type="checkbox" name="assembly_software"/>
                    assembly_software
                </label>
            </div>
            <div class="checkbox" data-name="annot" data-type="" data-description="基因體註解軟體或工具的名稱" data-commonname="基因體註解工具" data-example="prokka">
                <label>
                    <input type="checkbox" name="annot"/>
                    annot
                </label>
            </div>
            <div class="checkbox" data-name="number_contig" data-type="" data-description="Total number of contigs in the cleaned/submitted assembly that makes up a given genome, SAG, MAG, or UViG" data-commonname="" data-example="40">
                <label>
                    <input type="checkbox" name="number_contig"/>
                    number_contig
                </label>
            </div>
            <div class="checkbox" data-name="feat_pred" data-type="" data-description="Method used to predict UViGs features such as ORFs, integration site, etc." data-commonname="" data-example="Prodigal;2.6.3;default parameters">
                <label>
                    <input type="checkbox" name="feat_pred"/>
                    feat_pred
                </label>
            </div>
            <div class="checkbox" data-name="ref_db" data-type="" data-description="List of database(s) used for ORF annotation, along with version number and reference to website or publication" data-commonname="" data-example="pVOGs;5;http://dmk-brain.ecn.uiowa.edu/pVOGs/ Grazziotin et al. 2017 doi:10.1093/nar/gkw975">
                <label>
                    <input type="checkbox" name="ref_db"/>
                    ref_db
                </label>
            </div>
            <div class="checkbox" data-name="sim_search_meth" data-type="" data-description="Tool used to compare ORFs with database, along with version and cutoffs used" data-commonname="" data-example="HMMER3;3.1b2;hmmsearch, cutoff of 50 on score">
                <label>
                    <input type="checkbox" name="sim_search_meth"/>
                    sim_search_meth
                </label>
            </div>
            <div class="checkbox" data-name="tax_class" data-type="" data-description="Method used for taxonomic classification, along with reference database used, classification rank, and thresholds used to classify new genomes" data-commonname="" data-example="vConTACT vContact2 (references from NCBI RefSeq v83, genus rank classification, default parameters)">
                <label>
                    <input type="checkbox" name="tax_class"/>
                    tax_class
                </label>
            </div>
            <div class="checkbox" data-name="_16s_recover" data-type="" data-description="Can a 16S gene be recovered from the submitted SAG or MAG?" data-commonname="" data-example="true">
                <label>
                    <input type="checkbox" name="_16s_recover"/>
                    _16s_recover
                </label>
            </div>
            <div class="checkbox" data-name="_16s_recover_software" data-type="" data-description="Tools used for 16S rRNA gene extraction" data-commonname="" data-example="rambl;v2;default parameters">
                <label>
                    <input type="checkbox" name="_16s_recover_software"/>
                    _16s_recover_software
                </label>
            </div>
            <div class="checkbox" data-name="trnas" data-type="" data-description="The total number of tRNAs identified from the SAG or MAG" data-commonname="" data-example="18">
                <label>
                    <input type="checkbox" name="trnas"/>
                    trnas
                </label>
            </div>
            <div class="checkbox" data-name="trna_ext_software" data-type="" data-description="Tools used for tRNA identification" data-commonname="" data-example="infernal;v2;default parameters">
                <label>
                    <input type="checkbox" name="trna_ext_software"/>
                    trna_ext_software
                </label>
            </div>
            <div class="checkbox" data-name="compl_score" data-type="" data-description="Completeness score is typically based on either the fraction of markers found as compared to a database or the percent of a genome found as compared to a closely related reference genome. High Quality Draft: >90%, Medium Quality Draft: >50%, and Low Quality Draft: < 50% should have the indicated completeness scores" data-commonname="" data-example="med;60%">
                <label>
                    <input type="checkbox" name="compl_score"/>
                    compl_score
                </label>
            </div>
            <div class="checkbox" data-name="compl_software" data-type="" data-description="Tools used for completion estimate, i.e. checkm, anvi´o, busco" data-commonname="" data-example="checkm">
                <label>
                    <input type="checkbox" name="compl_software"/>
                    compl_software
                </label>
            </div>
            <div class="checkbox" data-name="compl_appr" data-type="" data-description="The approach used to determine the completeness of a given SAG or MAG, which would typically make use of a set of conserved marker genes or a closely related reference genome. For UViG completeness, include reference genome or group used, and contig feature suggesting a complete genome" data-commonname="" data-example="other: UViG length compared to the average length of reference genomes from the P22virus genus (NCBI RefSeq v83)">
                <label>
                    <input type="checkbox" name="compl_appr"/>
                    compl_appr
                </label>
            </div>
            <div class="checkbox" data-name="contam_score" data-type="" data-description="The contamination score is based on the fraction of single-copy genes that are observed more than once in a query genome. The following scores are acceptable for; High Quality Draft: < 5%, Medium Quality Draft: < 10%, Low Quality Draft: < 10%. Contamination must be below 5% for a SAG or MAG to be deposited into any of the public databases" data-commonname="" data-example="1%">
                <label>
                    <input type="checkbox" name="contam_score"/>
                    contam_score
                </label>
            </div>
            <div class="checkbox" data-name="contam_screen_input" data-type="" data-description="The type of sequence data used as input" data-commonname="" data-example="contigs">
                <label>
                    <input type="checkbox" name="contam_screen_input"/>
                    contam_screen_input
                </label>
            </div>
            <div class="checkbox" data-name="contam_screen_param" data-type="" data-description="Specific parameters used in the decontamination sofware, such as reference database, coverage, and kmers. Combinations of these parameters may also be used, i.e. kmer and coverage, or reference database and kmer" data-commonname="" data-example="kmer">
                <label>
                    <input type="checkbox" name="contam_screen_param"/>
                    contam_screen_param
                </label>
            </div>
            <div class="checkbox" data-name="decontam_software" data-type="" data-description="Tool(s) used in contamination screening" data-commonname="" data-example="anvi´o">
                <label>
                    <input type="checkbox" name="decontam_software"/>
                    decontam_software
                </label>
            </div>
            <div class="checkbox" data-name="sort_tech" data-type="" data-description="Method used to sort/isolate cells or particles of interest" data-commonname="" data-example="optical manipulation">
                <label>
                    <input type="checkbox" name="sort_tech"/>
                    sort_tech
                </label>
            </div>
            <div class="checkbox" data-name="single_cell_lysis_appr" data-type="" data-description="Method used to free DNA from interior of the cell(s) or particle(s)" data-commonname="" data-example="enzymatic">
                <label>
                    <input type="checkbox" name="single_cell_lysis_appr"/>
                    single_cell_lysis_appr
                </label>
            </div>
            <div class="checkbox" data-name="single_cell_lysis_prot" data-type="" data-description="Name of the kit or standard protocol used for cell(s) or particle(s) lysis" data-commonname="" data-example="ambion single cell lysis kit">
                <label>
                    <input type="checkbox" name="single_cell_lysis_prot"/>
                    single_cell_lysis_prot
                </label>
            </div>
            <div class="checkbox" data-name="wga_amp_appr" data-type="" data-description="Method used to amplify genomic DNA in preparation for sequencing" data-commonname="" data-example="mda based">
                <label>
                    <input type="checkbox" name="wga_amp_appr"/>
                    wga_amp_appr
                </label>
            </div>
            <div class="checkbox" data-name="wga_amp_kit" data-type="" data-description="Kit used to amplify genomic DNA in preparation for sequencing" data-commonname="" data-example="qiagen repli-g">
                <label>
                    <input type="checkbox" name="wga_amp_kit"/>
                    wga_amp_kit
                </label>
            </div>
            <div class="checkbox" data-name="bin_param" data-type="" data-description="The parameters that have been applied during the extraction of genomes from metagenomic datasets" data-commonname="" data-example="coverage and kmer">
                <label>
                    <input type="checkbox" name="bin_param"/>
                    bin_param
                </label>
            </div>
            <div class="checkbox" data-name="bin_software" data-type="" data-description="Tool(s) used for the extraction of genomes from metagenomic datasets" data-commonname="" data-example="concoct and maxbin">
                <label>
                    <input type="checkbox" name="bin_software"/>
                    bin_software
                </label>
            </div>
            <div class="checkbox" data-name="reassembly_bin" data-type="" data-description="Has an assembly been performed on a genome bin extracted from a metagenomic assembly?" data-commonname="" data-example="false">
                <label>
                    <input type="checkbox" name="reassembly_bin"/>
                    reassembly_bin
                </label>
            </div>
            <div class="checkbox" data-name="mag_cov_software" data-type="" data-description="Tool(s) used to determine the genome coverage if coverage is used as a binning parameter in the extraction of genomes from metagenomic datasets" data-commonname="" data-example="bbmap">
                <label>
                    <input type="checkbox" name="mag_cov_software"/>
                    mag_cov_software
                </label>
            </div>
            <div class="checkbox" data-name="vir_ident_software" data-type="" data-description="Tool(s) used for the identification of UViG as a viral genome, software or protocol name including version number, parameters, and cutoffs used" data-commonname="" data-example="VirSorter; 1.0.4; Virome database, category 2">
                <label>
                    <input type="checkbox" name="vir_ident_software"/>
                    vir_ident_software
                </label>
            </div>
            <div class="checkbox" data-name="pred_genome_type" data-type="" data-description="Type of genome predicted for the UViG" data-commonname="" data-example="dsDNA">
                <label>
                    <input type="checkbox" name="pred_genome_type"/>
                    pred_genome_type
                </label>
            </div>
            <div class="checkbox" data-name="pred_genome_struc" data-type="" data-description="Expected structure of the viral genome" data-commonname="" data-example="non-segmented">
                <label>
                    <input type="checkbox" name="pred_genome_struc"/>
                    pred_genome_struc
                </label>
            </div>
            <div class="checkbox" data-name="detec_type" data-type="" data-description="Type of UViG detection" data-commonname="" data-example="independent sequence (UViG)">
                <label>
                    <input type="checkbox" name="detec_type"/>
                    detec_type
                </label>
            </div>
            <div class="checkbox" data-name="host_pred_appr" data-type="" data-description="Tool or approach used for host prediction" data-commonname="" data-example="CRISPR spacer match">
                <label>
                    <input type="checkbox" name="host_pred_appr"/>
                    host_pred_appr
                </label>
            </div>
            <div class="checkbox" data-name="url" data-type="" data-description="For each tool or approach used for host prediction, estimated false discovery rates should be included, either computed de novo or from the literature" data-commonname="" data-example="CRISPR spacer match: 0 or 1 mismatches, estimated 8% FDR at the host genus rank (Edwards et al. 2016 doi:10.1093/femsre/fuv048)">
                <label>
                    <input type="checkbox" name="url"/>
                    url
                </label>
            </div>
            <div class="checkbox" data-name="host_pred_appr" data-type="" data-description="Tool or approach used for host prediction" data-commonname="" data-example="http://www.earthmicrobiome.org/">
                <label>
                    <input type="checkbox" name="host_pred_appr"/>
                    host_pred_appr
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_reference" data-type="" data-description="用於擴增目標基因或子片段序列的PCR引子的參考文獻" data-commonname="PCR引子參考文獻" data-example="https://doi.org/10.1186/1742-9994-10-34">
                <label>
                    <input type="checkbox" name="pcr_primer_reference"/>
                    pcr_primer_reference
                </label>
            </div>
        </fieldset>
        `;
    }

    $("#extensionFieldset").html(fieldsetContent);
}