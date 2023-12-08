var allCheckedCheckboxNames = [];

$(document).ready(function () {

    // 初始化多選下拉選單
    $('#extension').fSelect();

    // 在頁面加載時讀取儲存的自定模版
    renderSavedOptions()

    // 下拉選單事件：主題下拉選單連動其他選單
    $('#theme').on('change', function() {
        var selectedTheme = $(this).val();
        $('#core').val('');
        
        if (selectedTheme === 'ecological-survey') {
            $('#core').val('samplingevent').prop('disabled', true); // 指定核心，並鎖定下拉選單
        } else if (selectedTheme === 'parasite') {
            $('#core').val('occurrence').prop('disabled', true); // 指定核心，並鎖定下拉選單
        } else {
            $('#core').val('').prop('disabled', false); // 如果沒有特定主題，可以自由選擇核心
        }

        updateDropdown();
        updateFieldsetContent(); // 同時更新 fieldset 的內容
        updateCheckedCheckboxNames();
        updateExtensionFieldsetContent(); 
        handleCheckboxClick(); // 檢查 checkbox 是否重複勾選
    });

    // 下拉選單事件：更新資料集類型的欄位內容
    $('#core').on('change', function() {
        updateFieldsetContent();

        if ($('#custom option:selected').text() !== '') { // 有選擇自訂模板的情況下，再選擇資料集類型時要檢查欄位是否重複
            var coreFieldsetID = $(this).val();
            disableDuplicatedCheckbox(coreFieldsetID);
        }

        updateCheckedCheckboxNames();

        // 檢查資料集類型和延伸資料集重複的欄位
        var selectedOptions = $('.fs-option.selected'); 
        selectedOptions.each(function () {
            var extensionFieldsetID = $(this).data('value');
            var target = "#" + extensionFieldsetID + " input[type='checkbox']"
            $(target).prop('disable', false);
            updateExtensionFieldsetContent();
            disableDuplicatedCheckbox(extensionFieldsetID);
        });

        updateCheckedCheckboxNames();
        handleCheckboxClick(); // 檢查 checkbox 是否重複勾選
    });

    // 下拉選單事件：更新延伸資料集的欄位內容
    $('#extension').on('change', function() {
        updateCheckedCheckboxNames();
        updateExtensionFieldsetContent();

        // 檢查延伸資料集和其他重複的欄位
        var selectedOptions = $('.fs-option.selected');
        selectedOptions.each(function () {
            var extensionFieldsetID = $(this).data('value');
            var target = "#" + extensionFieldsetID + " input[type='checkbox']"
            $(target).prop('disable', false);
            disableDuplicatedCheckbox(extensionFieldsetID);
        });

        updateCheckedCheckboxNames();
        handleCheckboxClick(); // 檢查 checkbox 是否重複勾選
    });

    // 下拉選單事件：更新自訂模板的欄位內容
    $('#custom').on('change', function() {
        if ($('#custom option:selected').text() !== '') {
            $('#custom-template-container span:nth-child(2)').removeClass('d-none');
            console.log($('#custom option:selected').text());
        } else {
            $('#custom-template-container span:nth-child(2)').addClass('d-none');
        }
        
        updateFieldsetContent();
        updateCheckedCheckboxNames();

        if ($('#requiredFieldset').length > 0) { // 只要重選自訂模板，其他的下拉選單一起重置
            $('#core').val('');
            $('.fs-label').text('');
            $('.fs-option').removeClass('selected');
            $('#requiredFieldset').html('');
        }

        // 檢查自訂模板和延伸資料集重複的欄位
        var selectedOptions = $('.fs-option.selected');
        selectedOptions.each(function () {
            var extensionFieldsetID = $(this).data('value');
            disableDuplicatedCheckbox(extensionFieldsetID);
        });

        updateCheckedCheckboxNames();
        handleCheckboxClick(); // 檢查 checkbox 是否重複勾選
    });

    // 滑鼠事件之前隱藏樣式
    $("#description-name").hide();
    $("#description-type").hide();
    $("#description").hide();
    $("#description-commonname").hide();
    $("#description-example").hide();
    $(".description-title").hide();

    // 滑鼠事件：移入欄位顯示對應的說明
    $("#requiredFieldset").on("mouseenter", ".checkbox", function () {
    
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

    $("#requiredFieldset").on("mouseleave", ".checkbox", function () {
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
        if ($('#core').val() !== '') { // 檢查有沒有選擇資料集類型，有的話才能下一步
            updateCheckedCheckboxNames()
        
            $.ajax({
                type: "POST",
                url: "/data-template",
                contentType: 'application/json;charset=UTF-8',
                data: JSON.stringify({ 'checkbox_names': allCheckedCheckboxNames }),
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
                    <div class="checkbox" data-description="" data-type=${columnType}>
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
                        <div class="checkbox" data-description="" data-type=${columnType}>
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

    $('.xx').on('click', function (event) {
        $('.popup-container').addClass('d-none');
    }) 

    $('#save-btn').on('click', function (event) {
        updateCheckedCheckboxNames();
        const templateName = $('#template-name').val();
        const newOption = $("<option>")
        .attr('value', allCheckedCheckboxNames.join(','))
        .text(templateName);

        localStorage.setItem(templateName, JSON.stringify(allCheckedCheckboxNames));

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
});

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
            .attr('value', checkboxNames.join(','))
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
        $('#core').val('samplingevent');
        $('.fs-wrap').removeClass('fs-default');
        $('.fs-label').text('Darwin Core Occurrence');
        $('.fs-option[data-value="darwin-core-occurrence"]').addClass('selected');
    } else if (selectedTheme === 'parasite') {
        $('#core').val('occurrence');
        $('.fs-wrap').removeClass('fs-default');
        $('.fs-label').text('Resource Relationship');
        $('.fs-option[data-value="resource-relationship"]').addClass('selected');
    } else {
        $('.fs-label').text('');
    }
}

// 功能：更新勾選的 checkboxes array
function updateCheckedCheckboxNames() {
    var checkedCheckboxNames = $("#requiredFieldset .checkbox input[type='checkbox']:checked").map(function () {
        return $(this).attr("name"); // 包含主題、資料集類型欄位
    }).get();
    
    var checkedCustomCheckboxNames = $("#customFieldset .checkbox input[type='checkbox']:checked").map(function () {
        return $(this).attr("name"); // 包含自訂、自訂模板欄位
    }).get();

    var checkedExtensionCheckboxNames = $("#extensionFieldset .checkbox input[type='checkbox']:checked").map(function () {
        return $(this).attr("name"); // 包含延伸資料集欄位
    }).get();
    
    // 更新全域變數
    allCheckedCheckboxNames = checkedCheckboxNames.concat(checkedCustomCheckboxNames, checkedExtensionCheckboxNames);
}

// 功能：檢查欄位勾選是否重複
function handleCheckboxClick() {
    $(".checkbox input[type='checkbox']").on('click', function() {
        console.log($(this).prop('checked'));
        if (allCheckedCheckboxNames.includes($(this).attr('name'))) {
            if ($(this).prop('checked') === true) {  // 已經勾選過的欄位不做檢查，避免自我檢查
                $(this).prop('disabled', true);
                $(this).prop('checked', false);
                $('.duplicated-popup').removeClass('d-none'); 
            }         
        } 
        updateCheckedCheckboxNames();
        // console.log(allCheckedCheckboxNames);
    });
}

// 功能：檢查欄位是否重複，有重複的話取消選選取並禁用。優先順序實作寫在每個下拉選單變動的地方，自訂模板 > 資料集類型 > 延伸資料集
function disableDuplicatedCheckbox (fieldsetID) {
    var target = "#" + fieldsetID + " input[type='checkbox']"
    $(target).each(function () {
        var chec = $(this).attr('name');

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
            <legend>必填欄位</legend>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼" data-commonname="出現紀錄ID" data-example="32567">
                <label>
                    <input type="checkbox" name="occurrenceID" checked />
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="basisOfRecord" data-type="Record-level" data-description="資料紀錄的特定性質、類型，建議使用 Darwin Core 的控制詞彙" data-commonname="紀錄類型" data-example="實體物質 MaterialEntity,<br>保存標本 PreservedSpecimen,<br>化石標本 FossilSpecimen,<br>活體標本 LivingSpecimen,<br>人類觀察 HumanObservation,<br>材料樣本 MaterialSample,<br>機器觀測 MachineObservation,<br>調查活動 Event,<br>名錄 Taxon,<br>出現紀錄 Occurrence,<br>材料引用 MaterialCitation">
                <label>
                    <input type="checkbox" name="basisOfRecord" checked />
                    basisOfRecord
                </label>
            </div>
            <div class="checkbox" data-name="eventDate" data-type="Event" data-description="該筆資料被記錄的日期" data-commonname="調查日期、Date、時間" data-example="「1994-11-05」代表單日，「1996-06」代表 1996 年 6 月">
                <label>
                    <input type="checkbox" name="eventDate" checked />
                    eventDate
                </label>
            </div>
            <div class="checkbox" data-name="individualCount" data-type="Occurrence" data-description="出現紀錄被記錄時存在的個體數量" data-commonname="數量、個體數" data-example="0, 1, 25">
                <label>
                    <input type="checkbox" name="individualCount" checked />
                    individualCount
                </label>
            </div>
            <div class="checkbox" data-name="locality" data-type="Location" data-description="採集或觀測地點的明確描述" data-commonname="地點" data-example="觀音山,<br>Caribbean Sea,<br>Florida">
                <label>
                    <input type="checkbox" name="locality" checked />
                    locality
                </label>
            </div>
            <div class="checkbox" data-name="verbatimLatitude" data-type="Location" data-description="字面緯度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="緯度" data-example="41d 16’N">
                <label>
                    <input type="checkbox" name="verbatimLatitude" checked />
                    verbatimLatitude
                </label>
            </div>
            <div class="checkbox" data-name="verbatimLongitude" data-type="Location" data-description="字面經度，採集或觀測取得紀錄的緯度，任何座標系統皆可" data-commonname="經度" data-example="121d 10’ 34" W">
                <label>
                    <input type="checkbox" name="verbatimLongitude" checked />
                    verbatimLongitude
                </label>
            </div>
            <div class="checkbox" data-name="verbatimCoordinateSystem" data-type="Location" data-description="紀錄的座標單位" data-commonname="座標單位" data-example="decimal degrees,<br>degrees decimal minutes,<br>degrees minutes seconds">
                <label>
                    <input type="checkbox" name="verbatimCoordinateSystem" checked />
                    verbatimCoordinateSystem
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
            <div class="checkbox" data-name="countryCode" data-type="Location" data-description="國家標準代碼" data-commonname="國家代碼" data-example="TW">
                <label>
                    <input type="checkbox" name="countryCode" checked />
                    countryCode
                </label>
            </div>
        </fieldset>
        `;
    } else if (selectedCore === "samplingevent") {
        fieldsetContent += `
        <fieldset class="required-fieldset" id="samplingevent">
            <legend>必填欄位</legend>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼" data-commonname="ID、編號" data-example="32567">
                <label>
                    <input type="checkbox" name="eventID" checked />
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="eventDate" data-type="Event" data-description="該筆資料被記錄的日期" data-commonname="調查日期、Date、時間" data-example="「1994-11-05」代表單日，「1996-06」代表 1996 年 6 月">
                <label>
                    <input type="checkbox" name="eventDate" checked />
                    eventDate
                </label>
            </div>
            <div class="checkbox" data-name="samplingProtocol" data-type="Event" data-description="調查方法或流程的名稱、描述，或其參考文獻" data-commonname="材料方法、Method、Sampling method" data-example="UV light trap,<br>mist net,<br>bottom trawl,<br>ad hoc observation,<br>https://doi.org/10.1111/j.1466-8238.2009.00467.x,<br>Takats et al. 2001. Guidelines for Nocturnal Owl Monitoring in North America.">
                <label>
                    <input type="checkbox" name="samplingProtocol" checked />
                    samplingProtocol
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeValue" data-type="Event" data-description="採樣調查中單次採樣的大小數值(時間間隔、長度、範圍，或體積)" data-commonname="採樣量、取樣大小" data-example="5 (sampleSizeValue) with metre (sampleSizeUnit)">
                <label>
                    <input type="checkbox" name="sampleSizeValue" checked />
                    sampleSizeValue
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeUnit" data-type="Event" data-description="採樣大小的量測單位" data-commonname="採樣量單位" data-example="minute,<br>day,<br>metre,<br>square metre">
                <label>
                    <input type="checkbox" name="sampleSizeUnit" checked />
                    sampleSizeUnit
                </label>
            </div>
            <div class="checkbox" data-name="samplingEffort" data-type="Event" data-description="一次調查的努力量" data-commonname="調查努力量" data-example="40 trap-nights,<br>10 observer-hours,<br>10 km by foot">
                <label>
                    <input type="checkbox" name="samplingEffort" checked />
                    samplingEffort
                </label>
            </div>
        </fieldset>
        `;
    } else if (selectedCore === "checklist") {
        fieldsetContent += `
        <fieldset class="required-fieldset" id="checklist">
            <legend>必填欄位</legend>
                <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼" data-commonname="ID、編號" data-example="32567">
                    <label>
                        <input type="checkbox" name="taxonID" checked />
                        taxonID
                    </label>
                </div>
                <div class="checkbox" data-name="scientificName" data-type="Taxon" data-description="完整的學名，包括已知的作者和日期資訊。若是作為鑑定的一部分，應是可確定的最低分類階層的名稱" data-commonname="學名、Name、名字" data-example="Coleoptera (目),<br>Vespertilionidae (科),<br>Manis (屬),<br>Ctenomys sociabilis (屬 + 種小名),<br>Ambystoma tigrinum diaboli (屬 +種小名 + 亞種小名),<br>Roptrocerus typographi (Györfi, 1952) (屬 + 種小名 + 學名命名者),<br>Quercus agrifolia var. oxyadenia (Torr.) J.T.">
                    <label>
                        <input type="checkbox" name="scientificName" checked />
                        scientificName
                    </label>
                </div>
                <div class="checkbox" data-name="taxonRank" data-type="Taxon" data-description="物種的分類階層" data-commonname="分類階層" data-example="genus,<br>species,<br>subspecies,<br>family">
                    <label>
                        <input type="checkbox" name="taxonRank" checked />
                        taxonRank
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
            <div class="checkbox" data-name="recordedBy" data-type="Occurrence" data-description="A list (concatenated and separated) of names of people, groups, or organizations responsible for recording the original Occurrence. The primary collector or observer, especially one who applies a personal identifier (recordNumber), should be listed first." data-commonname="記錄者" data-example="José E. Crespo. Oliver P. Pearson | Anita K. Pearson (where the value in recordNumber OPP 7101 corresponds to the collector number for the specimen in the field catalog of Oliver P. Pearson)">
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
        var checkboxNames = selectedCustom.split(',');
        // console.log(checkboxNames)
        
        var customTemplateName = $("#custom option:selected").text();
        var customFieldset = `<fieldset id="custom"><legend>自訂欄位：${customTemplateName}</legend>`;

        for (var i = 0; i < checkboxNames.length; i++) {
            var checkboxName = checkboxNames[i];
            
            var customFieldsetContent = `
                <div class="checkbox">
                    <label>
                        <input type="checkbox" name="${checkboxName}" checked/>
                        ${checkboxName}
                    </label>
                </div>
            `;
        
            customFieldset += customFieldsetContent ;
        }
        customFieldset += '</fieldset>';
        $("#customFieldset").html(customFieldset);
        // fieldsetContent += customFieldset
    } else {
        $("#customFieldset").html('');
    }

    $("#requiredFieldset").html(fieldsetContent);

    // 鎖定必填欄位的選項
    $('.required-fieldset input[type="checkbox"]').prop('disabled', true);

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
            <div class="checkbox" data-name="basisOfRecord" data-type="Record-level" data-description="資料紀錄的特定性質、類型，建議使用 Darwin Core 的控制詞彙" data-commonname="紀錄類型" data-example="實體物質 MaterialEntity,<br>保存標本 PreservedSpecimen,<br>化石標本 FossilSpecimen,<br>活體標本 LivingSpecimen,<br>人類觀察 HumanObservation,<br>材料樣本 MaterialSample,<br>機器觀測 MachineObservation,<br>調查活動 Event,<br>名錄 Taxon,<br>出現紀錄 Occurrence,<br>材料引用 MaterialCitation">
                <label>
                    <input type="checkbox" name="basisOfRecord"/>
                    basisOfRecord
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼" data-commonname="出現紀錄ID" data-example="32567">
                <label>
                    <input type="checkbox" name="occurrenceID"/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="eventID" data-type="Event" data-description="調查活動識別碼" data-commonname="ID、編號" data-example="32567">
                <label>
                    <input type="checkbox" name="eventID"/>
                    eventID
                </label>
            </div>
            <div class="checkbox" data-name="parentEventID" data-type="Event" data-description="An identifier for the broader Event that groups this and potentially other Events." data-commonname="上階層調查活動ID" data-example="">
                <label>
                    <input type="checkbox" name="parentEventID" />
                    parentEventID
                </label>
            </div>
            <div class="checkbox" data-name="fieldNumber" data-type="Event" data-description="An identifier given to the dwc:Event in the field. Often serves as a link between field notes and the dwc:Event." data-commonname="調查區域、區域編號" data-example="A-國家生技研究園區（開發區）,<br>B-生態研究區,<br>C-其餘位於202兵工廠之範圍">
                <label>
                    <input type="checkbox" name="fieldNumber" />
                    fieldNumber
                </label>
            </div>
            <div class="checkbox" data-name="eventDate" data-type="Event" data-description="該筆資料被記錄的日期" data-commonname="調查日期、Date、時間" data-example="「1994-11-05」代表單日，「1996-06」代表 1996 年 6 月">
                <label>
                    <input type="checkbox" name="eventDate"/>
                    eventDate
                </label>
            </div>
            <div class="checkbox" data-name="eventTime" data-type="Event" data-description="該筆資料被記錄的時間" data-commonname="調查時間" data-example="">
                <label>
                    <input type="checkbox" name="eventTime"/>
                    eventTime
                </label>
            </div>
            <div class="checkbox" data-name="startDayOfYear" data-type="Event" data-description="The earliest integer day of the year on which the Event occurred." data-commonname="" data-example="1 (1 January),<br>366 (31 December),<br>365 (30 December in a leap year, 31 December in a non-leap year)">
                <label>
                    <input type="checkbox" name="startDayOfYear"/>
                    startDayOfYear
                </label>
            </div>
            <div class="checkbox" data-name="endDayOfYear" data-type="Event" data-description="The latest integer day of the year on which the Event occurred." data-commonname="" data-example="1 (1 January),<br>366 (31 December),<br>365 (30 December in a leap year, 31 December in a non-leap year)">
                <label>
                    <input type="checkbox" name="endDayOfYear"/>
                    endDayOfYear
                </label>
            </div>
            <div class="checkbox" data-name="year" data-type="Event" data-description="The four-digit year in which the Event occurred, according to the Common Era Calendar." data-commonname="年" data-example="1996,<br>2023">
                <label>
                    <input type="checkbox" name="year"/>
                    year
                </label>
            </div>
            <div class="checkbox" data-name="month" data-type="Event" data-description="The integer month in which the Event occurred." data-commonname="月" data-example="11,<br>01">
                <label>
                    <input type="checkbox" name="month"/>
                    month
                </label>
            </div>
            <div class="checkbox" data-name="day" data-type="Event" data-description="The integer day of the month on which the Event occurred." data-commonname="日" data-example="26,<br>01">
                <label>
                    <input type="checkbox" name="day"/>
                    day
                </label>
            </div>
            <div class="checkbox" data-name="verbatimEventDate" data-type="Event" data-description="The verbatim original representation of the date and time information for an Event." data-commonname="字面上調查日期" data-example="spring 1910,<br>Marzo 2002,<br>1999-03-XX,<br>17IV1934">
                <label>
                    <input type="checkbox" name="verbatimEventDate"/>
                    verbatimEventDate
                </label>
            </div>
            <div class="checkbox" data-name="habitat" data-type="Event" data-description="A category or description of the habitat in which the dwc:Event occurred." data-commonname="棲地" data-example="樹,<br>灌叢,<br>道路">
                <label>
                    <input type="checkbox" name="habitat"/>
                    habitat
                </label>
            </div>
            <div class="checkbox" data-name="samplingProtocol" data-type="Event" data-description="調查方法或流程的名稱、描述，或其參考文獻" data-commonname="材料方法、Method、Sampling method" data-example="UV light trap,<br>mist net,<br>bottom trawl,<br>ad hoc observation,<br>https://doi.org/10.1111/j.1466-8238.2009.00467.x,<br>Takats et al. 2001. Guidelines for Nocturnal Owl Monitoring in North America.">
                <label>
                    <input type="checkbox" name="samplingProtocol"/>
                    samplingProtocol
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeValue" data-type="Event" data-description="採樣調查中單次採樣的大小數值(時間間隔、長度、範圍，或體積)" data-commonname="採樣量、取樣大小" data-example="5 (sampleSizeValue) with metre (sampleSizeUnit)">
                <label>
                    <input type="checkbox" name="sampleSizeValue"/>
                    sampleSizeValue
                </label>
            </div>
            <div class="checkbox" data-name="sampleSizeUnit" data-type="Event" data-description="採樣大小的量測單位" data-commonname="採樣量單位" data-example="minute,<br>day,<br>metre,<br>square metre">
                <label>
                    <input type="checkbox" name="sampleSizeUnit"/>
                    sampleSizeUnit
                </label>
            </div>
            <div class="checkbox" data-name="samplingEffort" data-type="Event" data-description="一次調查的努力量" data-commonname="調查努力量" data-example="40 trap-nights,<br>10 observer-hours,<br>10 km by foot">
                <label>
                    <input type="checkbox" name="samplingEffort"/>
                    samplingEffort
                </label>
            </div>
            <div class="checkbox" data-name="fieldNotes" data-type="Event" data-description="One of a) an indicator of the existence of, b) a reference to (publication, URI), or c) the text of notes taken in the field about the Event." data-commonname="野外調查註記" data-example="Notes available in the Grinnell-Miller Library.">
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
            <div class="checkbox" data-name="geologicalContextID" data-type="GeologicalContext" data-description="An identifier for the set of information associated with a GeologicalContext (the location within a geological context, such as stratigraphy). May be a global unique identifier or an identifier specific to the data set." data-commonname="" data-example="https://opencontext.org/subjects/e54377f7-4452-4315-b676-40679b10c4d9">
                <label>
                    <input type="checkbox" name="geologicalContextID"/>
                    geologicalContextID
                </label>
            </div>
            <div class="checkbox" data-name="earliestEonOrLowestEonothem" data-type="GeologicalContext" data-description="The full name of the earliest possible geochronologic eon or lowest chrono-stratigraphic eonothem or the informal name ("Precambrian") attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Phanerozoic,<br>Proterozoic">
                <label>
                    <input type="checkbox" name="earliestEonOrLowestEonothem"/>
                    earliestEonOrLowestEonothem
                </label>
            </div>
            <div class="checkbox" data-name="latestEonOrHighestEonothem" data-type="GeologicalContext" data-description="The full name of the latest possible geochronologic eon or highest chrono-stratigraphic eonothem or the informal name ("Precambrian") attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Phanerozoic,<br>Proterozoic">
                <label>
                    <input type="checkbox" name="latestEonOrHighestEonothem"/>
                    latestEonOrHighestEonothem
                </label>
            </div>
            <div class="checkbox" data-name="earliestEraOrLowestErathem" data-type="GeologicalContext" data-description="The full name of the earliest possible geochronologic era or lowest chronostratigraphic erathem attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Cenozoic,<br>Mesozoic">
                <label>
                    <input type="checkbox" name="earliestEraOrLowestErathem"/>
                    earliestEraOrLowestErathem
                </label>
            </div>
            <div class="checkbox" data-name="latestEraOrHighestErathem" data-type="GeologicalContext" data-description="The full name of the latest possible geochronologic era or highest chronostratigraphic erathem attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Cenozoic,<br>Mesozoic">
                <label>
                    <input type="checkbox" name="latestEraOrHighestErathem"/>
                    latestEraOrHighestErathem
                </label>
            </div>
            <div class="checkbox" data-name="earliestPeriodOrLowestSystem" data-type="GeologicalContext" data-description="The full name of the earliest possible geochronologic period or lowest chronostratigraphic system attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Neogene,<br>Tertiary,<br>Quaternary">
                <label>
                    <input type="checkbox" name="earliestPeriodOrLowestSystem"/>
                    earliestPeriodOrLowestSystem
                </label>
            </div>
            <div class="checkbox" data-name="latestPeriodOrHighestSystem" data-type="GeologicalContext" data-description="The full name of the latest possible geochronologic period or highest chronostratigraphic system attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Neogene,<br>Tertiary,<br>Quaternary">
                <label>
                    <input type="checkbox" name="latestPeriodOrHighestSystem"/>
                    latestPeriodOrHighestSystem
                </label>
            </div>
            <div class="checkbox" data-name="earliestEpochOrLowestSeries" data-type="GeologicalContext" data-description="The full name of the earliest possible geochronologic epoch or lowest chronostratigraphic series attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Holocene,<br>Pleistocene,<br>Ibexian Series">
                <label>
                    <input type="checkbox" name="earliestEpochOrLowestSeries"/>
                    earliestEpochOrLowestSeries
                </label>
            </div>
            <div class="checkbox" data-name="latestEpochOrHighestSeries" data-type="GeologicalContext" data-description="The full name of the latest possible geochronologic epoch or highest chronostratigraphic series attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Holocene,<br>Pleistocene,<br>Ibexian Series">
                <label>
                    <input type="checkbox" name="latestEpochOrHighestSeries"/>
                    latestEpochOrHighestSeries
                </label>
            </div>
            <div class="checkbox" data-name="earliestAgeOrLowestStage" data-type="GeologicalContext" data-description="The full name of the earliest possible geochronologic age or lowest chronostratigraphic stage attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Atlantic,<br>Boreal,<br>Skullrockian">
                <label>
                    <input type="checkbox" name="earliestAgeOrLowestStage"/>
                    earliestAgeOrLowestStage
                </label>
            </div>
            <div class="checkbox" data-name="latestAgeOrHighestStage" data-type="GeologicalContext" data-description="The full name of the latest possible geochronologic age or highest chronostratigraphic stage attributable to the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Atlantic,<br>Boreal,<br>Skullrockian">
                <label>
                    <input type="checkbox" name="latestAgeOrHighestStage"/>
                    latestAgeOrHighestStage
                </label>
            </div>
            <div class="checkbox" data-name="lowestBiostratigraphicZone" data-type="GeologicalContext" data-description="The full name of the lowest possible geological biostratigraphic zone of the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Maastrichtian">
                <label>
                    <input type="checkbox" name="lowestBiostratigraphicZone"/>
                    lowestBiostratigraphicZone
                </label>
            </div>
            <div class="checkbox" data-name="highestBiostratigraphicZone" data-type="GeologicalContext" data-description="The full name of the highest possible geological biostratigraphic zone of the stratigraphic horizon from which the cataloged item was collected." data-commonname="" data-example="Blancan">
                <label>
                    <input type="checkbox" name="highestBiostratigraphicZone"/>
                    highestBiostratigraphicZone
                </label>
            </div>
            <div class="checkbox" data-name="lithostratigraphicTerms" data-type="GeologicalContext" data-description="The combination of all litho-stratigraphic names for the rock from which the cataloged item was collected." data-commonname="" data-example="Pleistocene-Weichselien">
                <label>
                    <input type="checkbox" name="lithostratigraphicTerms"/>
                    lithostratigraphicTerms
                </label>
            </div>
            <div class="checkbox" data-name="group" data-type="GeologicalContext" data-description="The full name of the lithostratigraphic group from which the cataloged item was collected." data-commonname="" data-example="Bathurst,<br>Lower Wealden">
                <label>
                    <input type="checkbox" name="group"/>
                    group
                </label>
            </div>
            <div class="checkbox" data-name="formation" data-type="GeologicalContext" data-description="The full name of the lithostratigraphic formation from which the cataloged item was collected." data-commonname="" data-example="Notch Peak Formation,<br>House Limestone,<br>Fillmore Formation">
                <label>
                    <input type="checkbox" name="formation"/>
                    formation
                </label>
            </div>
            <div class="checkbox" data-name="member" data-type="GeologicalContext" data-description="The full name of the lithostratigraphic member from which the cataloged item was collected." data-commonname="" data-example="Lava Dam Member,<br>Hellnmaria Member">
                <label>
                    <input type="checkbox" name="member"/>
                    member
                </label>
            </div>
            <div class="checkbox" data-name="bed" data-type="GeologicalContext" data-description="The full name of the lithostratigraphic bed from which the cataloged item was collected." data-commonname="" data-example="Harlem coal">
                <label>
                    <input type="checkbox" name="bed"/>
                    bed
                </label>
            </div>
            <div class="checkbox" data-name="identificationID" data-type="Identification" data-description="An identifier for the Identification (the body of information associated with the assignment of a scientific name). May be a global unique identifier or an identifier specific to the data set." data-commonname="學名鑑定ID" data-example="Harlem coal">
                <label>
                    <input type="checkbox" name="identificationID"/>
                    identificationID
                </label>
            </div>
            <div class="checkbox" data-name="verbatimIdentification" data-type="Identification" data-description="A string representing the taxonomic identification as it appeared in the original record." data-commonname="字面上學名鑑定" data-example="Peromyscus sp.,<br>Ministrymon sp. nov. 1,<br>Anser anser X Branta canadensis,<br>Pachyporidae?">
                <label>
                    <input type="checkbox" name="verbatimIdentification"/>
                    verbatimIdentification
                </label>
            </div>
            <div class="checkbox" data-name="identificationQualifier" data-type="Identification" data-description="A brief phrase or a standard term ("cf.", "aff.") to express the determiner's doubts about the Identification." data-commonname="學名鑑定標註" data-example="aff. agrifolia var. oxyadenia<br>(for Quercus aff. agrifolia var. oxyadenia with accompanying values Quercus in genus, agrifolia in specificEpithet, oxyadenia in infraspecificEpithet, and var. in taxonRank)<br>cf. var. oxyadenia<br>(for Quercus agrifolia cf. var. oxyadenia with accompanying values Quercus in genus, agrifolia in specificEpithet, oxyadenia in infraspecificEpithet, and var. in taxonRank)">
                <label>
                    <input type="checkbox" name="identificationQualifier"/>
                    identificationQualifier
                </label>
            </div>
            <div class="checkbox" data-name="typeStatus" data-type="Identification" data-description="A list (concatenated and separated) of nomenclatural types (type status, typified scientific name, publication) applied to the subject." data-commonname="學名標本模式" data-example="holotype of Ctenomys sociabilis. Pearson O. P., and M. I. Christie. 1985. Historia Natural, 5(37):388,<br>holotype of Pinus abies | holotype of Picea abies">
                <label>
                    <input type="checkbox" name="typeStatus"/>
                    typeStatus
                </label>
            </div>
            <div class="checkbox" data-name="identifiedBy" data-type="Identification" data-description="A list (concatenated and separated) of names of people, groups, or organizations who assigned the Taxon to the subject." data-commonname="學名鑑定人" data-example="James L. Patton, Theodore Pappenfuss | Robert Macey">
                <label>
                    <input type="checkbox" name="identifiedBy"/>
                    identifiedBy
                </label>
            </div>
            <div class="checkbox" data-name="identifiedByID" data-type="Identification" data-description="A list (concatenated and separated) of the globally unique identifier for the person, people, groups, or organizations responsible for assigning the Taxon to the subject." data-commonname="學名鑑定人ID" data-example="https://orcid.org/0000-0002-1825-0097 (for an individual),<br>https://orcid.org/0000-0002-1825-0097 | https://orcid.org/0000-0002-1825-0098 (for a list of people).">
                <label>
                    <input type="checkbox" name="identifiedByID"/>
                    identifiedByID
                </label>
            </div>
            <div class="checkbox" data-name="dateIdentified" data-type="Identification" data-description="The date on which the subject was determined as representing the Taxon." data-commonname="學名鑑定日期" data-example="1963-03-08T14:07-0600 (8 Mar 1963 at 2:07pm in the time zone six hours earlier than UTC),<br>2009-02-20T08:40Z (20 February 2009 8:40am UTC),<br>2018-08-29T15:19 (3:19pm local time on 29 August 2018),<br>1809-02-12 (some time during 12 February 1809),<br>1906-06 (some time in June 1906),<br>1971 (some time in the year 1971),<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z (some time during the interval between 1 March 2007 1pm UTC and 11 May 2008 3:30pm UTC),<br>1900/1909 (some time during the interval between the beginning of the year 1900 and the end of the year 1909),<br>2007-11-13/15 (some time in the interval between 13 November 2007 and 15 November 2007)">
                <label>
                    <input type="checkbox" name="dateIdentified"/>
                    dateIdentified
                </label>
            </div>
            <div class="checkbox" data-name="identificationReferences" data-type="Identification" data-description="A list (concatenated and separated) of references (publication, global unique identifier, URI) used in the Identification." data-commonname="學名鑑定參考" data-example="Aves del Noroeste Patagonico. Christie et al. 2004.,<br>Stebbins, R. Field Guide to Western Reptiles and Amphibians. 3rd Edition. 2003. | Irschick, D.J. and Shaffer, H.B. (1997). The polytypic species revisited: Morphological differentiation among tiger salamanders (Ambystoma tigrinum) (Amphibia: Caudata). Herpetologica, 53(1), 30-49">
                <label>
                    <input type="checkbox" name="identificationReferences"/>
                    identificationReferences
                </label>
            </div>
            <div class="checkbox" data-name="identificationVerificationStatus" data-type="Identification" data-description="A categorical indicator of the extent to which the taxonomic identification has been verified to be correct." data-commonname="學名鑑定驗證狀態" data-example="0 ('unverified' in HISPID/ABCD)">
                <label>
                    <input type="checkbox" name="identificationVerificationStatus"/>
                    identificationVerificationStatus
                </label>
            </div>
            <div class="checkbox" data-name="identificationRemarks" data-type="Identification" data-description="Comments or notes about the Identification." data-commonname="學名鑑定備註" data-example="Distinguished between Anthus correndera and Anthus hellmayri based on the comparative lengths of the uñas">
                <label>
                    <input type="checkbox" name="identificationRemarks"/>
                    identificationRemarks
                </label>
            </div>
            <div class="checkbox" data-name="locationID" data-type="Location" data-description="An identifier for the set of location information (data associated with dcterms:Location). May be a global unique identifier or an identifier specific to the data set." data-commonname="地點ID" data-example="https://opencontext.org/subjects/768A875F-E205-4D0B-DE55-BAB7598D0FD1">
                <label>
                    <input type="checkbox" name="locationID"/>
                    locationID
                </label>
            </div>
            <div class="checkbox" data-name="higherGeographyID" data-type="Location" data-description="An identifier for the geographic region within which the Location occurred." data-commonname="概略地理描述ID" data-example="http://vocab.getty.edu/tgn/1002002 (Antártida e Islas del Atlántico Sur, Territorio Nacional de la Tierra del Fuego, Argentina)">
                <label>
                    <input type="checkbox" name="higherGeographyID"/>
                    higherGeographyID
                </label>
            </div>
            <div class="checkbox" data-name="higherGeography" data-type="Location" data-description="An identifier for the geographic region within which the Location occurred." data-commonname="概略地理描述" data-example="North Atlantic Ocean. South America | Argentina | Patagonia | Parque Nacional Nahuel Huapi | Neuquén | Los Lagos (with accompanying values South America in continent, Argentina in country, Neuquén in stateProvince, and Los Lagos in county)">
                <label>
                    <input type="checkbox" name="higherGeography"/>
                    higherGeography
                </label>
            </div>
            <div class="checkbox" data-name="continent" data-type="Location" data-description="The name of the continent in which the Location occurs." data-commonname="洲" data-example="Africa,<br>Antarctica,<br>Asia, Europe,<br>North America,<br>Oceania,<br>South America">
                <label>
                    <input type="checkbox" name="continent"/>
                    continent
                </label>
            </div>
            <div class="checkbox" data-name="waterBody" data-type="Location" data-description="The name of the water body in which the Location occurs." data-commonname="水體" data-example="Indian Ocean,<br>Baltic Sea,<br>Hudson River,<br>Lago Nahuel Huapi">
                <label>
                    <input type="checkbox" name="waterBody"/>
                    waterBody
                </label>
            </div>
            <div class="checkbox" data-name="islandGroup" data-type="Location" data-description="The name of the island group in which the Location occurs." data-commonname="群島" data-example="Alexander Archipelago,<br>Archipiélago Diego Ramírez,<br>Seychelles">
                <label>
                    <input type="checkbox" name="islandGroup"/>
                    islandGroup
                </label>
            </div>
            <div class="checkbox" data-name="island" data-type="Location" data-description="The name of the island on or near which the Location occurs." data-commonname="島嶼" data-example="Nosy Be,<br>Bikini Atoll,<br>Vancouver,<br>Viti Levu,<br>Zanzibar">
                <label>
                    <input type="checkbox" name="island"/>
                    island
                </label>
            </div>
            <div class="checkbox" data-name="country" data-type="Location" data-description="The name of the country or major administrative unit in which the Location occurs." data-commonname="國家" data-example="Taiwan">
                <label>
                    <input type="checkbox" name="country"/>
                    country
                </label>
            </div>
            <div class="checkbox" data-name="countryCode" data-type="Location" data-description="國家標準代碼" data-commonname="國家代碼" data-example="TW">
                <label>
                    <input type="checkbox" name="countryCode"/>
                    countryCode
                </label>
            </div>
            <div class="checkbox" data-name="stateProvince" data-type="Location" data-description="The name of the next smaller administrative region than country (state, province, canton, department, region, etc.) in which the Location occurs." data-commonname="省份/州" data-example="Montana,<br>Minas Gerais,<br>Córdoba">
                <label>
                    <input type="checkbox" name="stateProvince"/>
                    stateProvince
                </label>
            </div>
            <div class="checkbox" data-name="county" data-type="Location" data-description="The name of the next smaller administrative region than country (state, province, canton, department, region, etc.) in which the Location occurs." data-commonname="縣市" data-example="Nantou County">
                <label>
                    <input type="checkbox" name="county"/>
                    county
                </label>
            </div>
            <div class="checkbox" data-name="municipality" data-type="Location" data-description="The full, unabbreviated name of the next smaller administrative region than county (city, municipality, etc.) in which the Location occurs. Do not use this term for a nearby named place that does not contain the actual location." data-commonname="行政區" data-example="Yuchi Township">
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
            <div class="checkbox" data-name="verbatimLocality" data-type="Location" data-description="The original textual description of the place." data-commonname="字面上地區" data-example="25 km NNE Bariloche por R. Nac. 237">
                <label>
                    <input type="checkbox" name="verbatimLocality"/>
                    verbatimLocality
                </label>
            </div>
            <div class="checkbox" data-name="minimumElevationInMeters" data-type="Location" data-description="The lower limit of the range of elevation (altitude, usually above sea level), in meters." data-commonname="最低海拔（公尺）" data-example="-100,<br>3952">
                <label>
                    <input type="checkbox" name="minimumElevationInMeters"/>
                    minimumElevationInMeters
                </label>
            </div>
            <div class="checkbox" data-name="maximumElevationInMeters" data-type="Location" data-description="The upper limit of the range of elevation (altitude, usually above sea level), in meters." data-commonname="最高海拔（公尺）" data-example="-205,<br>1236">
                <label>
                    <input type="checkbox" name="maximumElevationInMeters"/>
                    maximumElevationInMeters
                </label>
            </div>
            <div class="checkbox" data-name="verbatimElevation" data-type="Location" data-description="The original description of the elevation (altitude, usually above sea level) of the Location." data-commonname="字面上海拔" data-example="100-200 m">
                <label>
                    <input type="checkbox" name="verbatimElevation"/>
                    verbatimElevation
                </label>
            </div>
            <div class="checkbox" data-name="verticalDatum" data-type="Location" data-description="The vertical datum used as the reference upon which the values in the elevation terms are based." data-commonname="垂直基準" data-example="EGM84,<br>EGM96,<br>EGM2008,<br>PGM2000A,<br>PGM2004,<br>PGM2006,<br>PGM2007,<br>epsg:7030,<br>unknown">
                <label>
                    <input type="checkbox" name="verticalDatum"/>
                    verticalDatum
                </label>
            </div>
            <div class="checkbox" data-name="minimumDepthInMeters" data-type="Location" data-description="The lesser depth of a range of depth below the local surface, in meters." data-commonname="最小深度（公尺）" data-example="0,<br>100">
                <label>
                    <input type="checkbox" name="minimumDepthInMeters"/>
                    minimumDepthInMeters
                </label>
            </div>
            <div class="checkbox" data-name="maximumDepthInMeters" data-type="Location" data-description="The greater depth of a range of depth below the local surface, in meters." data-commonname="最大深度（公尺）" data-example="0,<br>200">
                <label>
                    <input type="checkbox" name="maximumDepthInMeters"/>
                    maximumDepthInMeters
                </label>
            </div>
            <div class="checkbox" data-name="verbatimDepth" data-type="Location" data-description="The original description of the depth below the local surface." data-commonname="字面上深度" data-example="100-200 m">
                <label>
                    <input type="checkbox" name="verbatimDepth"/>
                    verbatimDepth
                </label>
            </div>
            <div class="checkbox" data-name="minimumDistanceAboveSurfaceInMeters" data-type="Location" data-description="The lesser distance in a range of distance from a reference surface in the vertical direction, in meters. Use positive values for locations above the surface, negative values for locations below. If depth measures are given, the reference surface is the location given by the depth, otherwise the reference surface is the location given by the elevation." data-commonname="最小表面垂直距離" data-example="-1.5 (below the surface). 4.2 (above the surface). For a 1.5 meter sediment core from the bottom of a lake (at depth 20m) at 300m elevation: verbatimElevation: 300m minimumElevationInMeters: 300, maximumElevationInMeters: 300, verbatimDepth: 20m, minimumDepthInMeters: 20, maximumDepthInMeters: 20, minimumDistanceAboveSurfaceInMeters: 0, maximumDistanceAboveSurfaceInMeters: -1.5">
                <label>
                    <input type="checkbox" name="minimumDistanceAboveSurfaceInMeters"/>
                    minimumDistanceAboveSurfaceInMeters
                </label>
            </div>
            <div class="checkbox" data-name="maximumDistanceAboveSurfaceInMeters" data-type="Location" data-description="The greater distance in a range of distance from a reference surface in the vertical direction, in meters. Use positive values for locations above the surface, negative values for locations below. If depth measures are given, the reference surface is the location given by the depth, otherwise the reference surface is the location given by the elevation." data-commonname="最大表面垂直距離" data-example="-1.5 (below the surface). 4.2 (above the surface). For a 1.5 meter sediment core from the bottom of a lake (at depth 20m) at 300m elevation: verbatimElevation: 300m minimumElevationInMeters: 300, maximumElevationInMeters: 300, verbatimDepth: 20m, minimumDepthInMeters: 20, maximumDepthInMeters: 20, minimumDistanceAboveSurfaceInMeters: 0, maximumDistanceAboveSurfaceInMeters: -1.5">
                <label>
                    <input type="checkbox" name="maximumDistanceAboveSurfaceInMeters"/>
                    maximumDistanceAboveSurfaceInMeters
                </label>
            </div>
            <div class="checkbox" data-name="locationAccordingTo" data-type="Location" data-description="Information about the source of this Location information. Could be a publication (gazetteer), institution, or team of individuals." data-commonname="位置依據" data-example="Getty Thesaurus of Geographic Names, GADM">
                <label>
                    <input type="checkbox" name="locationAccordingTo"/>
                    locationAccordingTo
                </label>
            </div>
            <div class="checkbox" data-name="locationRemarks" data-type="Location" data-description="Comments or notes about the Location." data-commonname="地區註記" data-example="under water since 2005">
                <label>
                    <input type="checkbox" name="locationRemarks"/>
                    locationRemarks
                </label>
            </div>
            <div class="checkbox" data-name="decimalLatitude" data-type="Location" data-description="十進位緯度" data-commonname="十進位緯度" data-example="-41.0983423">
                <label>
                    <input type="checkbox" name="decimalLatitude"/>
                    decimalLatitude
                </label>
            </div>
            <div class="checkbox" data-name="decimalLongitude" data-type="Location" data-description="十進位經度" data-commonname="十進位經度" data-example="-121.1761111">
                <label>
                    <input type="checkbox" name="decimalLongitude"/>
                    decimalLongitude
                </label>
            </div>
            <div class="checkbox" data-name="geodeticDatum" data-type="Location" data-description="座標的大地基準。建議使用控制詞彙；若全未知，則填入「未知 (unknown)」" data-commonname="大地基準、大地系統" data-example="EPSG:4326,<br>WGS84,<br>EPSG:3826 (TWD97 / TM2 臺灣),<br>EPSG:3828（TWD67 / TM2 臺灣）">
                <label>
                    <input type="checkbox" name="geodeticDatum"/>
                    geodeticDatum
                </label>
            </div>
            <div class="checkbox" data-name="coordinateUncertaintyInMeters" data-type="Location" data-description="The horizontal distance (in meters) from the given decimalLatitude and decimalLongitude describing the smallest circle containing the whole of the Location. Leave the value empty if the uncertainty is unknown, cannot be estimated, or is not applicable (because there are no coordinates). Zero is not a valid value for this term." data-commonname="座標誤差（公尺）" data-example="30 (reasonable lower limit on or after 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time),<br>100 (reasonable lower limit before 2020-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time),<br>71 (uncertainty for a UTM coordinate having 100 meter precision and a known spatial reference system)">
                <label>
                    <input type="checkbox" name="coordinateUncertaintyInMeters"/>
                    coordinateUncertaintyInMeters
                </label>
            </div>
            <div class="checkbox" data-name="coordinatePrecision" data-type="Location" data-description="A decimal representation of the precision of the coordinates given in the decimalLatitude and decimalLongitude." data-commonname="座標精準度" data-example="0.00001 (normal GPS limit for decimal degrees),<br>0.000278 (nearest second),<br>0.01667 (nearest minute),<br>1.0 (nearest degree)">
                <label>
                    <input type="checkbox" name="coordinatePrecision"/>
                    coordinatePrecision
                </label>
            </div>
            <div class="checkbox" data-name="pointRadiusSpatialFit" data-type="Location" data-description="The ratio of the area of the point-radius (decimalLatitude, decimalLongitude, coordinateUncertaintyInMeters) to the area of the true (original, or most specific) spatial representation of the Location. Legal values are 0, greater than or equal to 1, or undefined. A value of 1 is an exact match or 100% overlap. A value of 0 should be used if the given point-radius does not completely contain the original representation. The pointRadiusSpatialFit is undefined (and should be left empty) if the original representation is a point without uncertainty and the given georeference is not that same point (without uncertainty). If both the original and the given georeference are the same point, the pointRadiusSpatialFit is 1. " data-commonname="" data-example="0,<br>1,<br>1.5708">
                <label>
                    <input type="checkbox" name="pointRadiusSpatialFit"/>
                    pointRadiusSpatialFit
                </label>
            </div>
            <div class="checkbox" data-name="verbatimCoordinates" data-type="Location" data-description="The verbatim original spatial coordinates of the Location. The coordinate ellipsoid, geodeticDatum, or full Spatial Reference System (SRS) for these coordinates should be stored in verbatimSRS and the coordinate system should be stored in verbatimCoordinateSystem." data-commonname="字面上座標" data-example="41 05 54S 121 05 34W, 17T 630000 4833400">
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
            <div class="checkbox" data-name="verbatimCoordinateSystem" data-type="Location" data-description="紀錄的座標單位" data-commonname="字面上座標格式" data-example="decimal degrees,<br>degrees decimal minutes,<br>degrees minutes seconds">
                <label>
                    <input type="checkbox" name="verbatimCoordinateSystem"/>
                    verbatimCoordinateSystem
                </label>
            </div>
            <div class="checkbox" data-name="verbatimSRS" data-type="Location" data-description="The ellipsoid, geodetic datum, or spatial reference system (SRS) upon which coordinates given in verbatimLatitude and verbatimLongitude, or verbatimCoordinates are based." data-commonname="字面上空間參照系統" data-example="unknown,<br>EPSG:4326,<br>WGS84,<br>NAD27,<br>Campo Inchauspe,<br>European 1950,<br>Clarke 1866">
                <label>
                    <input type="checkbox" name="verbatimSRS"/>
                    verbatimSRS
                </label>
            </div>
            <div class="checkbox" data-name="footprintWKT" data-type="Location" data-description="A Well-Known Text (WKT) representation of the shape (footprint, geometry) that defines the Location. A Location may have both a point-radius representation (see decimalLatitude) and a footprint representation, and they may differ from each other." data-commonname="地理足跡WKT" data-example="POLYGON ((10 20, 11 20, 11 21, 10 21, 10 20)) (the one-degree bounding box with opposite corners at longitude=10, latitude=20 and longitude=11, latitude=21)">
                <label>
                    <input type="checkbox" name="footprintWKT"/>
                    footprintWKT
                </label>
            </div>
            <div class="checkbox" data-name="footprintSRS" data-type="Location" data-description="The ellipsoid, geodetic datum, or spatial reference system (SRS) upon which the geometry given in footprintWKT is based." data-commonname="地理足跡SRS" data-example="epsg:4326, GEOGCS["GCS_WGS_1984", DATUM["D_WGS_1984", SPHEROID["WGS_1984",6378137,298.257223563]], PRIMEM["Greenwich",0], UNIT["Degree",0.0174532925199433]] (WKT for the standard WGS84 Spatial Reference System EPSG:4326)">
                <label>
                    <input type="checkbox" name="footprintSRS"/>
                    footprintSRS
                </label>
            </div>
            <div class="checkbox" data-name="footprintSpatialFit" data-type="Location" data-description="The ratio of the area of the footprint (footprintWKT) to the area of the true (original, or most specific) spatial representation of the Location. Legal values are 0, greater than or equal to 1, or undefined. A value of 1 is an exact match or 100% overlap. A value of 0 should be used if the given footprint does not completely contain the original representation. The footprintSpatialFit is undefined (and should be left empty) if the original representation is a point without uncertainty and the given georeference is not that same point (without uncertainty). If both the original and the given georeference are the same point, the footprintSpatialFit is 1." data-commonname="地理足跡SpatialFit" data-example="0,<br>1,<br>1.5708">
                <label>
                    <input type="checkbox" name="footprintSpatialFit"/>
                    footprintSpatialFit
                </label>
            </div>
            <div class="checkbox" data-name="georeferencedBy" data-type="Location" data-description="A list (concatenated and separated) of names of people, groups, or organizations who determined the georeference (spatial representation) for the Location." data-commonname="地理點位紀錄者" data-example="Brad Millen (ROM),<br>Kristina Yamamoto | Janet Fang">
                <label>
                    <input type="checkbox" name="georeferencedBy"/>
                    georeferencedBy
                </label>
            </div>
            <div class="checkbox" data-name="georeferencedDate" data-type="Location" data-description="The date on which the Location was georeferenced." data-commonname="地理點位紀錄日期" data-example="1963-03-08T14:07-0600 (8 Mar 1963 at 2:07pm in the time zone six hours earlier than UTC),<br>2009-02-20T08:40Z (20 February 2009 8:40am UTC),<br>2018-08-29T15:19 (3:19pm local time on 29 August 2018),<br>1809-02-12 (some time during 12 February 1809),<br>1906-06 (some time in June 1906),<br>1971 (some time in the year 1971),<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z (some time during the interval between 1 March 2007 1pm UTC and 11 May 2008 3:30pm UTC),<br>1900/1909 (some time during the interval between the beginning of the year 1900 and the end of the year 1909),<br>2007-11-13/15 (some time in the interval between 13 November 2007 and 15 November 2007).">
                <label>
                    <input type="checkbox" name="georeferencedDate"/>
                    georeferencedDate
                </label>
            </div>
            <div class="checkbox" data-name="georeferenceProtocol" data-type="Location" data-description="A description or reference to the methods used to determine the spatial footprint, coordinates, and uncertainties." data-commonname="地理點位紀錄方法" data-example="Georeferencing Quick Reference Guide (Zermoglio et al. 2020, https://doi.org/10.35035/e09p-h128)">
                <label>
                    <input type="checkbox" name="georeferenceProtocol"/>
                    georeferenceProtocol
                </label>
            </div>
            <div class="checkbox" data-name="georeferenceSources" data-type="Location" data-description="A list (concatenated and separated) of maps, gazetteers, or other resources used to georeference the Location, described specifically enough to allow anyone in the future to use the same resources." data-commonname="地理點位紀錄平台" data-example="https://www.geonames.org/, USGS 1:24000 Florence Montana Quad 1967 | Terrametrics 2008 on Google Earth, GeoLocate">
                <label>
                    <input type="checkbox" name="georeferenceSources"/>
                    georeferenceSources
                </label>
            </div>
            <div class="checkbox" data-name="georeferenceRemarks" data-type="Location" data-description="Notes or comments about the spatial description determination, explaining assumptions made in addition or opposition to the those formalized in the method referred to in georeferenceProtocol." data-commonname="地理點位紀錄備註" data-example="Assumed distance by road (Hwy. 101)">
                <label>
                    <input type="checkbox" name="georeferenceRemarks"/>
                    georeferenceRemarks
                </label>
            </div>
            <div class="checkbox" data-name="materialSampleID" data-type="MaterialSample" data-description="An identifier for the MaterialSample (as opposed to a particular digital record of the material sample). In the absence of a persistent global unique identifier, construct one from a combination of identifiers in the record that will most closely make the materialSampleID globally unique." data-commonname="材料樣本ID" data-example="06809dc5-f143-459a-be1a-6f03e63fc083">
                <label>
                    <input type="checkbox" name="materialSampleID"/>
                    materialSampleID
                </label>
            </div>
            <div class="checkbox" data-name="catalogNumber" data-type="Occurrence" data-description="An identifier (preferably unique) for the record within the data set or collection." data-commonname="館藏號" data-example="145732,<br>145732a,<br>2008.1334,<br>R-4313">
                <label>
                    <input type="checkbox" name="catalogNumber"/>
                    catalogNumber
                </label>
            </div>
            <div class="checkbox" data-name="recordNumber" data-type="Occurrence" data-description="An identifier (preferably unique) for the record within the data set or collection." data-commonname="採集號" data-example="OPP 7101">
                <label>
                    <input type="checkbox" name="recordNumber"/>
                    recordNumber
                </label>
            </div>
            <div class="checkbox" data-name="recordedBy" data-type="Occurrence" data-description="A list (concatenated and separated) of names of people, groups, or organizations responsible for recording the original Occurrence. The primary collector or observer, especially one who applies a personal identifier (recordNumber), should be listed first." data-commonname="記錄者" data-example="José E. Crespo. Oliver P. Pearson | Anita K. Pearson (where the value in recordNumber OPP 7101 corresponds to the collector number for the specimen in the field catalog of Oliver P. Pearson)">
                <label>
                    <input type="checkbox" name="recordedBy"/>
                    recordedBy
                </label>
            </div>
            <div class="checkbox" data-name="recordedByID" data-type="Occurrence" data-description="A list (concatenated and separated) of the globally unique identifier for the person, people, groups, or organizations responsible for recording the original Occurrence." data-commonname="記錄者ID" data-example="https://orcid.org/0000-0002-1825-0097 (for an individual),<br>https://orcid.org/0000-0002-1825-0097 | https://orcid.org/0000-0002-1825-0098 (for a list of people)">
                <label>
                    <input type="checkbox" name="recordedByID"/>
                    recordedByID
                </label>
            </div>
            <div class="checkbox" data-name="individualCount" data-type="Occurrence" data-description="出現紀錄被記錄時存在的個體數量" data-commonname="個體數量" data-example="0, 1, 25">
                <label>
                    <input type="checkbox" name="individualCount"/>
                    individualCount
                </label>
            </div>
            <div class="checkbox" data-name="organismQuantity" data-type="Occurrence" data-description="A number or enumeration value for the quantity of organisms." data-commonname="生物體數量" data-example="27 (organismQuantity) with individuals (organismQuantityType),<br>12.5 (organismQuantity) with % biomass (organismQuantityType),<br>r (organismQuantity) with Braun Blanquet Scale (organismQuantityType),<br>many (organismQuantity) with individuals (organismQuantityType).">
                <label>
                    <input type="checkbox" name="organismQuantity"/>
                    organismQuantity
                </label>
            </div>
            <div class="checkbox" data-name="organismQuantityType" data-type="Occurrence" data-description="The type of quantification system used for the quantity of organisms." data-commonname="生物體數量單位" data-example="27 (organismQuantity) with individuals (organismQuantityType),<br>12.5 (organismQuantity) with % biomass (organismQuantityType),<br>r (organismQuantity) with Braun Blanquet Scale (organismQuantityType)">
                <label>
                    <input type="checkbox" name="organismQuantityType"/>
                    organismQuantityType
                </label>
            </div>
            <div class="checkbox" data-name="sex" data-type="Occurrence" data-description="The sex of the biological individual(s) represented in the Occurrence." data-commonname="性別" data-example="雌性 female,<br>雄性 male,<br>雌雄同體 hermaphrodite">
                <label>
                    <input type="checkbox" name="sex"/>
                    sex
                </label>
            </div>
            <div class="checkbox" data-name="lifeStage" data-type="Occurrence" data-description="The age class or life stage of the Organism(s) at the time the Occurrence was recorded." data-commonname="生活史階段" data-example="zygote,<br>larva,<br>juvenile,<br>adult,<br>seedling,<br>flowering,<br>fruiting">
                <label>
                    <input type="checkbox" name="lifeStage"/>
                    lifeStage
                </label>
            </div>
            <div class="checkbox" data-name="reproductiveCondition" data-type="Occurrence" data-description="The reproductive condition of the biological individual(s) represented in the Occurrence." data-commonname="生殖狀態" data-example="non-reproductive,<br>pregnant,<br>in bloom,<br>fruit-bearing">
                <label>
                    <input type="checkbox" name="reproductiveCondition"/>
                    reproductiveCondition
                </label>
            </div>
            <div class="checkbox" data-name="behavior" data-type="Occurrence" data-description="The behavior shown by the subject at the time the Occurrence was recorded." data-commonname="行為" data-example="roosting,<br>foraging,<br>running">
                <label>
                    <input type="checkbox" name="behavior"/>
                    behavior
                </label>
            </div>
            <div class="checkbox" data-name="establishmentMeans" data-type="Occurrence" data-description="Statement about whether an organism or organisms have been introduced to a given place and time through the direct or indirect activity of modern humans." data-commonname="原生或引入定義評估" data-example="原生 native,<br>原生：再引進 nativeReintroduced,<br>引進（外來、非原生、非原住） introduced,<br>引進（協助拓殖） introducedAssistedColonisation,<br>流浪的 vagrant,<br>不確定的（未知、隱源性） uncertain">
                <label>
                    <input type="checkbox" name="establishmentMeans"/>
                    individualCount
                </label>establishmentMeans
            </div>
            <div class="checkbox" data-name="degreeOfEstablishment" data-type="Occurrence" data-description="The degree to which an Organism survives, reproduces, and expands its range at the given place and time." data-commonname="原生或引入階段評估" data-example="原生 native,<br>收容 captive,<br>栽培 cultivated,<br>野放 released,<br>衰退中 failing,<br>偶然出現的 casual,<br>繁殖中 reproducing,<br>歸化 established,<br>拓殖中 colonising,<br>入侵 invasive,<br>廣泛入侵 widespreadInvasive">
                <label>
                    <input type="checkbox" name="degreeOfEstablishment"/>
                    degreeOfEstablishment
                </label>
            </div>
            <div class="checkbox" data-name="pathway" data-type="Occurrence" data-description="The process by which an Organism came to be in a given place at a given time." data-commonname="生物擴散方法" data-example="releasedForUse, otherEscape, transportContaminant, transportStowaway, corridor, unaided">
                <label>
                    <input type="checkbox" name="pathway"/>
                    pathway
                </label>
            </div>
            <div class="checkbox" data-name="georeferenceVerificationStatus" data-type="Occurrence" data-description="A categorical description of the extent to which the georeference has been verified to represent the best possible spatial description for the Location of the Occurrence." data-commonname="地理資訊驗證狀態" data-example="unable to georeference, requires georeference, requires verification, verified by data custodian, verified by contributor">
                <label>
                    <input type="checkbox" name="georeferenceVerificationStatus"/>
                    georeferenceVerificationStatus
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceStatus" data-type="Occurrence" data-description="A statement about the presence or absence of a Taxon at a Location." data-commonname="出現狀態" data-example="出現 present,<br>未出現 absent">
                <label>
                    <input type="checkbox" name="occurrenceStatus"/>
                    occurrenceStatus
                </label>
            </div>
            <div class="checkbox" data-name="preparations" data-type="Occurrence" data-description="A list (concatenated and separated) of preparations and preservation methods for a specimen." data-commonname="樣本狀態" data-example="fossil,<br>cast,<br>photograph,<br>DNA extract,<br>skin | skull | skeleton,<br>whole animal (ETOH) | tissue (EDTA)">
                <label>
                    <input type="checkbox" name="preparations"/>
                    preparations
                </label>
            </div>
            <div class="checkbox" data-name="disposition" data-type="Occurrence" data-description="A list (concatenated and separated) of identifiers (publication, global unique identifier, URI) of media associated with the Occurrence" data-commonname="樣本處置" data-example="in collection,<br>missing,<br>voucher elsewhere,<br>duplicates elsewhere">
                <label>
                    <input type="checkbox" name="disposition"/>
                    disposition
                </label>
            </div>
            <div class="checkbox" data-name="associatedOccurrences" data-type="Occurrence" data-description="A list (concatenated and separated) of identifiers of other Occurrence records and their associations to this Occurrence." data-commonname="相關物種出現紀錄" data-example="parasite collected from: https://arctos.database.museum/guid/MSB:Mamm:215895?seid=950760,<br>encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3175067 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177393 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177394 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3177392 | encounter previous to: http://arctos.database.museum/guid/MSB:Mamm:292063?seid=3609139">
                <label>
                    <input type="checkbox" name="associatedOccurrences"/>
                    associatedOccurrences
                </label>
            </div>
            <div class="checkbox" data-name="associatedReferences" data-type="Occurrence" data-description="A list (concatenated and separated) of identifiers (publication, bibliographic reference, global unique identifier, URI) of literature associated with the Occurrence." data-commonname="相關參考資料" data-example="http://www.sciencemag.org/cgi/content/abstract/322/5899/261, Christopher J. Conroy, Jennifer L. Neuwald. 2008. Phylogeographic study of the California vole, Microtus californicus Journal of Mammalogy, 89(3):755-767., Steven R. Hoofer and Ronald A. Van Den Bussche. 2001. Phylogenetic Relationships of Plecotine Bats and Allies Based on Mitochondrial Ribosomal Sequences. Journal of Mammalogy 82(1):131-137. | Walker, Faith M., Jeffrey T. Foster, Kevin P. Drees, Carol L. Chambers. 2014. Spotted bat (Euderma maculatum) microsatellite discovery using illumina sequencing. Conservation Genetics Resources.">
                <label>
                    <input type="checkbox" name="associatedReferences"/>
                    associatedReferences
                </label>
            </div>
            <div class="checkbox" data-name="associatedSequences" data-type="Occurrence" data-description="A list (concatenated and separated) of identifiers (publication, global unique identifier, URI) of genetic sequence information associated with the Occurrence." data-commonname="相關基因序列" data-example="http://www.ncbi.nlm.nih.gov/nuccore/U34853.1, http://www.ncbi.nlm.nih.gov/nuccore/GU328060 | http://www.ncbi.nlm.nih.gov/nuccore/AF326093">
                <label>
                    <input type="checkbox" name="associatedSequences"/>
                    associatedSequences
                </label>
            </div>
            <div class="checkbox" data-name="associatedTaxa" data-type="Occurrence" data-description="A list (concatenated and separated) of identifiers or names of taxa and the associations of this Occurrence to each of them." data-commonname="相關物種" data-example="host: Quercus alba,<br>host: gbif.org/species/2879737,<br>parasitoid of: Cyclocephala signaticollis | predator of: Apis mellifera">
                <label>
                    <input type="checkbox" name="associatedTaxa"/>
                    associatedTaxa
                </label>
            </div>
            <div class="checkbox" data-name="otherCatalogNumbers" data-type="Occurrence" data-description="A list (concatenated and separated) of previous or alternate fully qualified catalog numbers or other human-used identifiers for the same Occurrence, whether in the current or any other data set or collection." data-commonname="其他館藏號" data-example="FMNH:Mammal:1234, NPS YELLO6778 | MBG 33424">
                <label>
                    <input type="checkbox" name="otherCatalogNumbers"/>
                    otherCatalogNumbers
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceRemarks" data-type="Occurrence" data-description="Comments or notes about the Occurrence." data-commonname="出現紀錄註記" data-example="found dead on road">
                <label>
                    <input type="checkbox" name="occurrenceRemarks"/>
                    occurrenceRemarks
                </label>
            </div>
            <div class="checkbox" data-name="organismID" data-type="Organism" data-description="An identifier for the Organism instance (as opposed to a particular digital record of the Organism). May be a globally unique identifier or an identifier specific to the data set." data-commonname="生物體ID" data-example="http://arctos.database.museum/guid/WNMU:Mamm:1249">
                <label>
                    <input type="checkbox" name="organismID"/>
                    organismID
                </label>
            </div>
            <div class="checkbox" data-name="organismName" data-type="Organism" data-description="A textual name or label assigned to an Organism instance." data-commonname="生物體名" data-example="Huberta,<br>Boab Prison Tree,<br>J pod">
                <label>
                    <input type="checkbox" name="organismName"/>
                    organismName
                </label>
            </div>
            <div class="checkbox" data-name="organismScope" data-type="Organism" data-description="A description of the kind of Organism instance. Can be used to indicate whether the Organism instance represents a discrete organism or if it represents a particular type of aggregation." data-commonname="生物體類型" data-example="multicellular organism,<br>virus,<br>clone,<br>pack,<br>colony">
                <label>
                    <input type="checkbox" name="organismScope"/>
                    organismScope
                </label>
            </div>
            <div class="checkbox" data-name="associatedOrganisms" data-type="Organism" data-description="A textual name or label assigned to an Organism instance." data-commonname="相關生物體" data-example="sibling of: http://arctos.database.museum/guid/DMNS:Mamm:14171,<br>parent of: http://arctos.database.museum/guid/MSB:Mamm:196208 | parent of: http://arctos.database.museum/guid/MSB:Mamm:196523 | sibling of: http://arctos.database.museum/guid/MSB:Mamm:142638">
                <label>
                    <input type="checkbox" name="associatedOrganisms"/>
                    associatedOrganisms
                </label>
            </div>
            <div class="checkbox" data-name="previousIdentifications" data-type="Organism" data-description="A list (concatenated and separated) of previous assignments of names to the Organism." data-commonname="過往鑑定" data-example="Chalepidae, Pinus abies, Anthus sp., field ID by G. Iglesias | Anthus correndera, expert ID by C. Cicero 2009-02-12 based on morphology">
                <label>
                    <input type="checkbox" name="previousIdentifications"/>
                    previousIdentifications
                </label>
            </div>
            <div class="checkbox" data-name="organismRemarks" data-type="Organism" data-description="Comments or notes about the Organism instance." data-commonname="生物體註記" data-example="One of a litter of six">
                <label>
                    <input type="checkbox" name="organismRemarks"/>
                    organismRemarks
                </label>
            </div>
            <div class="checkbox" data-name="type" data-type="Record-level" data-description="The nature or genre of the resource." data-commonname="資源類型" data-example="靜態影像 StillImage,<br>動態影像 MovingImage,<br>聲音 Sound,<br>實體物件 PhysicalObject,<br>事件 Event,<br>文字 Text">
                <label>
                    <input type="checkbox" name="type"/>
                    type
                </label>
            </div>
            <div class="checkbox" data-name="modified" data-type="Record-level" data-description="The most recent date-time on which the resource was changed." data-commonname="IPT資料修改時間" data-example="1963-03-08T14:07-0600 (8 Mar 1963 at 2:07pm in the time zone six hours earlier than UTC),<br>2009-02-20T08:40Z (20 February 2009 8:40am UTC),<br>2018-08-29T15:19 (3:19pm local time on 29 August 2018),<br>1809-02-12 (some time during 12 February 1809),<br>1906-06 (some time in June 1906),<br>1971 (some time in the year 1971),<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z (some time during the interval between 1 March 2007 1pm UTC and 11 May 2008 3:30pm UTC),<br>1900/1909 (some time during the interval between the beginning of the year 1900 and the end of the year 1909),<br>2007-11-13/15 (some time in the interval between 13 November 2007 and 15 November 2007)">
                <label>
                    <input type="checkbox" name="modified"/>
                    modified
                </label>
            </div>
            <div class="checkbox" data-name="language" data-type="Record-level" data-description="A language of the resource." data-commonname="語言" data-example="en">
                <label>
                    <input type="checkbox" name="language"/>
                    language
                </label>
            </div>
            <div class="checkbox" data-name="license" data-type="Record-level" data-description="A legal document giving official permission to do something with the resource." data-commonname="授權標示" data-example="http://creativecommons.org/publicdomain/zero/1.0/legalcode,<br>http://creativecommons.org/licenses/by/4.0/legalcode">
                <label>
                    <input type="checkbox" name="license"/>
                    license
                </label>
            </div>
            <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="A person or organization owning or managing rights over the resource." data-commonname="所有權" data-example="The Regents of the University of California">
                <label>
                    <input type="checkbox" name="rightsHolder"/>
                    rightsHolder
                </label>
            </div>
            <div class="checkbox" data-name="accessRights" data-type="Record-level" data-description="Information about who can access the resource or an indication of its security status." data-commonname="取用權" data-example="not-for-profit use only,<br>https://www.fieldmuseum.org/field-museum-natural-history-conditions-and-suggested-norms-use-collections-data-and-images">
                <label>
                    <input type="checkbox" name="accessRights"/>
                    accessRights
                </label>
            </div>
            <div class="checkbox" data-name="bibliographicCitation" data-type="Record-level" data-description="A bibliographic reference for the resource as a statement indicating how this record should be cited (attributed) when used." data-commonname="引用此資料的方式" data-example="Occurrence example: Museum of Vertebrate Zoology, UC Berkeley. MVZ Mammal Collection (Arctos). Record ID: http://arctos.database.museum/guid/MVZ:Mamm:165861?seid=101356. Source: http://ipt.vertnet.org:8080/ipt/resource.do?r=mvz_mammal,<br>Taxon example: https://www.gbif.org/species/2439608 Source: GBIF Taxonomic Backbone,<br>Event example: Rand, K.M., Logerwell, E.A. The first demersal trawl survey of benthic fish and invertebrates in the Beaufort Sea since the late 1970s. Polar Biol 34, 475–488 (2011). https://doi.org/10.1007/s00300-010-0900-2">
                <label>
                    <input type="checkbox" name="bibliographicCitation"/>
                    bibliographicCitation
                </label>
            </div>
            <div class="checkbox" data-name="references" data-type="Record-level" data-description="A related resource that is referenced, cited, or otherwise pointed to by the described resource." data-commonname="資料來源參考" data-example="MaterialSample example: http://arctos.database.museum/guid/MVZ:Mamm:165861,<br>Taxon example: https://www.catalogueoflife.org/data/taxon/32664">
                <label>
                    <input type="checkbox" name="references"/>
                    references
                </label>
            </div>
            <div class="checkbox" data-name="institutionID" data-type="Record-level" data-description="An identifier for the institution having custody of the object(s) or information referred to in the record." data-commonname="發布機構ID" data-example="http://biocol.org/urn:lsid:biocol.org:col:34777,<br>http://grbio.org/cool/km06-gtbn">
                <label>
                    <input type="checkbox" name="institutionID"/>
                    institutionID
                </label>
            </div>
            <div class="checkbox" data-name="collectionID" data-type="Record-level" data-description="An identifier for the collection or dataset from which the record was derived." data-commonname="館藏ID" data-example="http://biocol.org/urn:lsid:biocol.org:col:1001, http://grbio.org/cool/p5fp-c036">
                <label>
                    <input type="checkbox" name="collectionID"/>
                    collectionID
                </label>
            </div>
            <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="An identifier for the set of data. May be a global unique identifier or an identifier specific to a collection or institution." data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
                <label>
                    <input type="checkbox" name="datasetID"/>
                    datasetID
                </label>
            </div>
            <div class="checkbox" data-name="institutionCode" data-type="Record-level" data-description="The name (or acronym) in use by the institution having custody of the object(s) or information referred to in the record." data-commonname="機構代碼" data-example="MVZ,<br>FMNH,<br>CLO,<br>UCMP">
                <label>
                    <input type="checkbox" name="institutionCode"/>
                    institutionCode
                </label>
            </div>
            <div class="checkbox" data-name="collectionCode" data-type="Record-level" data-description="The name, acronym, coden, or initialism identifying the collection or data set from which the record was derived." data-commonname="語言" data-example="Mammals,<br>Hildebrandt,<br>EBIRD,<br>VP">
                <label>
                    <input type="checkbox" name="collectionCode"/>
                    collectionCode
                </label>
            </div>
            <div class="checkbox" data-name="datasetName" data-type="Record-level" data-description="The name identifying the data set from which the record was derived." data-commonname="資料集名稱" data-example="Grinnell Resurvey Mammals,<br>Lacey Ctenomys Recaptures">
                <label>
                    <input type="checkbox" name="datasetName"/>
                    datasetName
                </label>
            </div>
            <div class="checkbox" data-name="ownerInstitutionCode" data-type="Record-level" data-description="The name (or acronym) in use by the institution having ownership of the object(s) or information referred to in the record." data-commonname="所有者機構代碼" data-example="NPS,<br>APN,<br>InBio">
                <label>
                    <input type="checkbox" name="ownerInstitutionCode"/>
                    ownerInstitutionCode
                </label>
            </div>
            <div class="checkbox" data-name="informationWithheld" data-type="Record-level" data-description="Additional information that exists, but that has not been shared in the given record." data-commonname="隱藏資訊" data-example="location information not given for endangered species, collector identities withheld | ask about tissue samples">
                <label>
                    <input type="checkbox" name="informationWithheld"/>
                    informationWithheld
                </label>
            </div>
            <div class="checkbox" data-name="dataGeneralizations" data-type="Record-level" data-description="Actions taken to make the shared data less specific or complete than in its original form. Suggests that alternative data of higher quality may be available on request." data-commonname="資料模糊化" data-example="Coordinates generalized from original GPS coordinates to the nearest half degree grid cell.">
                <label>
                    <input type="checkbox" name="dataGeneralizations"/>
                    dataGeneralizations
                </label>
            </div>
            <div class="checkbox" data-name="dynamicProperties" data-type="Record-level" data-description="A list of additional measurements, facts, characteristics, or assertions about the record. Meant to provide a mechanism for structured content." data-commonname="動態屬性" data-example="{heightInMeters: 1.5}, {tragusLengthInMeters: 0.014, weightInGrams: 120}, {natureOfID: expert identification, identificationEvidence: cytochrome B sequence}, {relativeHumidity: 28, airTemperatureInCelsius: 22, sampleSizeInKilograms: 10}, {aspectHeading: 277, slopeInDegrees: 6}, {iucnStatus: vulnerable, taxonDistribution: Neuquén, Argentina}">
                <label>
                    <input type="checkbox" name="dynamicProperties"/>
                    dynamicProperties
                </label>
            </div>
            <div class="checkbox" data-name="taxonID" data-type="Taxon" data-description="分類識別碼" data-commonname="物種分類ID" data-example="32567">
                <label>
                    <input type="checkbox" name="taxonID"/>
                    taxonID
                </label>
            </div>
            <div class="checkbox" data-name="scientificNameID" data-type="Taxon" data-description="An identifier for the nomenclatural (not taxonomic) details of a scientific name." data-commonname="學名ID" data-example="urn:lsid:ipni.org:names:37829-1:1.3">
                <label>
                    <input type="checkbox" name="scientificNameID"/>
                    scientificNameID
                </label>
            </div>
            <div class="checkbox" data-name="parentNameUsageID" data-type="Taxon" data-description="An identifier for the name usage (documented meaning of the name according to a source) in which the terminal element of the scientificName was originally established under the rules of the associated nomenclaturalCode." data-commonname="最高階學名ID" data-example="tsn:41107 (ITIS),<br>urn:lsid:ipni.org:names:320035-2 (IPNI),<br>2704179 (GBIF),<br>6W3C4 (COL)">
                <label>
                    <input type="checkbox" name="parentNameUsageID"/>
                    parentNameUsageID
                </label>
            </div>
            <div class="checkbox" data-name="nameAccordingToID" data-type="Taxon" data-description="An identifier for the source in which the specific taxon concept circumscription is defined or implied." data-commonname="學名依據ID" data-example="https://doi.org/10.1016/S0269-915X(97)80026-2">
                <label>
                    <input type="checkbox" name="nameAccordingToID"/>
                    nameAccordingToID
                </label>
            </div>
            <div class="checkbox" data-name="namePublishedInID" data-type="Taxon" data-description="An identifier for the publication in which the scientificName was originally established under the rules of the associated nomenclaturalCode." data-commonname="學名發表文獻ID" data-example="">
                <label>
                    <input type="checkbox" name="namePublishedInID"/>
                    namePublishedInID
                </label>
            </div>
            <div class="checkbox" data-name="taxonConceptID" data-type="Taxon" data-description="An identifier for the taxonomic concept to which the record refers - not for the nomenclatural details of a taxon." data-commonname="分類觀ID" data-example="8fa58e08-08de-4ac1-b69c-1235340b7001">
                <label>
                    <input type="checkbox" name="taxonConceptID"/>
                    taxonConceptID
                </label>
            </div>
            <div class="checkbox" data-name="scientificName" data-type="Taxon" data-description="完整的學名，包括已知的作者和日期資訊。若是作為鑑定的一部分，應是可確定的最低分類階層的名稱" data-commonname="學名" data-example="Coleoptera (目),<br>Vespertilionidae (科),<br>Manis (屬),<br>Ctenomys sociabilis (屬 + 種小名),<br>Ambystoma tigrinum diaboli (屬 +種小名 + 亞種小名),<br>Roptrocerus typographi (Györfi, 1952) (屬 + 種小名 + 學名命名者),<br>Quercus agrifolia var. oxyadenia (Torr.) J.T.">
                <label>
                    <input type="checkbox" name="scientificName"/>
                    scientificName
                </label>
            </div>
            <div class="checkbox" data-name="acceptedNameUsage" data-type="Taxon" data-description="The full name, with authorship and date information if known, of the currently valid (zoological) or accepted (botanical) taxon." data-commonname="有效學名" data-example="Tamias minimus (valid name for Eutamias minimus)">
                <label>
                    <input type="checkbox" name="acceptedNameUsage"/>
                    acceptedNameUsage
                </label>
            </div>
            <div class="checkbox" data-name="parentNameUsage" data-type="Taxon" data-description="The full name, with authorship and date information if known, of the direct, most proximate higher-rank parent taxon (in a classification) of the most specific element of the scientificName." data-commonname="最高階學名ID" data-example="Rubiaceae,<br>Gruiformes,<br>Testudinae">
                <label>
                    <input type="checkbox" name="parentNameUsage"/>
                    parentNameUsage
                </label>
            </div>
            <div class="checkbox" data-name="originalNameUsage" data-type="Taxon" data-description="The taxon name, with authorship and date information if known, as it originally appeared when first established under the rules of the associated nomenclaturalCode. The basionym (botany) or basonym (bacteriology) of the scientificName or the senior/earlier homonym for replaced names." data-commonname="原始接受名" data-example="Pinus abies, Gasterosteus saltatrix Linnaeus 1768">
                <label>
                    <input type="checkbox" name="originalNameUsage"/>
                    originalNameUsage
                </label>
            </div>
            <div class="checkbox" data-name="nameAccordingTo" data-type="Taxon" data-description="The reference to the source in which the specific taxon concept circumscription is defined or implied - traditionally signified by the Latin "sensu" or "sec." (from secundum, meaning "according to"). For taxa that result from identifications, a reference to the keys, monographs, experts and other sources should be given." data-commonname="學名依據ID" data-example="Franz NM, Cardona-Duque J (2013) Description of two new species and phylogenetic reassessment of Perelleschus Wibmer & O’Brien, 1986 (Coleoptera: Curculionidae), with a complete taxonomic concept history of Perelleschus sec. Franz & Cardona-Duque, 2013. Syst Biodivers. 11: 209–236. (as the full citation of the Franz & Cardona-Duque (2013) in Perelleschus splendida sec. Franz & Cardona-Duque (2013))">
                <label>
                    <input type="checkbox" name="nameAccordingTo"/>
                    nameAccordingTo
                </label>
            </div>
            <div class="checkbox" data-name="namePublishedIn" data-type="Taxon" data-description="A reference for the publication in which the scientificName was originally established under the rules of the associated nomenclaturalCode." data-commonname="學名發表文獻ID" data-example="Pearson O. P., and M. I. Christie. 1985. Historia Natural, 5(37):388, Forel, Auguste, Diagnosies provisoires de quelques espèces nouvelles de fourmis de Madagascar, récoltées par M. Grandidier., Annales de la Societe Entomologique de Belgique, Comptes-rendus des Seances 30, 1886">
                <label>
                    <input type="checkbox" name="namePublishedIn"/>
                    namePublishedIn
                </label>
            </div>
            <div class="checkbox" data-name="namePublishedInYear" data-type="Taxon" data-description="The four-digit year in which the scientificName was published." data-commonname="學名發表年份" data-example="1996,<br>2023">
                <label>
                    <input type="checkbox" name="namePublishedInYear"/>
                    namePublishedInYear
                </label>
            </div>
            <div class="checkbox" data-name="higherClassification" data-type="Taxon" data-description="A list (concatenated and separated) of taxa names terminating at the rank immediately superior to the taxon referenced in the taxon record." data-commonname="高階分類階層" data-example="Plantae | Tracheophyta | Magnoliopsida | Ranunculales | Ranunculaceae | Ranunculus, Animalia, Animalia | Chordata | Vertebrata | Mammalia | Theria | Eutheria | Rodentia | Hystricognatha | Hystricognathi | Ctenomyidae | Ctenomyini | Ctenomys">
                <label>
                    <input type="checkbox" name="higherClassification"/>
                    higherClassification
                </label>
            </div>
            <div class="checkbox" data-name="kingdom" data-type="Taxon" data-description="The full scientific name of the kingdom in which the taxon is classified." data-commonname="界" data-example="Animalia,<br>Archaea,<br>Bacteria,<br>Chromista,<br>Fungi,<br>Plantae,<br>Protozoa,<br>Viruses">
                <label>
                    <input type="checkbox" name="kingdom"/>
                    kingdom
                </label>
            </div>
            <div class="checkbox" data-name="phylum" data-type="Taxon" data-description="The full scientific name of the phylum or division in which the taxon is classified." data-commonname="門" data-example="Chordata (phylum),<br>Bryophyta (division)">
                <label>
                    <input type="checkbox" name="phylum"/>
                    phylum
                </label>
            </div>
            <div class="checkbox" data-name="class" data-type="Taxon" data-description="The full scientific name of the class in which the taxon is classified." data-commonname="綱" data-example="Mammalia,<br>Hepaticopsida">
                <label>
                    <input type="checkbox" name="class"/>
                    class
                </label>
            </div>
            <div class="checkbox" data-name="order" data-type="Taxon" data-description="The full scientific name of the order in which the taxon is classified." data-commonname="目" data-example="Carnivora,<br>Monocleales">
                <label>
                    <input type="checkbox" name="order"/>
                    order
                </label>
            </div>
            <div class="checkbox" data-name="family" data-type="Taxon" data-description="The full scientific name of the family in which the taxon is classified." data-commonname="科" data-example="Felidae,<br>Monocleaceae">
                <label>
                    <input type="checkbox" name="family"/>
                    family
                </label>
            </div>
            <div class="checkbox" data-name="subfamily" data-type="Taxon" data-description="The full scientific name of the subfamily in which the taxon is classified." data-commonname="亞科" data-example="Periptyctinae,<br>Orchidoideae,<br>Sphindociinae">
                <label>
                    <input type="checkbox" name="subfamily"/>
                    subfamily
                </label>
            </div>
            <div class="checkbox" data-name="genus" data-type="Taxon" data-description="The full scientific name of the genus in which the taxon is classified." data-commonname="屬" data-example="Puma,<br>Monoclea">
                <label>
                    <input type="checkbox" name="genus"/>
                    genus
                </label>
            </div>
            <div class="checkbox" data-name="genericName" data-type="Taxon" data-description="The genus part of the scientificName without authorship." data-commonname="屬名" data-example="Felis (for scientificName "Felis concolor", with accompanying values of "Puma concolor" in acceptedNameUsage and "Puma" in genus)">
                <label>
                    <input type="checkbox" name="genericName"/>
                    genericName
                </label>
            </div>
            <div class="checkbox" data-name="subgenus" data-type="Taxon" data-description="The full scientific name of the subgenus in which the taxon is classified." data-commonname="亞屬" data-example="Strobus,<br>Amerigo,<br>Pilosella">
                <label>
                    <input type="checkbox" name="subgenus"/>
                    subgenus
                </label>
            </div>
            <div class="checkbox" data-name="infragenericEpithet" data-type="Taxon" data-description="The infrageneric part of a binomial name at ranks above species but below genus." data-commonname="屬以下別名" data-example="Abacetillus (for scientificName 'Abacetus (Abacetillus) ambiguus',<br>Cracca (for scientificName 'Vicia sect. Cracca')">
                <label>
                    <input type="checkbox" name="infragenericEpithet"/>
                    infragenericEpithet
                </label>
            </div>
            <div class="checkbox" data-name="specificEpithet" data-type="Taxon" data-description="The name of the first or species epithet of the scientificName." data-commonname="種小名" data-example="concolor,<br>gottschei">
                <label>
                    <input type="checkbox" name="specificEpithet"/>
                    specificEpithet
                </label>
            </div>
            <div class="checkbox" data-name="infraspecificEpithet" data-type="Taxon" data-description="The name of the lowest or terminal infraspecific epithet of the scientificName, excluding any rank designation." data-commonname="種以下別名" data-example="concolor (for scientificName 'Puma concolor concolor),<br>oxyadenia (for scientificName 'Quercus agrifolia var. oxyadenia'),<br>laxa (for scientificName 'Cheilanthes hirta f. laxa'),<br>scaberrima (for scientificName 'Indigofera charlieriana var. scaberrima')">
                <label>
                    <input type="checkbox" name="infraspecificEpithet"/>
                    infraspecificEpithet
                </label>
            </div>
            <div class="checkbox" data-name="cultivarEpithet" data-type="Taxon" data-description="Part of the name of a cultivar, cultivar group or grex that follows the scientific name." data-commonname="字面上分類位階" data-example="King Edward (for scientificName Solanum tuberosum 'King Edward' and taxonRank 'cultivar'); Mishmiense (for scientificName Rhododendron boothii Mishmiense Group and taxonRank 'cultivar group'); Atlantis (for scientificName Paphiopedilum Atlantis grex and taxonRank 'grex')">
                <label>
                    <input type="checkbox" name="cultivarEpithet"/>
                    cultivarEpithet
                </label>
            </div>
            <div class="checkbox" data-name="taxonRank" data-type="Taxon" data-description="物種的分類階層" data-commonname="分類階層" data-example="genus,<br>species,<br>subspecies,<br>family">
                <label>
                    <input type="checkbox" name="taxonRank"/>
                    taxonRank
                </label>
            </div>
            <div class="checkbox" data-name="verbatimTaxonRank" data-type="Taxon" data-description="The taxonomic rank of the most specific name in the scientificName as it appears in the original record." data-commonname="字面上分類位階" data-example="Agamospecies, sub-lesus, prole, apomict, nothogrex, sp., subsp., var.">
                <label>
                    <input type="checkbox" name="verbatimTaxonRank"/>
                    verbatimTaxonRank
                </label>
            </div>
            <div class="checkbox" data-name="scientificNameAuthorship" data-type="Taxon" data-description="The authorship information for the scientificName formatted according to the conventions of the applicable nomenclaturalCode." data-commonname="學名命名者" data-example="(Torr.) J.T. Howell, (Martinovský) Tzvelev, (Györfi, 1952)">
                <label>
                    <input type="checkbox" name="scientificNameAuthorship"/>
                    scientificNameAuthorship
                </label>
            </div>
            <div class="checkbox" data-name="vernacularName" data-type="Taxon" data-description="A common or vernacular name." data-commonname="俗名" data-example="Andean Condor,<br>Condor Andino,<br>American Eagle,<br>Gänsegeier">
                <label>
                    <input type="checkbox" name="vernacularName"/>
                    vernacularName
                </label>
            </div>
            <div class="checkbox" data-name="nomenclaturalCode" data-type="Taxon" data-description="物種的分類階層" data-commonname="命名代碼" data-example="ICN,<br>ICZN,<br>BC,<br>ICNCP,<br>BioCode">
                <label>
                    <input type="checkbox" name="nomenclaturalCode"/>
                    nomenclaturalCode
                </label>
            </div>
            <div class="checkbox" data-name="taxonomicStatus" data-type="Taxon" data-description="The status of the use of the scientificName as a label for a taxon. Requires taxonomic opinion to define the scope of a taxon. Rules of priority then are used to define the taxonomic status of the nomenclature contained in that scope, combined with the experts opinion. It must be linked to a specific taxonomic reference that defines the concept." data-commonname="分類狀態" data-example="invalid,<br>misapplied,<br>homotypic synonym,<br>accepted">
                <label>
                    <input type="checkbox" name="taxonomicStatus"/>
                    taxonomicStatus
                </label>
            </div>
            <div class="checkbox" data-name="nomenclaturalCode" data-type="Taxon" data-description="The status related to the original publication of the name and its conformance to the relevant rules of nomenclature. It is based essentially on an algorithm according to the business rules of the code. It requires no taxonomic opinion." data-commonname="命名狀態" data-example="nom. ambig., nom. illeg., nom. subnud.">
                <label>
                    <input type="checkbox" name="nomenclaturalCode"/>
                    nomenclaturalCode
                </label>
            </div>
            <div class="checkbox" data-name="taxonRemarks" data-type="Taxon" data-description="Comments or notes about the taxon or name." data-commonname="分類註記" data-example="this name is a misspelling in common use">
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
            <div class="checkbox" data-name="type" data-type="" data-description="The nature or genre of the resource." data-commonname="資源類型" data-example="靜態影像 StillImage,<br>動態影像 MovingImage,<br>聲音 Sound,<br>實體物件 PhysicalObject,<br>事件 Event,<br>文字 Text">
                <label>
                    <input type="checkbox" name="type"/>
                    type
                </label>
            </div>
            <div class="checkbox" data-name="format" data-type="" data-description="The format the image is exposed in. It is recommended to use a IANA registered media type, but known file suffices are permissible too." data-commonname="" data-example="image/jpeg">
                <label>
                    <input type="checkbox" name="format"/>
                    format
                </label>
            </div>
            <div class="checkbox" data-name="identifier" data-type="" data-description="The public URL that identifies and locates the media file directly, not the html page it might be shown on. It is highly recommended that a URL to a media file of good resolution is provided or at least dc:reference in cases no public URI exists." data-commonname="" data-example="http://farm6.static.flickr.com/5127/5242866958_98afd8cbce_o.jpg">
                <label>
                    <input type="checkbox" name="identifier"/>
                    identifier
                </label>
            </div>
            <div class="checkbox" data-name="references" data-type="Record-level" data-description="A related resource that is referenced, cited, or otherwise pointed to by the described resource." data-commonname="資料來源參考" data-example="MaterialSample example: http://arctos.database.museum/guid/MVZ:Mamm:165861,<br>Taxon example: https://www.catalogueoflife.org/data/taxon/32664">
                <label>
                    <input type="checkbox" name="references"/>
                    references
                </label>
            </div>
            <div class="checkbox" data-name="title" data-type="" data-description="The media items title. Strongly recommended as in many cases this will be used as the hyperlink text, and should be used accrodingly." data-commonname="" data-example="">
                <label>
                    <input type="checkbox" name="title"/>
                    title
                </label>
            </div>
            <div class="checkbox" data-name="description" data-type="" data-description="A textual description of the content of the media item." data-commonname="" data-example="Female Tachycineta albiventer photographed in the Amazon, Brazil, in November 2010">
                <label>
                    <input type="checkbox" name="description"/>
                    description
                </label>
            </div>
            <div class="checkbox" data-name="created" data-type="" data-description="The date and time this media item was taken." data-commonname="" data-example="1996-11-26">
                <label>
                    <input type="checkbox" name="created"/>
                    created
                </label>
            </div>
            <div class="checkbox" data-name="creator" data-type="" data-description="The person that took the image, recorded the video or sound." data-commonname="" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="creator"/>
                    creator
                </label>
            </div>
            <div class="checkbox" data-name="contributor" data-type="" data-description="Any contributor in addition to the creator that helped in recording the media item." data-commonname="" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="contributor"/>
                    contributor
                </label>
            </div>
            <div class="checkbox" data-name="publisher" data-type="" data-description="An entity responsible for making the image available." data-commonname="" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="publisher"/>
                    publisher
                </label>
            </div>
            <div class="checkbox" data-name="audience" data-type="" data-description="A class or description for whom the image is intended or useful." data-commonname="" data-example="experts,<br>general public,<br>children">
                <label>
                    <input type="checkbox" name="audience"/>
                    audience
                </label>
            </div>
            <div class="checkbox" data-name="license" data-type="Record-level" data-description="A legal document giving official permission to do something with the resource." data-commonname="授權標示" data-example="http://creativecommons.org/publicdomain/zero/1.0/legalcode,<br>http://creativecommons.org/licenses/by/4.0/legalcode">
                <label>
                    <input type="checkbox" name="license"/>
                    license
                </label>
            </div>
            <div class="checkbox" data-name="rightsHolder" data-type="Record-level" data-description="A person or organization owning or managing rights over the resource." data-commonname="所有權" data-example="The Regents of the University of California">
                <label>
                    <input type="checkbox" name="rightsHolder"/>
                    rightsHolder
                </label>
            </div>
            <div class="checkbox" data-name="datasetID" data-type="Record-level" data-description="An identifier for the set of data. May be a global unique identifier or an identifier specific to a collection or institution." data-commonname="資料集ID" data-example="b15d4952-7d20-46f1-8a3e-556a512b04c5">
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
            <div class="checkbox" data-name="measurementID" data-type="" data-description="An identifier for the MeasurementOrFact (information pertaining to measurements, facts, characteristics, or assertions). May be a global unique identifier or an identifier specific to the data set." data-commonname="測量ID" data-example="">
                <label>
                    <input type="checkbox" name="measurementID"/>
                    measurementID
                </label>
            </div>
            <div class="checkbox" data-name="occurrenceID" data-type="Occurrence" data-description="出現紀錄識別碼" data-commonname="出現紀錄ID" data-example="32567">
                <label>
                    <input type="checkbox" name="occurrenceID"/>
                    occurrenceID
                </label>
            </div>
            <div class="checkbox" data-name="measurementType" data-type="" data-description="The nature of the measurement, fact, characteristic, or assertion. Recommended best practice is to use a controlled vocabulary." data-commonname="測量種類" data-example="tail length,<br>temperature,<br>trap line length,<br>survey area,<br>trap type,<br>Dry weight biomass,<br>Sampling instrument name">
                <label>
                    <input type="checkbox" name="measurementType"/>
                    measurementType
                </label>
            </div>
            <div class="checkbox" data-name="measurementTypeID" data-type="" data-description="An identifier for the measurementType (global unique identifier, URI). The identifier should reference the measurementType in a vocabulary." data-commonname="測量種類ID" data-example="http://vocab.nerc.ac.uk/collection/P01/current/ODRYBM01/">
                <label>
                    <input type="checkbox" name="measurementTypeID"/>
                    measurementTypeID
                </label>
            </div>
            <div class="checkbox" data-name="measurementValue" data-type="" data-description="The value of the measurement, fact, characteristic, or assertion." data-commonname="測量定值" data-example="45,<br>20,<br>1,<br>14.5,<br>UV-light,<br>Van Veen grab">
                <label>
                    <input type="checkbox" name="measurementValue"/>
                    measurementValue
                </label>
            </div>
            <div class="checkbox" data-name="measurementValueID" data-type="" data-description="An identifier for facts stored in the column measurementValue (global unique identifier, URI). This identifier can reference a controlled vocabulary (e.g. for sampling instrument names, methodologies, life stages) or reference a methodology paper with a DOI. When the measurementValue refers to a value and not to a fact, the measurementvalueID has no meaning and should remain empty." data-commonname="測量定值ID" data-example="http://vocab.nerc.ac.uk/collection/L22/current/TOOL0653/,<br>http://vocab.nerc.ac.uk/collection/B07/current/NDT023/,<br>http://vocab.nerc.ac.uk/collection/S11/current/S1116/">
                <label>
                    <input type="checkbox" name="measurementValueID"/>
                    measurementValueID
                </label>
            </div>
            <div class="checkbox" data-name="measurementAccuracy" data-type="" data-description="The description of the potential error associated with the measurementValue." data-commonname="測量準確度" data-example="0.01,<br>normal distribution with variation of 2 m">
                <label>
                    <input type="checkbox" name="measurementAccuracy"/>
                    measurementAccuracy
                </label>
            </div>
            <div class="checkbox" data-name="measurementUnit" data-type="" data-description="The units associated with the measurementValue. Recommended best practice is to use the International System of Units (SI)." data-commonname="測量單位" data-example="mm,<br>C,<br>km,<br>ha">
                <label>
                    <input type="checkbox" name="measurementUnit"/>
                    measurementUnit
                </label>
            </div>
            <div class="checkbox" data-name="measurementUnitID" data-type="" data-description="An identifier for the measurementUnit (global unique identifier, URI). The identifier should reference the measurementUnit in a vocabulary." data-commonname="測量單位ID" data-example="http://vocab.nerc.ac.uk/collection/P06/current/UMSQ/,<br>http://vocab.nerc.ac.uk/collection/P06/current/UCPL/,<br>http://vocab.nerc.ac.uk/collection/P06/current/CMCM/">
                <label>
                    <input type="checkbox" name="measurementUnitID"/>
                    measurementUnitID
                </label>
            </div>
            <div class="checkbox" data-name="measurementDeterminedDate" data-type="" data-description="The date on which the MeasurementOrFact was made. Recommended best practice is to use an encoding scheme, such as ISO 8601:2004(E)." data-commonname="測量日期" data-example="1963-03-08T14:07-0600,<br>2009-02-20T08:40Z,<br>1809-02-12,<br>1906-06,<br>1971,<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z,<br>2007-11-13/15">
                <label>
                    <input type="checkbox" name="measurementDeterminedDate"/>
                    measurementDeterminedDate
                </label>
            </div>
            <div class="checkbox" data-name="measurementDeterminedBy" data-type="" data-description="A list (concatenated and separated) of names of people, groups, or organizations who determined the value of the MeasurementOrFact." data-commonname="測量人" data-example="Javier de la Torre,<br>Julie Woodruff; Eileen Lacey">
                <label>
                    <input type="checkbox" name="measurementDeterminedBy"/>
                    measurementDeterminedBy
                </label>
            </div>
            <div class="checkbox" data-name="measurementMethod" data-type="" data-description="A description of or reference to (publication, URI) the method or protocol used to determine the measurement, fact, characteristic, or assertion." data-commonname="測量方法" data-example="'minimum convex polygon around burrow entrances' for a home range area,<br>'barometric altimeter' for an elevation">
                <label>
                    <input type="checkbox" name="measurementMethod"/>
                    measurementMethod
                </label>
            </div>
            <div class="checkbox" data-name="measurementRemarks" data-type="" data-description="Comments or notes accompanying the MeasurementOrFact." data-commonname="測量備註" data-example="tip of tail missing">
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
            <div class="checkbox" data-name="resourceID" data-type="" data-description="這筆紀錄的主體" data-commonname="主體紀錄ID" data-example="occ_HL20070207_001">
                <label>
                    <input type="checkbox" name="resourceID"/>
                    resourceID
                </label>
            </div>
            <div class="checkbox" data-name="relatedResourceID" data-type="" data-description="跟主體有關的紀錄" data-commonname="與主體有關係的對象ID" data-example="occ_HL20070207_001-1">
                <label>
                    <input type="checkbox" name="relatedResourceID"/>
                    relatedResourceID
                </label>
            </div>
            <div class="checkbox" data-name="relationshipOfResource" data-type="" data-description="記錄不同筆資料間的相關性，建議使用控制詞彙" data-commonname="關係描述" data-example="sameAs,<br>duplicate of,<br>mother of,<br>offspring of,<br>sibling of,<br>parasite of,<br>host of,<br>valid synonym of,<br>located within,<br>pollinator of members of taxon,<br>pollinated specific plant,<br>pollinated by members of taxon">
                <label>
                    <input type="checkbox" name="relationshipOfResource"/>
                    relationshipOfResource
                </label>
            </div>
            <div class="checkbox" data-name="relationshipRemarks" data-type="" data-description="relationshipOfResource的其他文字註記" data-commonname="關係備註" data-example="mother and offspring collected from the same nest,<br>pollinator captured in the act">
                <label>
                    <input type="checkbox" name="relationshipRemarks"/>
                    relationshipRemarks
                </label>
            </div>
            <div class="checkbox" data-name="relationshipOfResourceID" data-type="" data-description="An identifier for the relationship type (predicate) that connects the subject identified by resourceID to its object identified by relatedResourceID." data-commonname="主體紀錄的關係ID" data-example="http://purl.obolibrary.org/obo/RO_0002456 (for the relation 'pollinated by'),<br>http://purl.obolibrary.org/obo/RO_0002455 (for the relation 'pollinates'),<br>https://www.inaturalist.org/observation_fields/879 (for the relation 'eaten by')'">
                <label>
                    <input type="checkbox" name="relationshipOfResourceID"/>
                    relationshipOfResourceID
                </label>
            </div>
            <div class="checkbox" data-name="resourceRelationshipID" data-type="" data-description="An identifier for an instance of relationship between one resource (the subject) and another (relatedResource, the object)." data-commonname="出現紀錄ID" data-example="04b16710-b09c-11e8-96f8-529269fb1459">
                <label>
                    <input type="checkbox" name="resourceRelationshipID"/>
                    resourceRelationshipID
                </label>
            </div>
            <div class="checkbox" data-name="relationshipAccordingTo" data-type="" data-description="The source (person, organization, publication, reference) establishing the relationship between the two resources." data-commonname="關係定義人" data-example="Jhu-Jyun Jhang">
                <label>
                    <input type="checkbox" name="relationshipAccordingTo"/>
                    relationshipAccordingTo
                </label>
            </div>
            <div class="checkbox" data-name="relationshipEstablishedDate" data-type="" data-description="The date-time on which the relationship between the two resources was established." data-commonname="關係定義日期" data-example="1963-03-08T14:07-0600 (8 Mar 1963 at 2:07pm in the time zone six hours earlier than UTC),<br>2009-02-20T08:40Z (20 February 2009 8:40am UTC),<br>2018-08-29T15:19 (3:19pm local time on 29 August 2018),<br>1809-02-12 (some time during 12 February 1809),<br>1906-06 (some time in June 1906),<br>1971 (some time in the year 1971),<br>2007-03-01T13:00:00Z/2008-05-11T15:30:00Z (some time during the interval between 1 March 2007 1pm UTC and 11 May 2008 3:30pm UTC),<br>1900/1909 (some time during the interval between the beginning of the year 1900 and the end of the year 1909),<br>2007-11-13/15 (some time in the interval between 13 November 2007 and 15 November 2007)">
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
            <div class="checkbox" data-name="samp_name" data-type="" data-description="Sample Name is a name that you choose for the sample. It can have any format, but we suggest that you make it concise, unique and consistent within your lab, and as informative as possible. Every Sample Name from a single Submitter must be unique." data-commonname="" data-example="">
                <label>
                    <input type="checkbox" name="samp_name"/>
                    samp_name
                </label>
            </div>
            <div class="checkbox" data-name="env_broad_scale" data-type="" data-description="In this field, report which major environmental system your sample or specimen came from. The systems identified should have a coarse spatial grain, to provide the general environmental context of where the sampling was done (e.g. were you in the desert or a rainforest?). We recommend using subclasses of ENVO’s biome class: http://purl.obolibrary.org/obo/ENVO_00000428. Format (one term): termLabel [termID], Format (multiple terms): termLabel [termID]|termLabel [termID]|termLabel [termID]. Example: Annotating a water sample from the photic zone in middle of the Atlantic Ocean, consider: oceanic epipelagic zone biome [ENVO:01000033]. Example: Annotating a sample from the Amazon rainforest consider: tropical moist broadleaf forest biome [ENVO:01000228]. If needed, request new terms on the ENVO tracker, identified here: http://www.obofoundry.org/ontology/envo.html" data-commonname="" data-example="forest biome [ENVO:01000174]">
                <label>
                    <input type="checkbox" name="env_broad_scale"/>
                    env_broad_scale
                </label>
            </div>
            <div class="checkbox" data-name="env_local_scale" data-type="" data-description="In this field, report the entity or entities which are in your sample or specimen’s local vicinity and which you believe have significant causal influences on your sample or specimen. Please use terms that are present in ENVO and which are of smaller spatial grain than your entry for env_broad_scale. Format (one term): termLabel [termID]; Format (multiple terms): termLabel [termID]|termLabel [termID]|termLabel [termID]. Example: Annotating a pooled sample taken from various vegetation layers in a forest consider: canopy [ENVO:00000047]|herb and fern layer [ENVO:01000337]|litter layer [ENVO:01000338]|understory [01000335]|shrub layer [ENVO:01000336]. If needed, request new terms on the ENVO tracker, identified here: http://www.obofoundry.org/ontology/envo.html" data-commonname="" data-example="litter layer [ENVO:01000338]">
                <label>
                    <input type="checkbox" name="env_local_scale"/>
                    env_local_scale
                </label>
            </div>
            <div class="checkbox" data-name="env_medium" data-type="" data-description="In this field, report which environmental material or materials (pipe separated) immediately surrounded your sample or specimen prior to sampling, using one or more subclasses of ENVO’s environmental material class: http://purl.obolibrary.org/obo/ENVO_00010483. Format (one term): termLabel [termID]; Format (multiple terms): termLabel [termID]|termLabel [termID]|termLabel [termID]. Example: Annotating a fish swimming in the upper 100 m of the Atlantic Ocean, consider: ocean water [ENVO:00002151]. Example: Annotating a duck on a pond consider: pond water [ENVO:00002228]|air ENVO_00002005. If needed, request new terms on the ENVO tracker, identified here: http://www.obofoundry.org/ontology/envo.html" data-commonname="" data-example="soil [ENVO:00001998]">
                <label>
                    <input type="checkbox" name="env_medium"/>
                    env_medium
                </label>
            </div>
            <div class="checkbox" data-name="project_name" data-type="" data-description="Name of the project within which the sequencing was organized" data-commonname="" data-example="Forest soil metagenome">
                <label>
                    <input type="checkbox" name="project_name"/>
                    project_name
                </label>
            </div>
            <div class="checkbox" data-name="experimental_factor" data-type="" data-description="Experimental factors are essentially the variable aspects of an experiment design which can be used to describe an experiment, or set of experiments, in an increasingly detailed manner. This field accepts ontology terms from Experimental Factor Ontology (EFO) and/or Ontology for Biomedical Investigations (OBI). For a browser of EFO (v 2.95) terms, please see http://purl.bioontology.org/ontology/EFO; for a browser of OBI (v 2018-02-12) terms please see http://purl.bioontology.org/ontology/OBI" data-commonname="" data-example="time series design [EFO:EFO_0001779]">
                <label>
                    <input type="checkbox" name="experimental_factor"/>
                    experimental_factor
                </label>
            </div>
            <div class="checkbox" data-name="concentration" data-type="" data-description="Concentration of DNA (weight ng/volume µl)" data-commonname="" data-example="67.5">
                <label>
                    <input type="checkbox" name="concentration"/>
                    concentration
                </label>
            </div>
            <div class="checkbox" data-name="concentrationUnit" data-type="" data-description="Unit used for concentration measurement" data-commonname="" data-example="ng/µl">
                <label>
                    <input type="checkbox" name="concentrationUnit"/>
                    concentrationUnit
                </label>
            </div>
            <div class="checkbox" data-name="methodDeterminationConcentrationAndRatios" data-type="" data-description="Description of method used for concentration measurement" data-commonname="" data-example="Nanodrop,<br>Qubit">
                <label>
                    <input type="checkbox" name="methodDeterminationConcentrationAndRatios"/>
                    methodDeterminationConcentrationAndRatios
                </label>
            </div>
            <div class="checkbox" data-name="ratioOfAbsorbance260_230" data-type="" data-description="Ratio of absorbance at 260 nm and 230 nm assessing DNA purity (mostly secondary measure, indicates mainly EDTA, carbohydrates, phenol), (DNA samples only)." data-commonname="" data-example="1.89">
                <label>
                    <input type="checkbox" name="ratioOfAbsorbance260_230"/>
                    ratioOfAbsorbance260_230
                </label>
            </div>
            <div class="checkbox" data-name="ratioOfAbsorbance260_280" data-type="" data-description="Ratio of absorbance at 280 nm and 230 nm assessing DNA purity (mostly secondary measure, indicates mainly EDTA, carbohydrates, phenol), (DNA samples only)." data-commonname="" data-example="1.91">
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
            <div class="checkbox" data-name="estimated_size" data-type="" data-description="The estimated size of the genome prior to sequencing. Of particular importance in the sequencing of (eukaryotic) genome which could remain in draft form for a long or unspecified period." data-commonname="" data-example="300000 bp">
                <label>
                    <input type="checkbox" name="estimated_size"/>
                    estimated_size
                </label>
            </div>
            <div class="checkbox" data-name="ref_biomaterial" data-type="" data-description="Primary publication if isolated before genome publication; otherwise, primary genome report" data-commonname="" data-example="doi:10.1016/j.syapm.2018.01.009">
                <label>
                    <input type="checkbox" name="ref_biomaterial"/>
                    ref_biomaterial
                </label>
            </div>
            <div class="checkbox" data-name="source_mat_id" data-type="" data-description="A unique identifier assigned to a material sample (as defined by http://rs.tdwg.org/dwc/terms/materialSampleID, and as opposed to a particular digital record of a material sample) used for extracting nucleic acids, and subsequent sequencing. The identifier can refer either to the original material collected or to any derived sub-samples. The INSDC qualifiers /specimen_voucher, /bio_material, or /culture_collection may or may not share the same value as the source_mat_id field. For instance, the /specimen_voucher qualifier and source_mat_id may both contain ´UAM:Herps:14´ , referring to both the specimen voucher and sampled tissue with the same identifier. However, the /culture_collection qualifier may refer to a value from an initial culture (e.g. ATCC:11775) while source_mat_id would refer to an identifier from some derived culture from which the nucleic acids were extracted (e.g. xatc123 or ark:/2154/R2)." data-commonname="" data-example="MPI012345">
                <label>
                    <input type="checkbox" name="source_mat_id"/>
                    source_mat_id
                </label>
            </div>
            <div class="checkbox" data-name="pathogenicity" data-type="" data-description="To what is the entity pathogenic" data-commonname="" data-example="human,<br>animal,<br>plant,<br>fungi,<br>bacteria">
                <label>
                    <input type="checkbox" name="pathogenicity"/>
                    pathogenicity
                </label>
            </div>
            <div class="checkbox" data-name="biotic_relationship" data-type="" data-description="Description of relationship(s) between the subject organism and other organism(s) it is associated with. E.g., parasite on species X; mutualist with species Y. The target organism is the subject of the relationship, and the other organism(s) is the object" data-commonname="" data-example="free living">
                <label>
                    <input type="checkbox" name="biotic_relationship"/>
                    biotic_relationship
                </label>
            </div>
            <div class="checkbox" data-name="specific_host" data-type="" data-description="If there is a host involved, please provide its taxid (or environmental if not actually isolated from the dead or alive host - i.e. a pathogen could be isolated from a swipe of a bench etc) and report whether it is a laboratory or natural host)" data-commonname="" data-example="9606">
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
            <div class="checkbox" data-name="host_disease_stat" data-type="" data-description="List of diseases with which the host has been diagnosed; can include multiple diagnoses. The value of the field depends on host; for humans the terms should be chosen from the DO (Human Disease Ontology) at https://www.disease-ontology.org, non-human host diseases are free text" data-commonname="" data-example="dead">
                <label>
                    <input type="checkbox" name="host_disease_stat"/>
                    host_disease_stat
                </label>
            </div>
            <div class="checkbox" data-name="trophic_level" data-type="" data-description="Trophic levels are the feeding position in a food chain. Microbes can be a range of producers (e.g. chemolithotroph)" data-commonname="" data-example="heterotroph">
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
            <div class="checkbox" data-name="samp_collec_device" data-type="" data-description="The device used to collect an environmental sample. This field accepts terms listed under environmental sampling device (http://purl.obolibrary.org/obo/ENVO). This field also accepts terms listed under specimen collection device (http://purl.obolibrary.org/obo/GENEPIO_0002094)." data-commonname="" data-example="environmental swab sampling,<br>biopsy,<br>niskin bottle,<br>push core">
                <label>
                    <input type="checkbox" name="samp_collec_device"/>
                    samp_collec_device
                </label>
            </div>
            <div class="checkbox" data-name="samp_collec_method" data-type="" data-description="The method employed for collecting the sample" data-commonname="" data-example="environmental swab sampling,<br>biopsy,<br>niskin bottle,<br>push core">
                <label>
                    <input type="checkbox" name="samp_collec_method"/>
                    samp_collec_method
                </label>
            </div>
            <div class="checkbox" data-name="samp_mat_process" data-type="" data-description="Any processing applied to the sample during or after retrieving the sample from environment. This field accepts OBI, for a browser of OBI (v 2018-02-12) terms please see http://purl.bioontology.org/ontology/OBI" data-commonname="" data-example="filtering of seawater,<br>storing samples in ethanol">
                <label>
                    <input type="checkbox" name="samp_mat_process"/>
                    samp_mat_process
                </label>
            </div>
            <div class="checkbox" data-name="size_frac" data-type="" data-description="Filtering pore size used in sample preparation" data-commonname="" data-example="0-0.22 micrometer">
                <label>
                    <input type="checkbox" name="size_frac"/>
                    size_frac
                </label>
            </div>
            <div class="checkbox" data-name="samp_size" data-type="" data-description="Amount or size of sample (volume, mass or area) that was collected" data-commonname="" data-example="5 liter">
                <label>
                    <input type="checkbox" name="samp_size"/>
                    samp_size
                </label>
            </div>
            <div class="checkbox" data-name="samp_vol_we_dna_ext" data-type="" data-description="Volume (ml) or mass (g) of total collected sample processed for DNA extraction. Note: total sample collected should be entered under the term Sample Size (MIXS:0000001)." data-commonname="" data-example="1500 milliliter">
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
            <div class="checkbox" data-name="annealingTemp" data-type="" data-description="The reaction temperature during the annealing phase of PCR." data-commonname="" data-example="60">
                <label>
                    <input type="checkbox" name="annealingTemp"/>
                    annealingTemp
                </label>
            </div>
            <div class="checkbox" data-name="annealingTempUnit" data-type="" data-description="Measurement unit of the reaction temperature during the annealing phase of PCR." data-commonname="" data-example="Degrees celsius">
                <label>
                    <input type="checkbox" name="annealingTempUnit"/>
                    annealingTempUnit
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
            <div class="checkbox" data-name="ampliconSize" data-type="" data-description="The length of the amplicon in basepairs." data-commonname="" data-example="83">
                <label>
                    <input type="checkbox" name="ampliconSize"/>
                    ampliconSize
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
            <div class="checkbox" data-name="amplificationReactionVolume" data-type="" data-description="PCR reaction volume" data-commonname="" data-example="22">
                <label>
                    <input type="checkbox" name="amplificationReactionVolume"/>
                    amplificationReactionVolume
                </label>
            </div>
            <div class="checkbox" data-name="amplificationReactionVolumeUnit" data-type="" data-description="Unit used for PCR reaction volume. Many of the instruments require preparation of a much larger initial sample volume than is actually analyzed." data-commonname="" data-example="µl">
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
            <div class="checkbox" data-name="nucl_acid_ext" data-type="" data-description="A link to a literature reference, electronic resource or a standard operating procedure (SOP), that describes the material separation to recover the nucleic acid fraction from a sample" data-commonname="" data-example="https://mobio.com/media/wysiwyg/pdfs/protocols/12888.pdf">
                <label>
                    <input type="checkbox" name="nucl_acid_ext"/>
                    nucl_acid_ext
                </label>
            </div>
            <div class="checkbox" data-name="nucl_acid_amp" data-type="" data-description="A link to a literature reference, electronic resource or a standard operating procedure (SOP), that describes the enzymatic amplification (PCR, TMA, NASBA) of specific nucleic acids" data-commonname="" data-example="https://phylogenomics.me/protocols/16s-pcr-protocol/">
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
            <div class="checkbox" data-name="target_gene" data-type="" data-description="Cloning vector type(s) used in construction of libraries" data-commonname="" data-example="12S rRNA,<br>16S rRNA,<br>18S rRNA,<br>nif,<br>amoA,<br>rpo">
                <label>
                    <input type="checkbox" name="target_gene"/>
                    target_gene
                </label>
            </div>
            <div class="checkbox" data-name="target_subfragment" data-type="" data-description="Name of subfragment of a gene or locus. Important to e.g. identify special regions on marker genes like V6 on 16S rRNA" data-commonname="" data-example="V6, V9, ITS">
                <label>
                    <input type="checkbox" name="target_subfragment"/>
                    target_subfragment
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primers" data-type="" data-description="Specify whether to expect single, paired, or other configuration of reads" data-commonname="" data-example="FWD: GTCGGTAAAACTCGTGCCAGC;<br>REV: CATAGTGGGGTATCTAATCCCAGTTTG">
                <label>
                    <input type="checkbox" name="pcr_primers"/>
                    pcr_primers
                </label>
            </div>
            <div class="checkbox" data-name="mid" data-type="" data-description="Molecular barcodes, called Multiplex Identifiers (MIDs), that are used to specifically tag unique samples in a sequencing run. Sequence should be reported in uppercase letters" data-commonname="" data-example="GTGAATAT">
                <label>
                    <input type="checkbox" name="mid"/>
                    mid
                </label>
            </div>
            <div class="checkbox" data-name="adapters" data-type="" data-description="Adapters provide priming sequences for both amplification and sequencing of the sample-library fragments. Both adapters should be reported; in uppercase letters" data-commonname="" data-example="AATGATACGGCGACCACCGAGATCTACACGCT;CAAGCAGAAGACGGCATACGAGAT">
                <label>
                    <input type="checkbox" name="adapters"/>
                    adapters
                </label>
            </div>
            <div class="checkbox" data-name="pcr_cond" data-type="" data-description="Description of reaction conditions and components of PCR in the form of ´initial denaturation:94degC_1.5min; annealing=..." data-commonname="" data-example="initial denaturation: 94_3;<br>annealing: 50_1;<br>elongation: 72_1.5;<br>final elongation: 72_10;<br>35">
                <label>
                    <input type="checkbox" name="pcr_cond"/>
                    pcr_cond
                </label>
            </div>
            <div class="checkbox" data-name="seq_meth" data-type="" data-description="Sequencing method used; e.g. Sanger, ABI-solid" data-commonname="" data-example="Illumina HiSeq 1500">
                <label>
                    <input type="checkbox" name="seq_meth"/>
                    seq_meth
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
            <div class="checkbox" data-name="tax_ident" data-type="" data-description="The phylogenetic marker(s) used to assign an organism name to the SAG or MAG" data-commonname="" data-example="other: rpoB gene">
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
            <div class="checkbox" data-name="assembly_name" data-type="" data-description="Name/version of the assembly provided by the submitter that is used in the genome browsers and in the community" data-commonname="" data-example="HuRef,<br>JCVI_ISG_i3_1.0">
                <label>
                    <input type="checkbox" name="assembly_name"/>
                    assembly_name
                </label>
            </div>
            <div class="checkbox" data-name="assembly_software" data-type="" data-description="Tool(s) used for assembly, including version number and parameters" data-commonname="" data-example="metaSPAdes;3.11.0;kmer set 21,33,55,77,99,121, default parameters otherwise">
                <label>
                    <input type="checkbox" name="assembly_software"/>
                    assembly_software
                </label>
            </div>
            <div class="checkbox" data-name="annot" data-type="" data-description="Tool used for annotation, or for cases where annotation was provided by a community jamboree or model organism database rather than by a specific submitter" data-commonname="" data-example="prokka">
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
            <div class="checkbox" data-name="otu_class_appr" data-type="" data-description="Cutoffs and approach used when clustering new UViGs in 'species-level' OTUs. Note that results from standard 95% ANI / 85% AF clustering should be provided alongside OTUS defined from another set of thresholds, even if the latter are the ones primarily used during the analysis" data-commonname="" data-example="95% ANI;85% AF; greedy incremental clustering">
                <label>
                    <input type="checkbox" name="otu_class_appr"/>
                    otu_class_appr
                </label>
            </div>
            <div class="checkbox" data-name="otu_seq_comp_appr" data-type="" data-description="Tool and thresholds used to compare sequences when computing 'species-level' OTUs" data-commonname="" data-example="blastn;2.6.0+;e-value cutoff: 0.001">
                <label>
                    <input type="checkbox" name="otu_seq_comp_appr"/>
                    otu_seq_comp_appr
                </label>
            </div>
            <div class="checkbox" data-name="otu_db" data-type="" data-description="Reference database (i.e. sequences not generated as part of the current study) used to cluster new genomes in 'species-level' OTUs, if any" data-commonname="" data-example="NCBI Viral RefSeq;83">
                <label>
                    <input type="checkbox" name="otu_db"/>
                    otu_db
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
            <div class="checkbox" data-name="sop" data-type="" data-description="Standard operating procedures used in assembly and/or annotation of genomes, metagenomes or environmental sequences" data-commonname="" data-example="http://press.igsb.anl.gov/earthmicrobiome/protocols-and-standards/its/">
                <label>
                    <input type="checkbox" name="sop"/>
                    sop
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_forward" data-type="" data-description="Forward PCR primer that were used to amplify the sequence of the targeted gene, locus or subfragment. If multiple multiple forward or reverse primers are present in a single PCR reaction, there should be a full row for each of these linked to the same DWC Occurrence. The primer sequence should be reported in uppercase letters" data-commonname="" data-example="GTCGGTAAAACTCGTGCCAGC">
                <label>
                    <input type="checkbox" name="pcr_primer_forward"/>
                    pcr_primer_forward
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_reverse" data-type="" data-description="Reverse PCR primer that were used to amplify the sequence of the targeted gene, locus or subfragment. If multiple multiple forward or reverse primers are present in a single PCR reaction, there should be a full row for each of these linked to the same DWC Occurrence. The primer sequence should be reported in uppercase letters" data-commonname="" data-example="CATAGTGGGGTATCTAATCCCAGTTTG">
                <label>
                    <input type="checkbox" name="pcr_primer_reverse"/>
                    pcr_primer_reverse
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_name_forward" data-type="" data-description="Name of the forward PCR primer that were used to amplify the sequence of the targeted gene, locus or subfragment. If multiple multiple forward or reverse primers are present in a single PCR reaction, there should be a full row for each of these linked to the same DWC Occurrence." data-commonname="" data-example="MiFishU-F">
                <label>
                    <input type="checkbox" name="pcr_primer_name_forward"/>
                    pcr_primer_name_forward
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_name_reverse" data-type="" data-description="Name of the reverse PCR primer that were used to amplify the sequence of the targeted gene, locus or subfragment. If multiple multiple forward or reverse primers are present in a single PCR reaction, there should be a full row for each of these linked to the same DWC Occurrence." data-commonname="" data-example="MiFishU-R">
                <label>
                    <input type="checkbox" name="pcr_primer_name_reverse"/>
                    pcr_primer_name_reverse
                </label>
            </div>
            <div class="checkbox" data-name="pcr_primer_reference" data-type="" data-description="Reference for the PCR primers that were used to amplify the sequence of the targeted gene, locus or subfragment." data-commonname="" data-example="https://doi.org/10.1186/1742-9994-10-34">
                <label>
                    <input type="checkbox" name="pcr_primer_reference"/>
                    pcr_primer_reference
                </label>
            </div>
            <div class="checkbox" data-name="DNA_sequence" data-type="" data-description="The DNA sequence" data-commonname="" data-example="TCTATCCTCAATTATAGGTCATAATTCACCATCAGTAGATTTAGGAATTTTCTCTATTCATATTGCAGGTGTATCATCAATTATAGGATCAATTAATTTTATTGTAACAATTTTAAATATACATACAAAAACTCATTCATTAAACTTTTTACCATTATTTTCATGATCAGTTCTAGTTACAGCAATTCTCCTTTTATTATCATTA">
                <label>
                    <input type="checkbox" name="DNA_sequence"/>
                    DNA_sequence
                </label>
            </div>
        </fieldset>
        `;
    }

    $("#extensionFieldset").html(fieldsetContent);
}