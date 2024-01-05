from flask import Flask, render_template, request, redirect, session, url_for, jsonify, send_file
import os
import pandas as pd
import numpy as np
import datetime
import tempfile

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
        template_names = data['template_names']
        app.logger.info(f'checkbox_names in data_template: {data}')
        session['checkbox_names'] = checkbox_names
        session['template_names'] = template_names
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
    # extension_checkbox_names = session.get('extension_checkbox_names', [])
    template_names = session.get('template_names', [])
    app.logger.info(f'checkbox_names in data_edit: {checkbox_names}')
    return render_template('data-edit.html', checkbox_names=checkbox_names, template_names=template_names)


@app.route('/process-validation', methods=['POST'])
def process_validation():

    CONTROLLED_VOCABULARY_COLUMNS = ['basisOfRecord', 'type', 'occurrenceStatus', 'continent', 'language', 'license', 'sex', 'establishmentMeans', 'degreeOfEstablishment', 'typeStatus', 'kingdom']
    UNIQUE_ID_COLUMNS = ['eventID', 'occurrenceID', 'taxonID', 'samp_name']
    LON_LAT_COLUMNS = ['decimalLongitude', 'decimalLatitude']
    DATETIME_COLUMNS = ['eventDate']
    DATE_COLUMNS = ['year', 'month', 'day']
    INT_COLUMNS = ['individualCount', 'maximumElevationMeters', 'minimumElevationInMeters', 'maximumDepthInMeters', 'minimumDepthInMeters']


    # *****檢查控制詞彙欄位*****
    def validate_controll_column(df, table_header, CONTROLLED_VOCABULARY_COLUMNS):
        controlled_column_stats = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到
        common_columns = set(table_header) & set(CONTROLLED_VOCABULARY_COLUMNS)
        for col in common_columns:
            if col == 'basisOfRecord':
                valid_values = ['MaterialEntity', 'PreservedSpecimen', 'FossilSpecimen', 'LivingSpecimen', 'MaterialSample', 'Event', 'HumanObservation', 'MachineObservation', 'Taxon', 'Occurrence', 'MaterialCitation']
                error_message = 'basisOfRecord 無效'
            elif col == 'type':
                valid_values = ['Collection', 'Dataset', 'Event', 'Image', 'MovingImage', 'PhysicalObject', 'Sound', 'StillImage', 'Text']
                error_message = 'type 無效'
            elif col == 'occurrenceStatus':
                valid_values = ['absent', 'present']
                error_message = 'occurrenceStatus 無效'
            elif col == 'continent':
                valid_values = ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']
                error_message = 'continent 無效'
            elif col == 'language':
                valid_values = ['en', 'zh-TW']
                error_message = 'language 無效'
            elif col == 'license':
                valid_values = ['CC0 1.0', 'CC BY 4.0', 'CC BY-NC 4.0', 'No license']
                error_message = 'license 無效'
            elif col == 'sex':
                valid_values = ['female', 'male', 'hermaphrodite']
                error_message = 'sex 無效'
            elif col == 'establishmentMeans':
                valid_values = ['native', 'nativeReintroduced', 'introduced', 'introducedAssistedColonisation', 'vagrant', 'uncertain']
                error_message = 'establishmentMeans 無效'
            elif col == 'degreeOfEstablishment':
                valid_values = ['native', 'captive', 'cultivated', 'released', 'failing', 'casual', 'reproducing', 'established', 'colonising', 'invasive', 'widespreadInvasive']
                error_message = 'degreeOfEstablishment 無效'
            elif col == 'typeStatus':
                valid_values = ['holotype', 'paratype', 'isotype', 'allotype', 'syntype', 'lectotype', 'paralectotype', 'neotype', 'topotype']
                error_message = 'typeStatus 無效'
            elif col == 'kingdom':
                valid_values = ['Animalia', 'Archaea', 'Bacteria', 'Chromista', 'Fungi', 'Plantae', 'Protozoa', 'Viruses']
                error_message = 'kingdom 無效'
            
            # 檢查欄位值是否在 valid_values 中
            invalid_rows = df[~df[col].isin(valid_values)]
            blank_rows = df[df[col].isna()]

            # 計算統計資訊
            valid_rows = TOTAL_ROWS - len(invalid_rows) # None 會直接算到 invalid_rows 裡面，所以不扣 blank
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)
            if valid_percentage == 0.0:
                valid_percentage = 0

            # 提取不符合的值和索引號
            invalid_values = invalid_rows[col].tolist()
            invalid_indexes = (invalid_rows.index + 1).tolist() # pandas 從 0 開始，但 Handsontable 從 1 開始

            # 儲存統計結果到字典
            controlled_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'error_message': error_message,
                    'values': invalid_values,
                    'indexes': invalid_indexes,
                },
            }
        
        return controlled_column_stats
        
    # *****檢查單一值欄位*****
    def validate_unique_column(df, table_header, UNIQUE_ID_COLUMNS):
        unique_column_stats = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到
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

                blank_rows = df[df[col].isna()]
                counts_rows = TOTAL_ROWS - len(blank_rows)

                invalid_rows = len(duplicated_values)
                valid_rows = TOTAL_ROWS - invalid_rows
                valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)
                if valid_percentage == 0.0:
                    valid_percentage = 0
                error_message = f'{col} 有重複'

                unique_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'error_message': error_message,
                        'values': list(sorted_values),
                        'indexes': list(sorted_indexes),
                    },
                }

        return unique_column_stats
    
    # *****檢查經緯度欄位*****
    def validte_lon_column(df, table_header, LON_LAT_COLUMNS):
        lon_stats = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到
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
                error_message = 'decimalLongitude 超出範圍'

                lon_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': invalid_longitude_rows['decimalLongitude'].tolist(),
                        'indexes': (invalid_longitude_rows.index + 1).tolist(),
                        'error_message': error_message
                    },
                    'zero_rows': {  
                        'count': zero_rows,
                        'values': [0] * zero_rows,
                        'indexes': (zero_longitude_rows.index + 1).tolist(),
                        'error_message': 'decimalLongitude 零座標'
                    },
                    'blank_rows': {
                        'count': len(blank_rows),
                        'values': [None] * len(blank_rows),
                        'indexes': (blank_rows.index + 1).tolist(),
                        'error_message': 'decimalLongitude 有空值'
                    },
                }

        return lon_stats
    
    def validte_lat_column(df, table_header, LON_LAT_COLUMNS):
        lat_stats = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到
        lon_lat_columns = set(table_header) & set(LON_LAT_COLUMNS)
        for col in lon_lat_columns:
            if col == 'decimalLatitude':
                df['decimalLatitude'] = pd.to_numeric(df['decimalLatitude'], errors='coerce')
                invalid_latitude_rows = df[(df['decimalLatitude'] < -90) | (df['decimalLatitude'] > 90)]
                zero_latitude_rows = df[df['decimalLatitude'] == 0]
                blank_rows = df[df[col].isna()]

                invalid_rows = len(invalid_latitude_rows)
                zero_rows = len(zero_latitude_rows)
                valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows) - zero_rows
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'decimalLatitude 超出範圍'

                lat_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'values': invalid_latitude_rows['decimalLatitude'].tolist(),
                        'indexes': (invalid_latitude_rows.index + 1).tolist(),
                        'error_message': error_message
                    },
                    'zero_rows': {  
                        'count': zero_rows,
                        'values': [0] * zero_rows,
                        'indexes': (zero_latitude_rows.index + 1).tolist(),
                        'error_message': 'decimalLatitude 零座標'
                    },
                    'blank_rows': {
                        'count': len(blank_rows),
                        'values': [None] * len(blank_rows),
                        'indexes': (blank_rows.index + 1).tolist(),
                        'error_message': 'decimalLatitude 有空值'
                    },
                }

        return lat_stats
            
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
            
    # *****檢查日期欄位*****
    def validate_datetime_coulmn(df, table_header):  
        datetime_column_stats = {}    
        TOTAL_ROWS = len(df) # 計算空白值會用到     
        if 'eventDate' in df.columns:
            blank_rows = df[df['eventDate'].isna()] # 轉換前的 na 代表空白值

            df['parsed_eventDate'] = df['eventDate'].apply(custom_date_parser)

            invalid_rows = df[df['parsed_eventDate'].isna()] # 轉換後的 na 代表無效值
            valid_rows = TOTAL_ROWS - len(invalid_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1) if counts_rows != 0 else 0

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
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'values': invalid_rows['eventDate'].tolist(),
                    'indexes': (invalid_rows.index + 1).tolist(),
                    'error_message': 'eventDate 無效'
                },
                'mismatched_year_rows': None if mismatched_year_rows is None or mismatched_year_rows.empty else {
                    'count': len(mismatched_year_rows),
                    'values': mismatched_year_values,
                    'indexes': mismatched_year_indexes,
                    'raw_eventDate': mismatched_year_eventDate,
                    'error_message': 'year 不匹配'
                },
                'mismatched_month_rows': None if mismatched_month_rows is None or mismatched_month_rows.empty else {
                    'count': len(mismatched_month_rows),
                    'values': mismatched_month_values,
                    'indexes': mismatched_month_indexes,
                    'raw_eventDate': mismatched_month_eventDate,
                    'error_message': 'month 不匹配'
                },
                'mismatched_day_rows': None if mismatched_day_rows is None or mismatched_day_rows.empty else {
                    'count': len(mismatched_day_rows),
                    'values': mismatched_day_values,
                    'indexes': mismatched_day_indexes,
                    'raw_eventDate': mismatched_day_eventDate,
                    'error_message': 'day 不匹配'
                },           
            }

        return datetime_column_stats
        
    # *****檢查年、月、日欄位*****
    def validate_date_column(df, table_header, DATE_COLUMNS):
        date_column_stats = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到    
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
                error_message = 'year 無效'

                date_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'error_message': error_message,
                        'values': invalid_rows['year'].tolist(),
                        'indexes': (invalid_rows.index + 1).tolist(),
                    },   
                }

            if col == 'month' and col in df.columns:
                blank_rows = df[df['month'].isna()]

                invalid_rows = df[(pd.notna(df['month'])) & ((df['month'] < 1) | (df['month'] > 12) | (df['month'] == 0))]
                valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'month 無效'

                date_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'error_message': error_message,
                        'values': invalid_rows['month'].tolist(),
                        'indexes': (invalid_rows.index + 1).tolist(),
                    },                   
                }

            if col == 'day' and col in df.columns:
                blank_rows = df[df['day'].isna()]

                invalid_rows = df[(pd.notna(df['day'])) & ((df['day'] < 1) | (df['day'] > 31) | (df['day'] == 0))]
                valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)
                valid_percentage = round((valid_rows / counts_rows) * 100, 1) if counts_rows != 0 else 0
                error_message = 'day 無效'

                date_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'error_message': error_message,
                        'values': invalid_rows['day'].tolist(),
                        'indexes': (invalid_rows.index + 1).tolist(),
                    },
                }

        return date_column_stats
    
    # *****檢查正整數欄位*****
    def validate_int_column(df, table_header, INT_COLUMNS):
        validate_int_column = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到
        common_columns = set(table_header) & set(INT_COLUMNS)

        valid_values = set(range(0, int(1e5)))

        for col in common_columns:
            
            # 檢查欄位值是否在 valid_values 中
            invalid_rows = df[~(df[col].isin(valid_values))]
            blank_rows = df[df[col].isna()]

            # 計算統計資訊
            valid_rows = TOTAL_ROWS - len(invalid_rows) # None 會直接算到 invalid_rows 裡面，所以不扣 blank
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)

            # 提取不符合的值和索引號
            invalid_values = invalid_rows[col].tolist()
            invalid_indexes = (invalid_rows.index + 1).tolist() # pandas 從 0 開始，但 Handsontable 從 1 開始

            error_message = f'{col} 無效'

            # 儲存統計結果到字典
            validate_int_column[col] = {
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
        
        return validate_int_column
            
    # *****檢查空白欄位*****
    def validate_blank_column(df, table_header, CONTROLLED_VOCABULARY_COLUMNS, UNIQUE_ID_COLUMNS, LON_LAT_COLUMNS, DATETIME_COLUMNS,DATE_COLUMNS):
        remain_column_stats = {}
        TOTAL_ROWS = len(df) # 計算空白值會用到  
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
            error_message = f'{col} 有空值'

            remain_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'blank_rows': {
                    'counts': len(blank_rows),
                    'error_message': error_message,
                    'values': blank_rows[col].tolist(),
                    'indexes': (blank_rows.index + 1).tolist(),
                },
            }

        return remain_column_stats


    if request.method == 'POST':
        data = request.get_json()
        table_name = data['table_name']
        table_header = data['table_header']
        table_data = data['table_data']

        print(table_name)
        table_stats = {}

        # *****開始清理流程*****
        for name, header, rows in zip(table_name, table_header, table_data):
            df = pd.DataFrame(rows, columns=header)
            
            stats_dict = {}

            if name in ['checklist', 'occurrence', 'samplingevent']: # 只有核心才檢查 ID 類欄位
                UNIQUE_ID_COLUMNS = ['eventID', 'occurrenceID', 'taxonID', 'samp_name']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            else:
                UNIQUE_ID_COLUMNS = []
                stats_dict['unique_stats'] = {}

            # 執行控制詞彙欄位的統計並存入字典
            controlled_stats = validate_controll_column(df, header, CONTROLLED_VOCABULARY_COLUMNS)
            stats_dict['controlled_stats'] = controlled_stats

            lon_stats = validte_lon_column(df, header, LON_LAT_COLUMNS)
            stats_dict['lon_stats'] = lon_stats

            lat_stats = validte_lat_column(df, header, LON_LAT_COLUMNS)
            stats_dict['lat_stats'] = lat_stats

            datetime_stats = validate_datetime_coulmn(df, header)
            stats_dict['datetime_stats'] = datetime_stats

            date_column_stats = validate_date_column(df, header, DATE_COLUMNS)
            stats_dict['date_column_stats'] = date_column_stats

            # int_column_stats = validate_int_column(df, header, INT_COLUMNS)
            # stats_dict['int_column_stats'] = int_column_stats 

            remain_column_stats = validate_blank_column(df, header, CONTROLLED_VOCABULARY_COLUMNS, UNIQUE_ID_COLUMNS, LON_LAT_COLUMNS, DATETIME_COLUMNS, DATE_COLUMNS)
            stats_dict['remain_column_stats'] = remain_column_stats 

            # 將該字典存入主字典中，對應於當前的name
            table_stats[name] = stats_dict

            # app.logger.info(f'name: {table_name}, header: {table_header}, data: {table_data}')
        print(f'table_stats: {table_stats}')

    session['table_stats'] = table_stats
    session['table_name'] = table_name
    
    return redirect(url_for('data_validation'))

@app.route('/data-validation', methods=['GET'])
def data_validation():
    template_names = session.get('template_names', [])
    table_stats = session.get('table_stats')
    table_name = session.get('table_name')
    
    return render_template('data-validation.html', table_stats=table_stats, table_name=table_name, template_names=template_names)

@app.route('/download-result', methods=['POST'])
def download_result():

    table_stats = session.get('table_stats')

    # 初始化一個空的列表來保存每個欄位的資料
    data = []

    for main_key, sub_dict in table_stats.items():
    # 遍歷子字典中的鍵值對
        for sub_key, values in sub_dict.items():
            for sub_sub_key, sub_values in values.items():
                if sub_values.get('valid_percentage') != 100:  # 如果 valid_percentage 不等於 100
                    row_data = {
                        'Template': main_key,
                        'Term': sub_sub_key,
                        **sub_values  # 使用 ** 來展開子字典中的所有鍵值對
                    }
                data.append(row_data)

    # 將列表轉換為 DataFrame
    df = pd.DataFrame(data)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    df.to_csv(temp_file.name, index=False)

    try:
        return send_file(temp_file.name,
                        mimetype='"text/csv"',
                        as_attachment=True,
                        download_name='test.csv')

    except FileNotFoundError:
        print('404')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
