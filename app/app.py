from flask import Flask, render_template, request, redirect, session, url_for
import os
import pandas as pd

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)

@app.route('/')
def homepage():
    return render_template('base.html')

@app.route('/data-template', methods=['GET', 'POST'])
def data_template():
    if request.method == 'POST':
        data = request.get_json()
        checkbox_names = data['checkbox_names']
        app.logger.info(f'checkbox_names in data_template: {checkbox_names}')
        session['checkbox_names'] = checkbox_names
        return redirect('/data-edit')
    else:
        return render_template('data-template.html')

@app.route('/data-edit', methods=['GET', 'POST'])
def data_edit():
    checkbox_names = session.get('checkbox_names', [])
    app.logger.info(f'checkbox_names in data_edit: {checkbox_names}')
    return render_template('data-edit.html', checkbox_names=checkbox_names)

@app.route('/process-validation', methods=['POST'])
def process_validation():
    controlled_column_stats = {}
    unique_column_stats = {}
    lon_lat_stats = {}

    if request.method == 'POST':
        data = request.get_json()
        table_header = data['table_header']
        table_data = data['table_data']
        # app.logger.info(f'header: {table_header}, data: {table_data}')

        # *****開始清理流程*****
        df = pd.DataFrame(table_data, columns=table_header)
        app.logger.info(df)

        CONTROLLED_VOCABULARY_COLUMNS = ['basisOfRecord', 'type', 'occurrenceStatus', 'continent']
        UNIQUE_ID_COLUMNS = ['occurrenceID', 'taxonID', 'samp_name']
        LON_LAT_COLUMNS = ['decimalLongitude', 'decimalLatitude']

        TOTAL_ROWS = len(df) # 計算空白值會用到

        # *****檢查控制詞彙欄位*****
        common_columns = set(table_header) & set(CONTROLLED_VOCABULARY_COLUMNS)
        for col in common_columns:
            if col == 'basisOfRecord':
                valid_values = ['MaterialEntity', 'PreservedSpecimen', 'FossilSpecimen', 'LivingSpecimen', 'MaterialSample', 'Event', 'HumanObservation', 'MachineObservation', 'Taxon', 'Occurrence', 'MaterialCitation']
                error_message = 'Basis of record invalid'
            elif col == 'type':
                valid_values = ['Collection', 'Dataset', 'Event', 'Image', 'MovingImage', 'PhysicalObject', 'Sound', 'StillImage', 'Text']
                error_message = 'Type status invalid'
            elif col == 'occurrenceStatus':
                valid_values = ['absent', 'present']
                error_message = 'Occurrence status invalid'
            elif col == 'continent':
                valid_values = ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']
                error_message = 'Continent invalid'
            
            # 檢查欄位值是否在 valid_values 中
            invalid_rows = df[~df[col].isin(valid_values)]
            blank_rows = df[df[col].isna()]

            # 計算統計資訊
            valid_rows = TOTAL_ROWS - len(invalid_rows) # None 會直接算到 invalid_rows 裡面，所以不扣 blank
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_percentage = (valid_rows / TOTAL_ROWS) * 100

            # 提取不符合的值和索引號
            invalid_values = invalid_rows[col].tolist()
            invalid_indexes = (invalid_rows.index + 1).tolist() # pandas 從 0 開始，但 Handsontable 從 1 開始

            # 儲存統計結果到字典
            controlled_column_stats[col] = {
                'counts_rows': counts_rows,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'values': invalid_values,
                    'indexes': invalid_indexes,
                },
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'error_message': error_message
            }
        
        app.logger.info(controlled_column_stats)

        # *****檢查單一值欄位*****
        unique_columns = set(table_header) & set(UNIQUE_ID_COLUMNS)
        for col in unique_columns:
            is_unique = df[col].is_unique

            if is_unique:
                invalid_rows = 0
                valid_rows = TOTAL_ROWS 
                valid_percentage = 100
                error_message = None
                
                unique_column_stats[col] = {
                    'total_rows': TOTAL_ROWS,
                    'invalid_rows': invalid_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'index_numbers_of_invalid_rows': None,
                    'error_message': error_message
                }
            else:
                duplicated_values = df[df.duplicated(subset=col, keep=False)]

                # 對 values 進行排序，同時保持 index 的對應關係
                # pandas 從 0 開始，但 Handsontable 從 1 開始
                sorted_pairs = sorted(zip(duplicated_values.index + 1, duplicated_values[col]), key=lambda x: x[1])
                # 拆分回 index 和 value
                sorted_indexes, sorted_values = zip(*sorted_pairs)

                invalid_rows = len(duplicated_values)
                valid_rows = TOTAL_ROWS - invalid_rows
                valid_percentage = (valid_rows / TOTAL_ROWS) * 100
                error_message = f'{col} is not unique'

                unique_column_stats[col] = {
                    'total_rows': TOTAL_ROWS,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': list(sorted_values),
                        'indexes': list(sorted_indexes),
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

        # *****檢查經緯度欄位*****
        lon_lat_columns = set(table_header) & set(LON_LAT_COLUMNS)
        for col in lon_lat_columns:
            if col == 'decimalLongitude':
                df['decimalLongitude'] = pd.to_numeric(df['decimalLongitude'], errors='coerce')
                invalid_longitude_rows = df[(df['decimalLongitude'] < -180) | (df['decimalLongitude'] > 180)]
                blank_rows = df[df[col].isna()]

                invalid_rows = len(invalid_longitude_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows)
                valid_percentage = (valid_rows / TOTAL_ROWS) * 100
                error_message = 'Longitude out of range'

                lon_lat_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': invalid_longitude_rows['decimalLongitude'].tolist(),
                        'indexes': (invalid_longitude_rows.index + 1).tolist(),
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

            elif col == 'decimalLatitude':
                df['decimalLatitude'] = pd.to_numeric(df['decimalLatitude'], errors='coerce')
                invalid_latitude_rows = df[(df['decimalLatitude'] < -90) | (df['decimalLatitude'] > 90)]
                blank_rows = df[df[col].isna()]

                invalid_rows = len(invalid_latitude_rows)
                valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = (valid_rows / TOTAL_ROWS) * 100
                error_message = 'Latitude out of range'

                lon_lat_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': invalid_latitude_rows['decimalLatitude'].tolist(),
                        'indexes': (invalid_latitude_rows.index + 1).tolist(),
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

        app.logger.info(lon_lat_stats)

    session['controlled_column_stats'] = controlled_column_stats
    session['unique_column_stats'] = unique_column_stats
    session['lon_lat_stats'] = lon_lat_stats
        
    return redirect(url_for('data_validation'))

@app.route('/data-validation', methods=['GET'])
def data_validation():
    controlled_column_stats = session.get('controlled_column_stats')
    unique_column_stats = session.get('unique_column_stats')
    lon_lat_stats = session.get('lon_lat_stats')
    
    return render_template('data-validation.html', 
                           controlled_column_stats=controlled_column_stats, 
                           unique_column_stats=unique_column_stats, 
                           lon_lat_stats=lon_lat_stats)



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
