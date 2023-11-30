var checkboxNames = [];

$(document).ready(function() {

    // 收集從後端傳來的欄位名稱
    $(".checkbox-name").each(function() {
        var name = $(this).data("checkbox-name");
        checkboxNames.push(name);
    });

    // 收集完之後初始化編輯表格
    if (checkboxNames.length > 0) {
        initializeHandsontable();
    }

    // 按鈕事件：新增一列
    $('#add-row').click(function () {
        window.addRow(); 
    });

    // 按鈕事件：新增十列
    $('#add-ten-rows').click(function () {
        window.addTenRow(); 
    });

    // 按鈕事件：刪除指定列
    $('#delete-row').click(function () {
        window.deleteRow(); 
    });

    // 按鈕事件：獲取行資料
    $('#get-data-col').click(function () {
        window.getDataCol(); 
    });

    // 按鈕事件：下一步（獲取表格資料，轉跳到資料驗證頁面）
    $('.next-btn').click(function () {
        window.getData();
    });

    $('.xx').on('click', function (event) {
        $('.popup-container').addClass('d-none');
    }) 
});

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
function updateColContent(colData) {
    if (colData && colData.length > 0) {
        var elementCounts = {};

        // 計算每個數值的出現次數
        colData.forEach(function(value) {
            elementCounts[value] = (elementCounts[value] || 0) + 1;
        });

        // 生成 HTML
        var htmlContent = '<ul>';
        for (var element in elementCounts) {
            if (elementCounts.hasOwnProperty(element)) {
                htmlContent += '<li>' + element + ': ' + elementCounts[element] + '</li>';
            }
        }
        htmlContent += '</ul>';

        // $('.col-content').html(htmlContent);
    } else {
        console.log('no data');
        $('.col-content').html('No Data');
    }
};

// 功能：初始化編輯表格
function initializeHandsontable() {
    var container = document.getElementById('grid');
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
        height: 'auto',
        // Header 開啟過濾功能
        filters: true,
        // Header 開啟 menu
        dropdownMenu: true,
        selectionMode: 'multiple',
        licenseKey: 'non-commercial-and-evaluation'
    });

    // 取得被選取的行、列的 index
    hot.updateSettings({
        afterSelectionEnd: function(r, c, r2, c2) {
            selectedRow = hot.toPhysicalRow(r);
            selectedColumn = hot.toPhysicalColumn(c);
        }
    });

    // 新增一列
    window.addRow = function() {
        hot.alter('insert_row_below', 1, 1);
    };
    
    // 新增十列
    window.addTenRow = function () {
        hot.alter('insert_row_below', 1, 10);
    };
    
    // 刪除指定列
    window.deleteRow = function () {
        // console.log(selectedRow)
        hot.alter('remove_row', selectedRow);   
    };

    // 獲取行資訊
    window.getDataCol = function () {
        if (typeof selectedColumn !== 'undefined') {
            console.log(selectedColumn);
            const colData = hot.getDataAtCol(selectedColumn);
            const colName = hot.getColHeader(selectedColumn);
            console.log(colData);
            console.log(colName);
            updateColContent(colData); 
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


