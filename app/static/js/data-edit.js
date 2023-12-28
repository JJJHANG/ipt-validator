var checkboxNames = [];

$(document).ready(function() {
    $(function(){
        var $li = $('ul.tab-title li');
            $($li. eq(0) .addClass('active').find('a').attr('href')).siblings('.tab-inner').hide();
        
            $li.click(function(){
                $($(this).find('a'). attr ('href')).show().siblings ('.tab-inner').hide();
                $(this).addClass('active'). siblings ('.active').removeClass('active');
            });
        });

    // var example = document.getElementById('example1');
    // var hot1 = new Handsontable(example, {
    //     data: Handsontable.helper.createSpreadsheetData(100000, 20), //row, columns
    //     colWidths: 100,
    //     width: '100%',
    //     dropdownMenu: true,
    //     filters: true,
    //     height: 320,
    //     rowHeights: 23,
    //     rowHeaders: true,
    //     colHeaders: true
    // });

    // *deprecated* 按鈕事件：新增十列  
    // $('#add-ten-rows').click(function () {
    //     window.addTenRow(); 
    // });

    // *deprecated* 按鈕事件：刪除指定列  
    // $('#delete-row').click(function () {
    //     window.deleteRow(); 
    // });


    // 收集從後端傳來的欄位名稱
    $(".checkbox-name").each(function() {
        var name = $(this).data("checkbox-name");
        checkboxNames.push(name);
    });

    // 收集完之後初始化編輯表格
    if (checkboxNames.length > 0) {
        initializeHandsontable();
    }

    // 按鈕事件：新增列在表格底部
    $('#add-row').click(function () {
        const insertRowNumber = $('#insert-row-number').val()
        window.addRow(insertRowNumber); 
    });

    // 按鈕事件：獲取行資料
    $('#get-data-col').click(function () {
        window.getDataCol(); 
    });

    // 按鈕事件：下一步（獲取表格資料，轉跳到資料驗證頁面）
    $('.next-btn').click(function () {
        window.getData();
    });

    // 按鈕事件：上一步
    $('.back-btn').click(function () {
        window.history.back();
    });

    // 按鈕事件：匯入資料
    $('.import-btn').click(function () {
        $('#import-file').click();
    });

    $('#import-file').change(function() {
        var inputCSV = $(this)[0];
        if (inputCSV.files.length > 0) {
            var formData = new FormData();
            formData.append('file', inputCSV.files[0]);

            $.ajax({
                type: 'POST',
                url: '/convert-csv-to-json',
                contentType: false,
                processData: false,
                data: formData,
                success: (data) => {
                    if (JSON.stringify(data[0]) === JSON.stringify(checkboxNames)) {
                        initializeHandsontable(data);
                    } else {
                        $('.columns-issue-popup').removeClass('d-none');
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log('Error:', textStatus, errorThrown);
                }
            })
        }
    });


    $('.xx').on('click', function (event) {
        $('.popup-container').addClass('d-none');
    }) 
});

// 功能：測試匯入資料
// function updateHandsontable(data) {
//     var container = document.getElementById('grid');
//     var hot2 = new Handsontable(container, {
//         colHeaders: data[0],
//         rowHeaders: true,
//         width: '100%',
//         height: '100%',
//         licenseKey: 'non-commercial-and-evaluation'
//     });
//     hot2.loadData(data.slice(1));
// }

// 功能：把編輯表格的資料傳遞到後端
function transferDataToBackend (getColHeader, getData) {
    $.ajax({
        type: "POST",
        url: "/process-validation", // 給 process-validation 處理驗證過程
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify({ 'table_header': getColHeader, 'table_data': getData }),
        success: function(data) {
            console.log("Data submitted.");
            window.location.href = "/data-validation"; // 轉跳到 data-validation 呈現驗證結果
        },
        error: function () {
            $('.unknown-error-popup').removeClass('d-none');
            console.error("Failed to submit data.");
        },
    })
}

// 功能：處理 按鈕事件：獲取行資訊 的細節
function updateColContent(colName, colData) {
    if (colData && colData.length > 0) {
        $('.col-content').removeClass('d-none');
        var elementCounts = {};

        // 計算每個數值的出現次數
        colData.forEach(function(value) {
            elementCounts[value] = (elementCounts[value] || 0) + 1;
        });

        // 生成 HTML
        var htmlContent = '<div class="col-name">' + colName + '</div><ul>';
        for (var element in elementCounts) {
            if (elementCounts.hasOwnProperty(element)) {
                htmlContent += '<li class="facet-content"><span>' + element + '</span><span class="facet-content-number"> ' + elementCounts[element] + '</span></li>';
            }
        }
        htmlContent += '</ul>';

        $('.col-content').html(htmlContent);
    } else {
        console.log('no data');
        $('.col-content').html('No Data');
    }
};

// 功能：初始化編輯表格
function initializeHandsontable(data) {
    var container = document.getElementById('grid');
    if (data) {
        var hot = new Handsontable(container, {
            colHeaders: data[0],
            columns: checkboxNames.map(function (name) { // 設定前驗證檢查的格式
                if (name === 'basisOfRecord') {
                    return {
                        type: 'dropdown',
                        source: ['MaterialEntity', 'PreservedSpecimen', 'FossilSpecimen', 'LivingSpecimen', 'MaterialSample', 'Event', 'HumanObservation', 'MachineObservation', 'Taxon', 'Occurrence', 'MaterialCitation'],  
                    };
                } else if (name === 'type') {
                    return {
                        type: 'dropdown',
                        source: ['Collection', 'Dataset', 'Event', 'Image', 'MovingImage', 'PhysicalObject', 'Sound', 'StillImage', 'Text'],  
                    };
                } else if (name === 'occurrenceStatus') {
                    return {
                        type: 'dropdown',
                        source: ['absent', 'present'],  
                    };
                } else if (name === 'continent') {
                    return {
                        type: 'dropdown',
                        source: ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],  
                    };
                } else if (name === 'language') {
                    return {
                        type: 'dropdown',
                        source: ['en', 'zh-TW'],  
                    };
                } else if (name === 'license') {
                    return {
                        type: 'dropdown',
                        source: ['CC0 1.0', 'CC BY 4.0', 'CC BY-NC 4.0', '無授權標示', '無法辨識'],  
                    };
                } else if (name === 'sex') {
                    return {
                        type: 'dropdown',
                        source: ['female', 'male', 'hermaphrodite'],  
                    };
                } else if (name === 'establishmentMeans') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'nativeReintroduced', 'introduced', 'introducedAssistedColonisation', 'vagrant', 'uncertain'],  
                    };
                } else if (name === 'degreeOfEstablishment') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'captive', 'cultivated', 'released', 'failing', 'casual', 'reproducing', 'established', 'colonising', 'invasive', 'widespreadInvasive'],  
                    };
                } else if (name === 'typeStatus') {
                    return {
                        type: 'dropdown',
                        source: ['holotype', 'paratype', 'isotype', 'allotype', 'syntype', 'lectotype', 'paralectotype', 'neotype', 'topotype'],  
                    };
                } else if (name === 'decimalLongitude') {
                    return {
                        type: 'numeric',
                    };
                } else if (name === 'decimalLatitude') {
                    return {
                        type: 'numeric',
                    };
                } else {
                    return {};
                }
            }),
    
            minRows: 1,
            rowHeaders: true,
            width: '100%',
            height: '100%',
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: ['row_above', 'row_below', '---------', 'remove_row', '---------', 'undo', 'redo', '---------', 'make_read_only', '---------', 'copy', 'cut'],
            selectionMode: 'multiple',
            language: 'zh-TW',
            licenseKey: 'non-commercial-and-evaluation'
        });
        hot.loadData(data.slice(1));
    } else {
        var hot = new Handsontable(container, {
            colHeaders: checkboxNames,
            columns: checkboxNames.map(function (name) { // 設定前驗證檢查的格式
                if (name === 'basisOfRecord') {
                    return {
                        type: 'dropdown',
                        source: ['MaterialEntity', 'PreservedSpecimen', 'FossilSpecimen', 'LivingSpecimen', 'MaterialSample', 'Event', 'HumanObservation', 'MachineObservation', 'Taxon', 'Occurrence', 'MaterialCitation'],  
                    };
                } else if (name === 'type') {
                    return {
                        type: 'dropdown',
                        source: ['Collection', 'Dataset', 'Event', 'Image', 'MovingImage', 'PhysicalObject', 'Sound', 'StillImage', 'Text'],  
                    };
                } else if (name === 'occurrenceStatus') {
                    return {
                        type: 'dropdown',
                        source: ['absent', 'present'],  
                    };
                } else if (name === 'continent') {
                    return {
                        type: 'dropdown',
                        source: ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],  
                    };
                } else if (name === 'language') {
                    return {
                        type: 'dropdown',
                        source: ['en', 'zh-TW'],  
                    };
                } else if (name === 'license') {
                    return {
                        type: 'dropdown',
                        source: ['CC0 1.0', 'CC BY 4.0', 'CC BY-NC 4.0', '無授權標示', '無法辨識'],  
                    };
                } else if (name === 'sex') {
                    return {
                        type: 'dropdown',
                        source: ['female', 'male', 'hermaphrodite'],  
                    };
                } else if (name === 'establishmentMeans') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'nativeReintroduced', 'introduced', 'introducedAssistedColonisation', 'vagrant', 'uncertain'],  
                    };
                } else if (name === 'degreeOfEstablishment') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'captive', 'cultivated', 'released', 'failing', 'casual', 'reproducing', 'established', 'colonising', 'invasive', 'widespreadInvasive'],  
                    };
                } else if (name === 'typeStatus') {
                    return {
                        type: 'dropdown',
                        source: ['holotype', 'paratype', 'isotype', 'allotype', 'syntype', 'lectotype', 'paralectotype', 'neotype', 'topotype'],  
                    };
                } else if (name === 'decimalLongitude') {
                    return {
                        type: 'numeric',
                    };
                } else if (name === 'decimalLatitude') {
                    return {
                        type: 'numeric',
                    };
                } else if (name === 'eventDate') {
                    return {
                        validator: 'custom-date-validator',
                    };
                } else if (name === 'individualCount') {
                    return {
                        validator: 'custom-int-validator',
                    };
                }  else if (name === 'year') {
                    return {
                        validator: 'custom-int-validator',
                    };
                }  else if (name === 'month') {
                    return {
                        validator: 'custom-int-validator',
                    };
                }  else if (name === 'day') {
                    return {
                        validator: 'custom-int-validator',
                    };
                } else {
                    return {};
                }
            }),
    
            minRows: 1,
            rowHeaders: true,
            width: '100%',
            height: '100%',
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: ['row_above', 'row_below', '---------', 'remove_row', '---------', 'undo', 'redo', '---------', 'make_read_only', '---------', 'copy', 'cut'],
            selectionMode: 'multiple',
            language: 'zh-TW',
            licenseKey: 'non-commercial-and-evaluation'
        });
    }

    (function(Handsontable){
        function dateValidator(value, callback) {
            // 檢查是否是有效的日期格式
            if (isValidDate(value)) {
                callback(true);  // 如果是有效的日期格式，回傳true
            } else {
                callback(false); // 如果不是有效的日期格式，回傳false
            }
        }

        function positiveIntegerValidator(value, callback) {
            const positiveIntRegex = /^[1-9]\d*$/;  // 以非零開頭的數字序列
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
            return ISO2014.test(dateStr) || ISO2014_var.test(dateStr) || ISO8601.test(dateStr) || ISO8601_var.test(dateStr) || ISO8601_var2.test(dateStr) || dateRange.test(dateStr) || dateRange_var2.test(dateStr);
        }

        Handsontable.validators.registerValidator('custom-date-validator', dateValidator);
        Handsontable.validators.registerValidator('custom-int-validator', positiveIntegerValidator);

    })(Handsontable);

    // 取得被選取的行、列的 index
    hot.updateSettings({
        afterSelectionEnd: function(r, c, r2, c2) {
            selectedRow = hot.toPhysicalRow(r);
            selectedColumn = hot.toPhysicalColumn(c);
        }
    });

    // 新增自訂列
    window.addRow = function(insertRowNumber) {
        const totalRows = hot.countRows();
        hot.alter('insert_row_below', totalRows, insertRowNumber);
    };
    
    // *deprecated* 新增十列
    // window.addTenRow = function () {
    //     hot.alter('insert_row_below', 1, 10);
    // };
    
    // *deprecated* 刪除指定列
    // window.deleteRow = function () {
    //     // console.log(selectedRow)
    //     hot.alter('remove_row', selectedRow);   
    // };

    // 獲取行資訊
    window.getDataCol = function () {
        if (typeof selectedColumn !== 'undefined') {
            console.log(selectedColumn);
            const colData = hot.getDataAtCol(selectedColumn);
            const colName = hot.getColHeader(selectedColumn);
            console.log(colData);
            console.log(colName);
            updateColContent(colName, colData); 
        } else {
            $('.duplicated-popup').removeClass('d-none');
        } 
        selectedColumn = undefined; // 事件觸發之後重置 index
    }; 
    
    // 獲取表格資料
    window.getData = function () {
        const getData = hot.getData();  
        const getHeader = hot.getColHeader();  
        console.log(getHeader);
        console.log(getData);
        transferDataToBackend(getHeader, getData); 
    };
    
    // 下載表格資料
    const exportButton = document.querySelector('.export-data-btn');
    const exportPlugin = hot.getPlugin('exportFile');
    
    exportButton.addEventListener('click', () => {
        exportPlugin.downloadFile('csv', {
            bom: false,
            columnDelimiter: ',',
            columnHeaders: true,
            exportHiddenColumns: true,
            exportHiddenRows: true,
            fileExtension: 'csv',
            filename: 'Handsontable-CSV-file_[YYYY]-[MM]-[DD]',
            mimeType: 'text/csv',
            rowDelimiter: '\r\n',
            rowHeaders: true
        });
    });
};

