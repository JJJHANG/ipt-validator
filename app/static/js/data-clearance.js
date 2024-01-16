var handsontableInstances = {};
var containerID;
var colName;
var rowIndexes;
var columnIndex;

$(document).ready(function() {

    function highlightRow (containerID, row) {
        const hotInstance = handsontableInstances[containerID];
        const columns = hotInstance.countCols();

        for (let col = 0; col < columns; col++) {
            hotInstance.setCellMeta(row, col, 'className', 'highlight-cell');
        }
        hotInstance.render();
    };

    // IndexedDB instance
    var request = window.indexedDB.open('IndexedDB', 1);
    var db;

    request.onsuccess = function (event) {
        db = request.result;
        console.log('IndexedDB: Database up');

        var transaction = db.transaction(['saved_data'], 'readonly');
        var objectStore = transaction.objectStore('saved_data');
        var getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = function(event) {
            if (getAllRequest.result && getAllRequest.result.length > 0) {
            
                getAllRequest.result.forEach(function(item) {
                    // console.log(item);
                    const containerID = 'grid-' + item.template_name
                    const checkboxNames = item.checkbox_names
                    const data = [checkboxNames].concat(item.data);

                    $('#' + containerID).html('');
                    initializeHandsontable(containerID, checkboxNames, data);

                    const errorrMessageID = item.template_name + '-error-message'
                    $(`#${errorrMessageID} .accordion-table`).each(function () {
                        const $table = $(this);
                        
                        $table.find('tbody tr').each(function () {
                            const $row = $(this);
                            const rowIndex = $row.find('td:first-child').text(); 

                            highlightRow(containerID, rowIndex - 1);
                        });

                        // const columnNames = $table.find('thead th:last').map(function (index) {
                        //     const columnName = $(this).text();
                        //     console.log(columnName);
                        //     const elementscolumnName = $(`#${containerID} span.colHeader:contains(${columnName})`);
                        //     const columnIndex = elementscolumnName.parents('th').attr('aria-colindex')
                        // }).get();
                    });                    

                    console.log('IndexedDB: Render saved_data,', item.template_name);
                });
            } else {
                console.log('IndexedDB: No saved_data yet')
            }
        };

        getAllRequest.onerror = function(event) {
            console.log('IndexedDB: No saved_data yet')
        }
    };

    var $li = $('ul.tab-title li');

    $('.tab-inner').hide();

    // 初始化第一個 li 為 active
    $($li.eq(0).addClass('active now').find('a').attr('href')).siblings('.tab-inner').hide();
    $li.filter('.active:first').find('.editing-mark').removeClass('d-none');

    // 對於具有 active 屬性的 li，顯示其所有相對應的 tab-inner
    $li.each(function() {
        if ($(this).hasClass('active')) {
            var targets = $(this).data('targets').split(', ');
            $(targets.join(', ')).show();
        }
    });

    $li.click(function() {
        // 隱藏所有的 tab-inner
        $('.tab-inner').hide();
        $li.removeClass('active now');
    
        // 獲取點擊的 li 的 data-targets 屬性值
        var targets = $(this).data('targets').split(', ');
    
        // 顯示與當前點擊的 li 相對應的所有 tab-inner
        $(targets.join(', ')).show();
    
        // 切換 active 狀態
        $(this).addClass('active now');
        $(this).siblings('.active').removeClass('active now');
    
        // 顯示當前點擊的 li 中的 editing-mark
        if ($(this).hasClass('active')) {
            $(this).find('.editing-mark').removeClass('d-none');
        } 
    
        $li.each(function() {
            if (!$(this).hasClass('active')) {
                $(this).find('.editing-mark').addClass('d-none');
            }
        });
    });

    $('.error-message-box').click(function() {
        var accordionMenu = $(this).next('.accordion-menu');

        if (accordionMenu.hasClass('d-none')) { // 如果是折疊狀態，展開自己、折疊其他
            accordionMenu.removeClass('d-none');
            $('.accordion-menu').not(accordionMenu).addClass('d-none');
        } else { // 如果是展開狀態、折疊自己以及其他
            accordionMenu.addClass('d-none');
            $(this).siblings('.error-message-box').find('.accordion-menu').addClass('d-none');
        }
    });

    // 按鈕事件：內容篩選功能
    $('.text-facet-button').click(function() {

        getDataCol = function (containerID, selectedColumn) {
            if (typeof selectedColumn !== 'undefined' && selectedColumn.length !== 0) {
                console.log(selectedColumn);
                const colData = handsontableInstances[containerID].getDataAtCol(selectedColumn);
                colName = handsontableInstances[containerID].getColHeader(selectedColumn);
                console.log(colData);
                console.log(colName);
                updateColContent(colName, colData); 
            } else {
                $('.duplicated-popup').removeClass('d-none');
            } 
            selectedColumn = undefined; // 事件觸發之後重置 index
        };

        var buttonID = $(this).attr('id');
        var dataName = $(this).data('name');
        console.log('點擊的按鈕的ID為:', buttonID);
        console.log('點擊的按鈕的dataName為:', dataName);
    
        containerID = 'grid-' + dataName;
        if (handsontableInstances[containerID]) { // 確保 containerID 的 Handsontable 實例存在
            // console.log(selectedColumn);
            getDataCol(containerID, selectedColumn); 
        } else {
            console.error("Handsontable instance for containerID '" + containerID + "' not found.");
        }
    });

    $('.xx').on('click', function (event) {
        $('.popup-container').addClass('d-none');
    });

    $(document).on('click', '.text-facet-content', function () {
        // console.log($(this).find('span:first-child').text());
        $('.text-facet-popup').removeClass('d-none');
        $('#text-facet-input').val($(this).find('span:first-child').text());

        // Find row index
        var targetContent = $(this).find('span:first-child').text();
        var $targetCells = $(`td`).filter(function() {
            return $(this).text().trim() === targetContent.trim();
        });
    
        if ($targetCells.length > 0) {
            rowIndexes = $targetCells.map(function() {
                return $(this).parents('tr').attr('aria-rowindex');
            }).get();
        } 

        // Find Column index
        var targetColumn = $(`#${containerID} span.colHeader:contains(${colName})`);
        columnIndex = targetColumn.parents('th').attr('aria-colindex')
    });

    $(document).on('click', '#text-facet-check', function () {
        // console.log(containerID, columnIndex, rowIndexes);
        const revisedValue = $('#text-facet-input').val();
        rowIndexes.forEach(function(rowIndex) {
            if (handsontableInstances[containerID]) {
                handsontableInstances[containerID].setDataAtCell(rowIndex - 2, columnIndex - 2, revisedValue);
            }
        });
        $('.text-facet-popup').addClass('d-none');
        $('.col-content').addClass('d-none');
    });
});

// 功能：初始化編輯表格
function initializeHandsontable(containerID, checkboxNames, data) {
    var container = document.getElementById(containerID);
    if (data) {
        var hot = new Handsontable(container, {
            colHeaders: data[0],
            columns: checkboxNames.map(function (name) { // 設定前驗證檢查的格式
                if (name === 'basisOfRecord') {
                    return {
                        type: 'dropdown',
                        source: ['MaterialEntity', 'PreservedSpecimen', 'FossilSpecimen', 'LivingSpecimen', 'MaterialSample', 'Event', 'HumanObservation', 'MachineObservation', 'Taxon', 'Occurrence', 'MaterialCitation'],
                        trimDropdown: false  
                    };
                } else if (name === 'type') {
                    return {
                        type: 'dropdown',
                        source: ['Collection', 'Dataset', 'Event', 'Image', 'MovingImage', 'PhysicalObject', 'Sound', 'StillImage', 'Text'],
                        trimDropdown: false  
                    };
                } else if (name === 'occurrenceStatus') {
                    return {
                        type: 'dropdown',
                        source: ['absent', 'present'],  
                        trimDropdown: false
                    };
                } else if (name === 'continent') {
                    return {
                        type: 'dropdown',
                        source: ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],  
                        trimDropdown: false
                    };
                } else if (name === 'language') {
                    return {
                        type: 'dropdown',
                        source: ['en', 'zh-TW'],  
                        trimDropdown: false
                    };
                } else if (name === 'license') {
                    return {
                        type: 'dropdown',
                        source: ['CC0 1.0', 'CC BY 4.0', 'CC BY-NC 4.0', 'No license'],
                        trimDropdown: false  
                    };
                } else if (name === 'sex') {
                    return {
                        type: 'dropdown',
                        source: ['female', 'male', 'hermaphrodite'],  
                        trimDropdown: false
                    };
                } else if (name === 'establishmentMeans') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'nativeReintroduced', 'introduced', 'introducedAssistedColonisation', 'vagrant', 'uncertain'],  
                        trimDropdown: false
                    };
                } else if (name === 'degreeOfEstablishment') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'captive', 'cultivated', 'released', 'failing', 'casual', 'reproducing', 'established', 'colonising', 'invasive', 'widespreadInvasive'],  
                        trimDropdown: false
                    };
                } else if (name === 'typeStatus') {
                    return {
                        type: 'dropdown',
                        source: ['holotype', 'paratype', 'isotype', 'allotype', 'syntype', 'lectotype', 'paralectotype', 'neotype', 'topotype'], 
                        trimDropdown: false 
                    };
                } else if (name === 'kingdom') {
                    return {
                        type: 'dropdown',
                        source: ['Animalia', 'Archaea', 'Bacteria', 'Chromista', 'Fungi', 'Plantae', 'Protozoa', 'Viruses'], 
                        trimDropdown: false 
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
            // dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
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
                        trimDropdown: false 
                    };
                } else if (name === 'type') {
                    return {
                        type: 'dropdown',
                        source: ['Collection', 'Dataset', 'Event', 'Image', 'MovingImage', 'PhysicalObject', 'Sound', 'StillImage', 'Text'],  
                        trimDropdown: false
                    };
                } else if (name === 'occurrenceStatus') {
                    return {
                        type: 'dropdown',
                        source: ['absent', 'present'],  
                        trimDropdown: false
                    };
                } else if (name === 'continent') {
                    return {
                        type: 'dropdown',
                        source: ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],  
                        trimDropdown: false
                    };
                } else if (name === 'language') {
                    return {
                        type: 'dropdown',
                        source: ['en', 'zh-TW'],  
                        trimDropdown: false
                    };
                } else if (name === 'license') {
                    return {
                        type: 'dropdown',
                        source: ['CC0 1.0', 'CC BY 4.0', 'CC BY-NC 4.0', 'No license'],  
                        trimDropdown: false
                    };
                } else if (name === 'sex') {
                    return {
                        type: 'dropdown',
                        source: ['female', 'male', 'hermaphrodite'],  
                        trimDropdown: false
                    };
                } else if (name === 'establishmentMeans') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'nativeReintroduced', 'introduced', 'introducedAssistedColonisation', 'vagrant', 'uncertain'],  
                        trimDropdown: false
                    };
                } else if (name === 'degreeOfEstablishment') {
                    return {
                        type: 'dropdown',
                        source: ['native', 'captive', 'cultivated', 'released', 'failing', 'casual', 'reproducing', 'established', 'colonising', 'invasive', 'widespreadInvasive'],  
                        trimDropdown: false
                    };
                } else if (name === 'typeStatus') {
                    return {
                        type: 'dropdown',
                        source: ['holotype', 'paratype', 'isotype', 'allotype', 'syntype', 'lectotype', 'paralectotype', 'neotype', 'topotype'], 
                        trimDropdown: false 
                    };
                } else if (name === 'kingdom') {
                    return {
                        type: 'dropdown',
                        source: ['Animalia', 'Archaea', 'Bacteria', 'Chromista', 'Fungi', 'Plantae', 'Protozoa', 'Viruses'], 
                        trimDropdown: false 
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
            startRows: 5,
            rowHeaders: true,
            width: '100%',
            height: 'auto',
            // Header 開啟過濾功能
            filters: true,
            // Header 開啟 menu
            dropdownMenu: true,
            // dropdownMenu: ['clear_column', 'make_read_only', '---------', 'filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            contextMenu: ['row_above', 'row_below', '---------', 'remove_row', '---------', 'undo', 'redo', '---------', 'make_read_only', '---------', 'copy', 'cut', '---------'],
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
        },
        afterChange: function() {
            // 更新列數
            var rowCount = hot.countRows();
            $('#row-count-' + containerID).text('列數：' + rowCount);
        },
        afterCreateRow: function() {
            // 更新列數
            var rowCount = hot.countRows();
            $('#row-count-' + containerID).text('列數：' + rowCount);
        },
        afterRemoveRow: function() {
            // 更新列數
            var rowCount = hot.countRows();
            $('#row-count-' + containerID).text('列數：' + rowCount);
        }
    });

    hot.runHooks('afterChange');
    handsontableInstances[containerID] = hot;
    // console.log(handsontableInstances);
};

function updateColContent(colName, colData) {
    if (colData && colData.length > 0) {
        $('.col-content').removeClass('d-none');
        var elementCounts = {};

        // 計算每個數值的出現次數
        colData.forEach(function(value) {
            elementCounts[value] = (elementCounts[value] || 0) + 1;
        });

        // 生成 HTML
        var htmlContent = '<p>內容篩選</p><div class="col-name">' + colName + '</div><ul>';
        for (var element in elementCounts) {
            if (elementCounts.hasOwnProperty(element)) {
                htmlContent += '<li class="text-facet-content"><span>' + element + '</span><span class="text-facet-content-number"> ' + elementCounts[element] + '</span></li>';
            }
        }
        htmlContent += '</ul>';

        $('.col-content').html(htmlContent);
    } else {
        // console.log('no data');
        $('.col-content').html('No Data');
    }
};