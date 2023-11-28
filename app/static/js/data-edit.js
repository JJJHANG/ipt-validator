var checkboxNames = [];

$(document).ready(function() {

    $(".checkbox-name").each(function() {
        var name = $(this).data("checkbox-name");
        checkboxNames.push(name);
    });

    console.log(checkboxNames);

    if (checkboxNames.length > 0) {
        initializeHandsontable();
    }

    $('#add-row').click(function () {
        window.addRow(); 
    });

    $('#add-ten-rows').click(function () {
        window.addTenRow(); 
    });

    $('#delete-row').click(function () {
        window.deleteRow(); 
    });

    $('#get-data-col').click(function () {
        window.getDataCol(); 
    });

    $('.next-btn').click(function () {
        window.getData();
    });

    $('.xx').on('click', function (event) {
        $('.popup-container').addClass('d-none');
    }) 
});

function transferDataToBackend (getColHeader, getData) {
    $.ajax({
        type: "POST",
        url: "/process-validation",
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify({ 'table_header': getColHeader, 'table_data': getData }),
        success: function(data) {
            console.log("Data submitted.");
            window.location.href = "/data-validation";
        },
        error: function () {
            console.error("Failed to submit data.");
        },
    })
}

function updateColContent(colData) {
    if (colData && colData.length > 0) {
        var elementCounts = {};

        // 計算出現次數
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

        $('.col-content').html(htmlContent);
    } else {
        console.log('no data');
        $('.col-content').html('No Data');
    }
};

function initializeHandsontable() {
    var container = document.getElementById('grid');
    var hot = new Handsontable(container, {
        colHeaders: checkboxNames,
        columns: checkboxNames.map(function (name) {
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
            } else {
                return {};
            }
        }),

        minRows: 1,
        rowHeaders: true,
        width: '100%',
        height: 'auto',
        // enable filtering
        filters: true,
        // enable the column menu
        dropdownMenu: true,
        selectionMode: 'multiple',
        licenseKey: 'non-commercial-and-evaluation'
    });

    hot.updateSettings({
        afterSelectionEnd: function(r, c, r2, c2) {
            selectedRow = hot.toPhysicalRow(r);
            selectedColumn = hot.toPhysicalColumn(c);
        }
    });

    window.addRow = function() {
        hot.alter('insert_row_below', 1, 1);
    };
    
    window.addTenRow = function () {
        hot.alter('insert_row_below', 1, 10);
    };
    
    window.deleteRow = function () {
        console.log(selectedRow)
        hot.alter('remove_row', selectedRow);   
    };

    window.getDataCol = function () {
        if (typeof selectedColumn !== 'undefined') {
            console.log(selectedColumn);
            const colData = hot.getDataAtCol(selectedColumn);
            const colName = hot.getColHeader(selectedColumn);
            console.log(colData);
            console.log(colName);
            updateColContent(colData);
        } else {
            $('.popup-container').removeClass('d-none');
        } 
        selectedColumn = undefined;
    }; 
    
    window.getData = function () {
        const getData = hot.getData();  
        const getHeader = hot.getColHeader();  
        console.log(getHeader);
        console.log(getData);
        transferDataToBackend(getHeader, getData); 
    };
    
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


