import pandas as pd
from datetime import date
import re
import numpy as np

def custom_date_parser(date_str):
    try:
        if pd.notna(date_str):  # 先檢查是否為 None 或 NaT
            if "T" in date_str:
                if date_str.endswith("Z"):
                    # 1996-11-26T11:26Z
                    dt = pd.to_datetime(date_str, format='%Y-%m-%dT%H:%MZ', errors='coerce')
                    return dt.strftime('%Y-%m-%d')
                elif re.search(r"[\+\-]\d{4}", date_str):
                    # 1996-11-26T11:26+0800
                    date_str = re.sub(r"[\+\-]\d{4}$", "", date_str)
                    dt = pd.to_datetime(date_str, format='%Y-%m-%dT%H:%M', errors='coerce')
                    return dt.strftime('%Y-%m-%d')
                else:
                    # 1996-11-26T11:26
                    dt = pd.to_datetime(date_str, format='%Y-%m-%dT%H:%M', errors='coerce')
                    return dt.strftime('%Y-%m-%d')

            # 1996-11-26  
            dt = pd.to_datetime(date_str, format='%Y-%m-%d', errors='coerce')
            return dt.strftime('%Y-%m-%d')
        else:
            return pd.NaT
    except ValueError:
        # 如果轉換失敗，根據需要進行自定義處理
        if '/' in date_str and '-' in date_str:
            # 1996-11-26/30
            start_date_str = date_str.split('/')[0] # 如果是時間區間，取區間的開始日期
            return pd.to_datetime(start_date_str, errors='coerce').strftime('%Y-%m-%d')
        elif len(date_str) == 4:
            # 1996
            return pd.to_datetime(date_str + '-01-01', errors='coerce').strftime('%Y-%m-%d') # 如果只有年份，返回一月一日的日期
        elif len(date_str) == 7:
            # 1996-11
            return pd.to_datetime(date_str + '-01', errors='coerce').strftime('%Y-%m-%d') # 如果只有年份月份，返回一號的日期
        else:
            # 其他情況，返回 NaT
            return pd.NaT
        
def valid_date(date_str):
    try:
        # 嘗試將日期字串轉換為 datetime 格式
        pd.to_datetime(date_str, format='%Y-%m-%d', errors='raise')
        return True
    except ValueError:
        # 如果轉換失敗，則為無效日期
        return False

# *****檢查日期欄位*****
def validate_datetime_coulmn(df, datetime_columns):  
    datetime_column_stats = {}    
    TOTAL_ROWS = len(df) # 計算空白值會用到   
    for col in datetime_columns:
        if col == 'eventDate':
            blank_rows = df[df['eventDate'].isna()] # 轉換前的 na 代表空白值

            df['parsed_eventDate'] = df['eventDate'].apply(custom_date_parser)
            df['eventDate'] = df['eventDate'].apply(lambda x: pd.to_datetime(x, format='%Y-%m-%d', errors='coerce') if valid_date(x) else x)
            df['eventDate'] = df['eventDate'].apply(lambda x: 'N/A' if pd.isna(x) else x)
            invalid_rows = df[df['parsed_eventDate'].isna()] # 轉換後的 na 代表無效值
            valid_rows = TOTAL_ROWS - len(invalid_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)

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
                    mismatched_year_indexes = (mismatched_year_rows['row_index']).tolist()
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
                    mismatched_month_indexes = (mismatched_month_rows['row_index']).tolist()
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
                    mismatched_day_indexes = (mismatched_day_rows['row_index']).tolist()
                    mismatched_day_eventDate = df.loc[mismatched_day_rows.index, 'eventDate'].tolist() # 傳遞對應的 eventDate
            else:
                mismatched_day_rows = None
                mismatched_day_values = None
                mismatched_day_indexes = None
                mismatched_day_eventDate = None

            datetime_column_stats['eventDate'] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'values': invalid_rows['eventDate'].tolist(),
                    'indexes': (invalid_rows['row_index']).tolist(),
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
            if col not in ['year', 'month', 'day']:
                blank_rows = df[df[col].isna()] # 轉換前的 na 代表空白值

                df['parsed_eventDate'] = df[col].apply(custom_date_parser)

                invalid_rows = df[df['parsed_eventDate'].isna()] # 轉換後的 na 代表無效值
                valid_rows = TOTAL_ROWS - len(invalid_rows)
                counts_rows = TOTAL_ROWS - len(blank_rows)

                datetime_column_stats[col] = {
                    'counts_rows': counts_rows,
                    'valid_rows': valid_rows,
                    'invalid_rows': {
                        'count': len(invalid_rows),
                        'values': invalid_rows[col].tolist(),
                        'indexes': (invalid_rows['row_index']).tolist(),
                        'error_message': f'{col} 日期無效'
                    }         
                }

    return datetime_column_stats

# *****檢查控制詞彙欄位*****
def validate_controll_column(df, common_columns):
    controlled_column_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到
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
        blank_rows = df[df[col].isna()]
        df[col] = df[col].apply(lambda x: 'N/A' if pd.isna(x) or str(x).strip() == '' else x)
        invalid_rows = df[~df[col].isin(valid_values)]
        # 計算統計資訊
        valid_rows = TOTAL_ROWS - len(invalid_rows) # None 會直接算到 invalid_rows 裡面，所以不扣 blank
        counts_rows = TOTAL_ROWS - len(blank_rows)

        # 提取不符合的值和索引
        invalid_values = invalid_rows[col].tolist()
        invalid_indexes = invalid_rows['row_index'].tolist() 

        # 儲存統計結果到字典
        controlled_column_stats[col] = {
            'counts_rows': counts_rows,
            'valid_rows': valid_rows,
            'invalid_rows': {
                'count': len(invalid_rows),
                'error_message': error_message,
                'values': invalid_values,
                'indexes': invalid_indexes,
            },
        }
    
    return controlled_column_stats
    
# *****檢查單一值欄位*****
def validate_unique_column(df, unique_columns):
    unique_column_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到
    for col in unique_columns:
        blank_df = df[~df[col].str.strip().astype(bool)]
        non_blank_df = df[df[col].str.strip().astype(bool)]

        is_unique = non_blank_df[col].is_unique # 檢查非空白行中的唯一性

        # 統計空白行數
        blank_row_count = len(blank_df)
        blank_row_indexes = blank_df['row_index'].tolist()
        blank_row_values = ['N/A'] * blank_row_count

        if is_unique and blank_row_count > 0: # 若沒有重複值但有空值
            valid_rows = len(non_blank_df)
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)
            error_message = f'{col} 有空值'

            unique_column_stats[col] = {
                'counts_rows': TOTAL_ROWS,
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
                'blank_rows': {
                    'count': blank_row_count,
                    'indexes': blank_row_indexes,
                    'values': blank_row_values,
                    'error_message': error_message
                },
            }
        elif not is_unique: # 若有重複值
            duplicated_values = non_blank_df[non_blank_df.duplicated(subset=col, keep=False)]

            # 相同的重複值排序在一起，同時保持索引 row_index 對應的順序關係
            sorted_pairs = sorted(
                zip(duplicated_values['row_index'], duplicated_values[col]),
                key=lambda x: (x[1] is None, x[1])
            )
            # 拆分為索引與值
            sorted_indexes, sorted_values = zip(*sorted_pairs) if sorted_pairs else ([], [])

            invalid_rows = len(duplicated_values)
            valid_rows = TOTAL_ROWS - invalid_rows - blank_row_count
            valid_percentage = round((valid_rows / TOTAL_ROWS) * 100, 1)

            if blank_row_count > 0: # 若有重複值且有空值
                    unique_column_stats[col] = {
                    'counts_rows': TOTAL_ROWS,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'error_message': f'{col} 有重複值',
                        'values': list(sorted_values),
                        'indexes': list(sorted_indexes),
                    },
                    'blank_rows': {
                        'count': blank_row_count,
                        'indexes': blank_row_indexes,
                        'values': blank_row_values, 
                        'error_message': f'{col} 有空值',
                    },
                }
            else: # 若有重複值但沒有空值
                unique_column_stats[col] = {
                    'counts_rows': TOTAL_ROWS,
                    'valid_rows': valid_rows,
                    'valid_percentage': valid_percentage,
                    'invalid_rows': {
                        'count': invalid_rows,
                        'error_message': f'{col} 有重複值',
                        'values': list(sorted_values),
                        'indexes': list(sorted_indexes),
                    },
                }
        else: # 若無重複值且無空值
            valid_rows = TOTAL_ROWS
            valid_percentage = 100.0

            unique_column_stats[col] = {
                'counts_rows': TOTAL_ROWS,
                'valid_rows': valid_rows,
                'valid_percentage': valid_percentage,
            }

    return unique_column_stats

# *****檢查經緯度欄位*****
def validte_lon_column(df, lon_columns):
    lon_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到
    for col in lon_columns:
        if col == 'decimalLongitude':
            df['parsed_decimalLongitude'] = pd.to_numeric(df['decimalLongitude'], errors='coerce')
            invalid_longitude_rows = df[(df['parsed_decimalLongitude'] < -180) | (df['parsed_decimalLongitude'] > 180)]
            zero_longitude_rows = df[df['parsed_decimalLongitude'] == 0]
            # 找出沒有填值的 row
            blank_rows = df[df['decimalLongitude'].isna()] 
            # 找出有填值，但沒有被解析成數字的的 row
            invalid_content_rows = df[df['parsed_decimalLongitude'].isna() & df['decimalLongitude'].str.strip().astype(bool)]

            invalid_rows = len(invalid_longitude_rows)
            zero_rows = len(zero_longitude_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows) - zero_rows -len(invalid_content_rows)

            lon_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'invalid_rows': {
                    'count': invalid_rows,
                    'values': invalid_longitude_rows['decimalLongitude'].tolist(),
                    'indexes': (invalid_longitude_rows['row_index']).tolist(),
                    # 'error_message': 'decimalLongitude 超出範圍'
                },
                'zero_rows': {  
                    'count': zero_rows,
                    'values': [0] * zero_rows,
                    'indexes': (zero_longitude_rows['row_index']).tolist(),
                    # 'error_message': 'decimalLongitude 零座標'
                },
                'blank_rows': {
                    'count': len(blank_rows),
                    'values': ['N/A'] * len(blank_rows),
                    'indexes': (blank_rows['row_index']).tolist(),
                    # 'error_message': 'decimalLongitude 有空值'
                },
                'invalid_content_rows': {
                    'count': len(invalid_content_rows),
                    'values': invalid_content_rows['decimalLongitude'].tolist(),
                    'indexes': (invalid_content_rows['row_index']).tolist(),
                },
            }

    return lon_stats

def validte_lat_column(df, lat_columns):
    lat_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到
    for col in lat_columns:
        if col == 'decimalLatitude':
            df['parsed_decimalLatitude'] = pd.to_numeric(df['decimalLatitude'], errors='coerce')
            invalid_latitude_rows = df[(df['parsed_decimalLatitude'] < -90) | (df['parsed_decimalLatitude'] > 90)]
            zero_latitude_rows = df[df['parsed_decimalLatitude'] == 0]
            # 找出沒有填值的 row
            blank_rows = df[df['decimalLatitude'].isna()] 
            # 找出有填值，但沒有被解析成數字的的 row
            invalid_content_rows = df[df['parsed_decimalLatitude'].isna() & df['decimalLatitude'].str.strip().astype(bool)]

            invalid_rows = len(invalid_latitude_rows)
            zero_rows = len(zero_latitude_rows)
            valid_rows = TOTAL_ROWS - invalid_rows - len(blank_rows) - zero_rows -len(invalid_content_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            # error_message = 'decimalLatitude 超出範圍'

            lat_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'invalid_rows': {
                    'count': invalid_rows,
                    'values': invalid_latitude_rows['decimalLatitude'].tolist(),
                    'indexes': (invalid_latitude_rows['row_index']).tolist(),
                    # 'error_message': error_message
                },
                'zero_rows': {  
                    'count': zero_rows,
                    'values': [0] * zero_rows,
                    'indexes': (zero_latitude_rows['row_index']).tolist(),
                    # 'error_message': 'decimalLatitude 零座標'
                },
                'blank_rows': {
                    'count': len(blank_rows),
                    'values': ['N/A'] * len(blank_rows),
                    'indexes': (blank_rows['row_index']).tolist(),
                    # 'error_message': 'decimalLatitude 有空值或無效值'
                },
                'invalid_content_rows': {
                    'count': len(invalid_content_rows),
                    'values': invalid_content_rows['decimalLatitude'].tolist(),
                    'indexes': (invalid_content_rows['row_index']).tolist(),
                },
            }

    return lat_stats
    
# *****檢查年、月、日欄位*****
def validate_date_column(df, date_columns):
    date_column_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到    
    today = date.today()

    for col in date_columns:
        if col == 'year' and col in df.columns:
            current_year = today.year
            blank_rows = df[df['year'].isna()]
            df['year'] = pd.to_numeric(df['year'], errors='coerce')
            invalid_rows = df[(pd.notna(df['year'])) & ((df['year'] > current_year) | (df['year'] == 0) | (df['year'] < 0))]
            valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            error_message = 'year 無效'

            date_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'error_message': error_message,
                    'values': invalid_rows['year'].astype('Int64').tolist(),
                    'indexes': (invalid_rows['row_index']).tolist(),
                },   
            }

        if col == 'month' and col in df.columns:
            blank_rows = df[df['month'].isna()]
            df['month'] = pd.to_numeric(df['month'], errors='coerce')
            invalid_rows = df[(pd.notna(df['month'])) & ((df['month'] < 1) | (df['month'] > 12) | (df['month'] == 0) | (df['month'] < 0))]
            valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            error_message = 'month 無效'

            date_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'error_message': error_message,
                    'values': invalid_rows['month'].astype('Int64').tolist(),
                    'indexes': (invalid_rows['row_index']).tolist(),
                },                   
            }

        if col == 'day' and col in df.columns:
            blank_rows = df[df['day'].isna()]
            df['day'] = pd.to_numeric(df['day'], errors='coerce')
            invalid_rows = df[(pd.notna(df['day'])) & ((df['day'] < 1) | (df['day'] > 31) | (df['day'] == 0) | (df['day'] < 0))]
            valid_rows = TOTAL_ROWS - len(invalid_rows) - len(blank_rows)
            counts_rows = TOTAL_ROWS - len(blank_rows)
            error_message = 'day 無效'

            date_column_stats[col] = {
                'counts_rows': counts_rows,
                'valid_rows': valid_rows,
                'invalid_rows': {
                    'count': len(invalid_rows),
                    'error_message': error_message,
                    'values': invalid_rows['day'].astype('Int64').tolist(),
                    'indexes': (invalid_rows['row_index']).tolist(),
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

        # 提取不符合的值和索引號
        invalid_values = invalid_rows[col].tolist()
        invalid_indexes = (invalid_rows['row_index']).tolist() # pandas 從 0 開始，但 Handsontable 從 1 開始

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
            'error_message': error_message
        }
    
    return validate_int_column
        
# *****檢查空白欄位*****
def validate_blank_column(df, remain_columns):
    remain_column_stats = {}
    TOTAL_ROWS = len(df) # 計算空白值會用到  
    df = df.map(lambda x: np.nan if pd.isna(x) or (isinstance(x, str) and x.strip() == "") else x)
    for col in remain_columns:
        blank_rows = df[df[col].isna()]

        valid_rows = TOTAL_ROWS - len(blank_rows)
        counts_rows = TOTAL_ROWS - len(blank_rows) # 沒有做額外檢查的話，valid_rows 等於 counts_rows
        error_message = f'{col} 有空值'

        remain_column_stats[col] = {
            'counts_rows': len(df[col]),
            'valid_rows': valid_rows,
            'blank_rows': {
                'count': len(blank_rows),
                'error_message': error_message,
                'values': blank_rows[col].fillna('N/A').tolist(),
                'indexes': (blank_rows['row_index']).tolist(),
            },
        }

    return remain_column_stats