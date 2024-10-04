import pandas as pd
from datetime import date

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
def validate_datetime_coulmn(df, table_header, DATETIME_COLUMNS):  
    datetime_column_stats = {}    
    TOTAL_ROWS = len(df) # 計算空白值會用到   
    datetime_columns = set(table_header) & set(DATETIME_COLUMNS)  
    for col in datetime_columns:
        if col == 'eventDate':
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
                    'error_message': 'year 和 eventDate 不匹配'
                },
                'mismatched_month_rows': None if mismatched_month_rows is None or mismatched_month_rows.empty else {
                    'count': len(mismatched_month_rows),
                    'values': mismatched_month_values,
                    'indexes': mismatched_month_indexes,
                    'raw_eventDate': mismatched_month_eventDate,
                    'error_message': 'month 和 eventDate 不匹配'
                },
                'mismatched_day_rows': None if mismatched_day_rows is None or mismatched_day_rows.empty else {
                    'count': len(mismatched_day_rows),
                    'values': mismatched_day_values,
                    'indexes': mismatched_day_indexes,
                    'raw_eventDate': mismatched_day_eventDate,
                    'error_message': 'day 和 eventDate 不匹配'
                },           
            }
        else:
            blank_rows = df[df[col].isna()] # 轉換前的 na 代表空白值

            df['parsed_eventDate'] = df[col].apply(custom_date_parser)

            invalid_rows = df[df['parsed_eventDate'].isna()] # 轉換後的 na 代表無效值
            valid_rows = TOTAL_ROWS - len(invalid_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1) if counts_rows != 0 else 0

            datetime_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'values': invalid_rows[col].tolist(),
                    'indexes': (invalid_rows.index + 1).tolist(),
                    'error_message': f'{col} 日期無效'
                }         
            }

    return datetime_column_stats

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
    
# *****檢查年、月、日欄位*****
def validate_date_column(df, table_header, DATE_COLUMNS):
    date_column_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到    
    date_columns = set(table_header) & set(DATE_COLUMNS)

    today = date.today()

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
def validate_blank_column(df, table_header, CONTROLLED_VOCABULARY_COLUMNS, UNIQUE_ID_COLUMNS, LON_LAT_COLUMNS, DATETIME_COLUMNS, DATE_COLUMNS):
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