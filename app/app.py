from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import os
import pandas as pd
import numpy as np
import datetime

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
        # app.logger.info(f'checkbox_names in data_template: {checkbox_names}')
        session['checkbox_names'] = checkbox_names
        return redirect('/data-edit')
    else:
        return render_template('data-template.html')

@app.route('/convert-csv-to-json', methods=['POST'])
def convert_csv_to_json():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    if file:
        try:
            df = pd.read_csv(file)

            df = df.fillna('')
            df = df.iloc[:, 1:]

            header = df.columns.tolist()
            data = [header] + df.values.tolist()

            return jsonify(data)
        except Exception as e:
            return jsonify({'error': str(e)})

@app.route('/data-edit', methods=['GET', 'POST'])
def data_edit():
    checkbox_names = session.get('checkbox_names', [])
    # app.logger.info(f'checkbox_names in data_edit: {checkbox_names}')
    return render_template('data-edit.html', checkbox_names=checkbox_names)


@app.route('/process-validation', methods=['POST'])
def process_validation():
    controlled_column_stats = {}
    unique_column_stats = {}
    lon_lat_stats = {}
    datetime_column_stats = {}
    date_column_stats = {}
    remain_column_stats = {}

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
        DATETIME_COLUMNS = ['eventDate']
        DATE_COLUMNS = ['year', 'month', 'day']

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
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)

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

        # *****檢查單一值欄位*****
        unique_columns = set(table_header) & set(UNIQUE_ID_COLUMNS)
        for col in unique_columns:
            is_unique = df[col].is_unique

            if is_unique:
                invalid_rows = 0
                valid_rows = TOTAL_ROWS 
                valid_percentage = 100.0
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
                valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)
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
                zero_longitude_rows = df[df['decimalLongitude'] == 0]
                blank_rows = df[df[col].isna()] # 同時判斷 None 與 NaN

                invalid_rows = len(invalid_longitude_rows)
                zero_rows = len(zero_longitude_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows) - zero_rows 
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'Longitude out of range'

                lon_lat_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': invalid_longitude_rows['decimalLongitude'].tolist(),
                        'indexes': (invalid_longitude_rows.index + 1).tolist(),
                    },
                    'zero_rows': {  
                        'count': zero_rows,
                        'values': 0,
                        'indexes': (zero_longitude_rows.index + 1).tolist(),
                        'error_message': 'Longitude zero coordinate'
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

            elif col == 'decimalLatitude':
                df['decimalLatitude'] = pd.to_numeric(df['decimalLatitude'], errors='coerce')
                invalid_latitude_rows = df[(df['decimalLatitude'] < -90) | (df['decimalLatitude'] > 90)]
                zero_latitude_rows = df[df['decimalLatitude'] == 0]
                blank_rows = df[df[col].isna()]

                invalid_rows = len(invalid_latitude_rows)
                zero_rows = len(zero_latitude_rows)
                valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows) - zero_rows
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'Latitude out of range'

                lon_lat_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': invalid_latitude_rows['decimalLatitude'].tolist(),
                        'indexes': (invalid_latitude_rows.index + 1).tolist(),
                    },
                    'zero_rows': {  
                        'count': zero_rows,
                        'values': 0,
                        'indexes': (zero_latitude_rows.index + 1).tolist(),
                        'error_message': 'Latitude zero coordinate'
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

        # *****檢查日期欄位*****
        def custom_date_parser(date_str):
            try:
                if pd.notna(date_str):  # 先檢查是否為 None 或 NaT
                    dt = pd.to_datetime(date_str)
                    return dt.strftime('%Y-%m-%d')
                else:
                    return pd.NaT
            except ValueError:
                # 如果轉換失敗，根據需要進行自定義處理
                if '/' in date_str:
                    # 如果是時間區間，取區間的開始日期
                    start_date_str = date_str.split('/')[0]
                    return pd.to_datetime(start_date_str, errors='coerce').strftime('%Y-%m-%d')
                elif len(date_str) == 4:
                    # 如果只有年份，返回一月一日的日期
                    return pd.to_datetime(date_str + '-01-01', errors='coerce').strftime('%Y-%m-%d')
                else:
                    # 其他情況，返回 NaT
                    return pd.NaT
                
        if 'eventDate' in df.columns:
            blank_rows = df[df['eventDate'].isna()] # 轉換前的 na 代表空白值

            df['parsed_eventDate'] = df['eventDate'].apply(custom_date_parser)

            invalid_rows = df[df['parsed_eventDate'].isna()] # 轉換後的 na 代表無效值
            valid_rows = TOTAL_ROWS - len(invalid_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0

            df['parsed_eventDate'] = pd.to_datetime(df['parsed_eventDate'])
            df['parsed_year'] = df['parsed_eventDate'].dt.year.fillna(-1).astype(int)
            df['parsed_month'] = df['parsed_eventDate'].dt.month.fillna(-1).astype(int)
            df['parsed_day'] = df['parsed_eventDate'].dt.day.fillna(-1).astype(int)

            valid_parsed_rows = df['parsed_eventDate'].notna() # 只取有解析成功的 rows 進行後續比對

            mismatched_year_rows = None
            mismatched_month_rows = None
            mismatched_day_rows = None

            if 'year' in df:
                df['year'] = pd.to_numeric(df['year'], errors='ignore').astype('Int64')
                mismatched_year_rows = df[valid_parsed_rows & (df['year'] != df['parsed_year'])]
                if not mismatched_year_rows.empty:
                    mismatched_year_values = mismatched_year_rows['year'].tolist()
                    mismatched_year_indexes = (mismatched_year_rows.index + 1).tolist()
                    mismatched_year_eventDate = df.loc[mismatched_year_rows.index, 'eventDate'].tolist() # 傳遞對應的 eventDate
            else:
                mismatched_year_rows = None
                mismatched_year_values = None
                mismatched_year_indexes = None
                mismatched_year_eventDate = None

            if 'month' in df:
                df['month'] = pd.to_numeric(df['month'], errors='ignore').astype('Int64')
                mismatched_month_rows = df[valid_parsed_rows & (df['month'] != df['parsed_month'])]
                if not mismatched_month_rows.empty:
                    mismatched_month_values = mismatched_month_rows['month'].tolist()
                    mismatched_month_indexes = (mismatched_month_rows.index + 1).tolist()
                    mismatched_month_eventDate = df.loc[mismatched_month_rows.index, 'eventDate'].tolist() # 傳遞對應的 eventDate
            else:
                mismatched_month_rows = None
                mismatched_month_values = None
                mismatched_month_indexes = None
                mismatched_month_eventDate = None

            if 'day' in df:
                df['day'] = pd.to_numeric(df['day'], errors='ignore').astype('Int64')
                mismatched_day_rows = df[valid_parsed_rows & (df['day'] != df['parsed_day'])]
                if not mismatched_day_rows.empty:
                    mismatched_day_values = mismatched_day_rows['day'].tolist()
                    mismatched_day_indexes = (mismatched_day_rows.index + 1).tolist()
                    mismatched_day_eventDate = df.loc[mismatched_day_rows.index, 'eventDate'].tolist() # 傳遞對應的 eventDate
            else:
                mismatched_day_rows = None
                mismatched_day_values = None
                mismatched_day_indexes = None
                mismatched_day_eventDate = None

            datetime_column_stats['eventDate'] = {
                'counts_rows': counts_rows,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'values': invalid_rows['eventDate'].tolist(),
                    'indexes': (invalid_rows.index + 1).tolist(),
                },
                'mismatched_year_rows': None if mismatched_year_rows is None or mismatched_year_rows.empty else {
                    'count': len(mismatched_year_rows),
                    'values': mismatched_year_values,
                    'indexes': mismatched_year_indexes,
                    'raw_eventDate': mismatched_year_eventDate,
                    'error_message': 'Recorded year mismatch'
                },
                'mismatched_month_rows': None if mismatched_month_rows is None or mismatched_month_rows.empty else {
                    'count': len(mismatched_month_rows),
                    'values': mismatched_month_values,
                    'indexes': mismatched_month_indexes,
                    'raw_eventDate': mismatched_month_eventDate,
                    'error_message': 'Recorded month mismatch'
                },
                'mismatched_day_rows': None if mismatched_day_rows is None or mismatched_day_rows.empty else {
                    'count': len(mismatched_day_rows),
                    'values': mismatched_day_values,
                    'indexes': mismatched_day_indexes,
                    'raw_eventDate': mismatched_day_eventDate,
                    'error_message': 'Recorded day mismatch'
                },
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'error_message': 'Recorded date invalid'
            }

        # *****檢查年、月、日欄位*****
        date_columns = set(table_header) & set(DATE_COLUMNS)

        today = datetime.date.today()

        for col in date_columns:
            if col == 'year' and col in df.columns:
                current_year = today.year
                blank_rows = df[df['year'].isna()]

                invalid_rows = df[(pd.notna(df['year'])) & ((df['year'] > current_year) | (df['year'] == 0))]
                valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'Recorded year invalid'

                date_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'values': invalid_rows['year'].tolist(),
                        'indexes': (invalid_rows.index + 1).tolist(),
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

            if col == 'month' and col in df.columns:
                blank_rows = df[df['month'].isna()]

                invalid_rows = df[(pd.notna(df['month'])) & ((df['month'] < 1) | (df['month'] > 12) | (df['month'] == 0))]
                valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'Recorded month invalid'

                date_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'values': invalid_rows['month'].tolist(),
                        'indexes': (invalid_rows.index + 1).tolist(),
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

            if col == 'day' and col in df.columns:
                blank_rows = df[df['day'].isna()]

                invalid_rows = df[(pd.notna(df['day'])) & ((df['day'] < 1) | (df['day'] > 31) | (df['day'] == 0))]
                valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'Recorded day invalid'

                date_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'values': invalid_rows['day'].tolist(),
                        'indexes': (invalid_rows.index + 1).tolist(),
                    },
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'error_message': error_message
                }

        # *****檢查空白欄位*****
        remain_columns = set(table_header) - set(CONTROLLED_VOCABULARY_COLUMNS + 
                                                    UNIQUE_ID_COLUMNS +
                                                    LON_LAT_COLUMNS +
                                                    DATETIME_COLUMNS +
                                                    DATE_COLUMNS)
        for col in remain_columns:
            blank_rows = df[df[col].isna()]

            valid_rows = TOTAL_ROWS - len(blank_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows) # 沒有做額外檢查的話，valid_rows 等於 counts_rows
            valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
            error_message = f'{col} is blank'

            remain_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'blank_rows': {
                    'counts': len(blank_rows),
                    'values': blank_rows[col].tolist(),
                    'indexes': (blank_rows.index + 1).tolist(),
                },
                'valid_percentage': valid_percentage,
                'error_message': error_message
            }

    app.logger.info(datetime_column_stats)
            

    session['controlled_column_stats'] = controlled_column_stats
    session['unique_column_stats'] = unique_column_stats
    session['lon_lat_stats'] = lon_lat_stats
    session['datetime_column_stats'] = datetime_column_stats
    session['date_column_stats'] = date_column_stats
    session['remain_column_stats'] = remain_column_stats
        
    return redirect(url_for('data_validation'))

@app.route('/data-validation', methods=['GET'])
def data_validation():
    controlled_column_stats = session.get('controlled_column_stats')
    unique_column_stats = session.get('unique_column_stats')
    lon_lat_stats = session.get('lon_lat_stats')
    datetime_column_stats = session.get('datetime_column_stats')
    date_column_stats = session.get('date_column_stats')
    remain_column_stats = session.get('remain_column_stats')
    
    return render_template('data-validation.html', 
                           controlled_column_stats=controlled_column_stats, 
                           unique_column_stats=unique_column_stats, 
                           lon_lat_stats=lon_lat_stats,
                           datetime_column_stats=datetime_column_stats,
                           date_column_stats=date_column_stats,
                           remain_column_stats=remain_column_stats)



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
