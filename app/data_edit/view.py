from flask import Blueprint, request, render_template, session, jsonify, send_file, Response
import io
from datetime import date
import tempfile
import os
import pandas as pd
import csv
import chardet
from sqlalchemy import cast, Integer, Float
from data_template.model import *
from data_edit.validate import *
from utils import *


data_edit_bp = Blueprint('data_edit', __name__)

@data_edit_bp.route('/store_data', methods=['POST'])
def get_project_data():
    '''
    功能：從 專案管理 頁面傳遞渲染 編輯資料 頁面需要的內容，將內容透過此中繼函數儲存到 session 中，
    需要實際渲染頁面時，再從 session 中取出對應的內容，參考def data_edit()。

    template_names 是一個字典，用來區分 '資料集類型' 以及 '延伸資料集' 的模板名稱，
    結構如下：
    template_names = {
        '資料集類型': [], # 包含核心資料集名稱的列表，如 'checklist', 'occurrence', 'samplingevent'
        '延伸資料集': []  # 包含非核心資料集名稱的列表
    }

    checkbox_names 是一個字典，用來儲存該專案下每一張表用的欄位名稱，
    結構如下：
    checkbox_names = {
        'checlist': [] # 以列表儲存該專案中的 checklist 用到的欄位名稱
    };
    '''
    data = request.get_json()
    session['project_name'] = data['project_name']
    session['project_id'] = data['project_id']
    session['template_names'] = data['template_names']
    session['checkbox_names'] = data['checkbox_names']
    return '', 204

@data_edit_bp.route('/store_mapping_result', methods=['POST'])
def get_mapping_result():
    data = request.get_json()
    
    mapping_result = data.get('mappingResult', None)
    project_id = data.get('project_id')  

    session['mapping_result'] = mapping_result
    session['project_id'] = project_id 
    return '', 204

@data_edit_bp.route('/', methods=['GET', 'POST'])
def data_edit():
    checkbox_names = session.get('checkbox_names', {})
    template_names = session.get('template_names', {})
    # custom_columns = session.get('custom_columns', [])
    mapping_result = session.get('mapping_result', None)
    template_name = session.get('template_name', None)
    parsed_import_data = None

    custom_columns = [row.column_name for row in CustomTerms.query.all()]

    if mapping_result:
        project_id = session.get('project_id', None)
        import_file_path = session.get('import_file_path', None)
        table_header_entry = TableHeader.query.filter_by(project_id=project_id, table_name=template_name).first()
        table_id = table_header_entry.id
        checkbox_names_list = table_header_entry.table_header
        if import_file_path:
            # df = pd.DataFrame(import_data[1:], columns=import_data[0])
            df = pd.read_csv(f'{import_file_path}')
            new_df = pd.DataFrame(columns=checkbox_names_list)

            for key, value in mapping_result.items():
                if key in checkbox_names_list and value in df.columns:
                    # 將原始 df 中的 value 欄位數據填充到新 df 中的 key 欄位
                    new_df[key] = df[value]
            
            new_df = new_df.fillna('')

            # 先刪除現有資料
            TableData.query.filter_by(project_id=project_id, table_name=template_name).delete()
            db.session.commit()

            for index, row in new_df.iterrows():
                # 將 row 轉換成字典格式，表頭作為 key，對應值作為 value
                data_dict = {checkbox_names_list[i]: str(row[checkbox_names_list[i]]) for i in range(len(checkbox_names_list))}

                new_table_data = TableData(
                    project_id=project_id,
                    table_name=template_name,
                    row_id=index + 1,  
                    data=data_dict,  
                    table_id=table_id
                )

                db.session.add(new_table_data)
            db.session.commit()
        session['mapping_result'] = None

    return render_template('data-edit.html', 
                           checkbox_names=checkbox_names, 
                           template_names=template_names, 
                           custom_columns=custom_columns, 
                           parsed_import_data=parsed_import_data, 
                           template_name=template_name)

# @data_edit_bp.route('/transfer', methods=['POST'])
# def tansfer_data():
#     '''
#     功能：從 編輯資料 傳遞匯出資料表需要的內容，將內容透過此中繼函數儲存到 session 中，
#     需要會出匯出資料表時，再從 session 中取出對應的內容，參考 def export_as_zip()。

#     table_name 是一個列表，用來儲存資料表的名稱，匯出時會以此作為檔名，
#     結構如下：
#     table_name = ['samplingevent'] # 列表中一次只會有一個元素

#     table_header 是一個列表，用來儲存資料表的所有 header，
#     結構如下：
#     table_header = ['eventID', 'occurrenceID', 'taxonID'...]

#     table_data 是一個雙層列表，用來儲存資料表中每一列中的內容，
#     結構如下：
#     table_data = [
#         [], # 第二層中的每一個列表代表該列中的內容
#         [],
#         []
#     ]
#     '''
#     if request.method == 'POST':
#         data = request.get_json()
#         table_name = data['table_name']
#         project_id = data['project_id']


#         session['table_name'] = table_name
#         session['project_id'] = project_id

#     return jsonify({'success': 'Recieved data successfully'})

@data_edit_bp.route('/export', methods=['POST'])
def export_as_zip():
    table_name = session.get('table_name')[0]
    project_id = session.get('project_id')
    # 取出 Projects 資料表中的 table_content，不需要再從前端傳遞
    project_data = Projects.query.filter_by(id=project_id).first() 
    if project_data:
        data = project_data.table_content[table_name]

        table_header = []
        table_data = []
        table_data.append(data['data'])
        table_header.append(data['checkbox_names'])

    if not table_name or not table_header or not table_data:
        return 'No data to export', 400

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            for name, header, rows in zip(table_name, table_header, table_data):
                csv_filename = os.path.join(temp_dir, f'{name}.csv')
                with open(csv_filename, 'w', newline='') as csvfile:
                    csvwriter = csv.writer(csvfile)
                    csvwriter.writerow(header)  
                    csvwriter.writerows(rows)  

            return send_file(csv_filename, as_attachment=True, download_name=f'{table_name}-{date.today()}.csv')
    except FileNotFoundError:
        return 'File not found', 404
    except Exception as e:
        return str(e), 500

@data_edit_bp.route('/import', methods=['POST'])
def import_as_json():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']
    template_name = request.form.get('template_name')
    checkbox_names = request.form.get('checkbox_names')
    checkbox_names_list = checkbox_names.split(',')

    if file.filename == '':
        return jsonify({'error': 'No selected file'})    
    print(f'file: {file}')

    if file:
        file_name = file.filename # 避免後續 file 轉為 _io.BufferedReader 類型，無法直接獲取 filename 屬性
        try:
            header = []
            # 使用系統的臨時目錄
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, file_name) 
            # print(f'file path: {file_path}')
            file.save(file_path)  

            # 檢查匯入檔案的編碼是否為 utf-8
            with open(file_path, 'rb') as file:
                raw_data = file.read(1024)  # 只讀取文件的前 1KB
                result = chardet.detect(raw_data)
                encoding = result['encoding']
                # print(f'encoding: {encoding}')
                if encoding != 'utf-8' and encoding != 'UTF-8-SIG':
                    return jsonify({'error': 'Not utf-8 encoding CSV file'})

            with open(file_path, 'r', encoding='utf-8-sig') as csv_file:
                reader = csv.reader(csv_file)
                header = next(reader)            
            # print(f'header: {header}')

            session['import_filename'] = file_name
            session['template_name'] = template_name
            session['checkbox_names_list'] = checkbox_names_list
            session['import_data_header'] = header
            session['import_file_path'] = file_path
            return jsonify({'success': 'Saved file Successfully'})
        except Exception as e:
            return jsonify({'error': str(e)})

@data_edit_bp.route('/custom_terms', methods=['GET'])
def get_custom_terms_with_type():
    terms = CustomTerms.query.all()
    terms_dict = {}

    for term in terms:
        column_type = term.column_type
        column_name = term.column_name
        
        if column_type not in terms_dict:
            terms_dict[column_type] = []
        terms_dict[column_type].append(column_name)

    return jsonify(terms_dict)

@data_edit_bp.route('/autosave', methods=['PATCH'])
def autosave_table():
    data = request.get_json()
    project_id = data.get('project_id')
    table_name = data.get('table_name')
    formatted_data = data.get('formatted_data')

    # 查詢現有的專案
    project = Projects.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # 查詢 Table Header 中對應的 table_id
    table_id = TableHeader.query.filter_by(project_id=project_id, table_name=table_name).first().id

    try:
        # 遍歷 formatted_data 並決定是插入還是更新
        for row in formatted_data:
            existing_data = TableData.query.filter_by(project_id=project_id, table_name=table_name, row_id=row['row_index'], table_id=table_id).with_for_update().first()
            
            if existing_data:
                # 更新已存在的資料
                existing_data.data = row['data']
            else:
                # 插入新資料
                new_table_data = TableData(
                    project_id=project_id,
                    table_name=table_name,
                    row_id=row['row_index'],
                    data=row['data'],
                    table_id=table_id
                )
                db.session.add(new_table_data)

        db.session.commit()

        # 檢查並刪除重複的 row_id = 1 資料
        duplicates = TableData.query.filter_by(
            project_id=project_id, table_name=table_name, row_id=1, table_id=table_id
        ).order_by(TableData.id.asc()).all()

        # 如果有多筆，保留第一筆，刪除其餘的
        if len(duplicates) > 1:
            for duplicate in duplicates[1:]:
                db.session.delete(duplicate)
            db.session.commit()
        return jsonify({"message": "Table Data saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@data_edit_bp.route('/validate', methods=['POST'])
def process_validation():
    '''
    功能：接收每一張資料表的內容，並進行資料驗證

    custom_terms 自訂欄位的名稱，格式為字典，
    結構如下：
    custom_terms = {
        key1: [], # key 代表自訂欄位的種類，value 為列表，代表該種類下的自訂欄位名稱
        key2: [],
        ...
    }
    '''

    CONTROLLED_VOCABULARY_COLUMNS = ['basisOfRecord', 'type', 'occurrenceStatus', 'continent', 'language', 'license', 'sex', 'establishmentMeans', 'degreeOfEstablishment', 'typeStatus', 'kingdom']
    UNIQUE_ID_COLUMNS = ['eventID', 'occurrenceID', 'taxonID', 'samp_name']
    LON_COLUMNS = ['decimalLongitude']
    LAT_COLUMNS = ['decimalLatitude']
    DATETIME_COLUMNS = ['eventDate']
    DATE_COLUMNS = ['year', 'month', 'day']
    INT_COLUMNS = ['individualCount', 'maximumElevationMeters', 'minimumElevationInMeters', 'maximumDepthInMeters', 'minimumDepthInMeters']

    if request.method == 'POST':
        data = request.get_json()
        project_id = data.get('project_id')
        custom_terms = data.get('custom_terms', {})

        # 檢查 project_id 是否有效
        if not project_id:
            return jsonify({"error": "Project ID is required"}), 400
        
        table_header_entry = TableHeader.query.filter_by(project_id=project_id).all()
        if not table_header_entry:
            return jsonify({"error": "No table header found"}), 404
        

        # 處理自訂欄位的類型，將欄位分配到對應的類型進行驗證
        custom_data_terms = custom_terms.get('date', [])
        for term in custom_data_terms:
            DATETIME_COLUMNS.append(term)

        # 取得 TableData 中的資料
        table_data_entry = TableData.query.filter_by(project_id=project_id).all()
        if not table_data_entry:
            return jsonify({"error": "No table data found"}), 404
        
        table_stats = {} # 初始化儲存所有驗證結果的字典
        table_name_list = [entry.table_name for entry in table_header_entry]
        for table_name in table_name_list:
            stats_dict = {} # 初始化每張表驗證結果的字典
            table_data = [entry.data for entry in table_data_entry if entry.table_name == table_name]
            table_header = next((entry.table_header for entry in table_header_entry if entry.table_name == table_name), [])

            # 檢查是否唯一值的欄位
            if table_name in ['checklist']: # 只有在核心資料表才檢查所有 ID 類欄位的唯一值
                UNIQUE_ID_COLUMNS = ['taxonID']
            elif table_name in ['occurrence']: # 只有在核心資料表才檢查所有 ID 類欄位的唯一值
                UNIQUE_ID_COLUMNS = ['occurrenceID']
            elif table_name in ['samplingevent']: # 只有在核心資料表才檢查所有 ID 類欄位的唯一值
                UNIQUE_ID_COLUMNS = ['eventID']
            elif table_name in ['darwin-core-occurrence']: # 延伸資料表的 occurrence 檢查 occurrenceID 的唯一值
                UNIQUE_ID_COLUMNS = ['occurrenceID']
            elif table_name in ['extended-measurement-or-facts']: # 延伸資料表的 extended measurement or facts 檢查 measurementID 的唯一值
                UNIQUE_ID_COLUMNS = ['measurementID']
            elif table_name in ['resource-relationship']: # 延伸資料表的 resource relationship 檢查 resourceID 的唯一值
                UNIQUE_ID_COLUMNS = ['resourceID']
            elif table_name in ['dna-derived-data']: # 延伸資料表的 dna derived data 檢查 samp_name 的唯一值
                UNIQUE_ID_COLUMNS = ['samp_name']
            elif table_name in ['others']: # 核心資料表的 others 檢查 dataID 的唯一值（長期生態站專用）
                UNIQUE_ID_COLUMNS = ['dataID']                 
            else:
                UNIQUE_ID_COLUMNS = []
                stats_dict['unique_stats'] = {}
            
            # 驗證單一值，需要整批資料一起檢查，不進入批次迴圈
            unique_id_columns = set(UNIQUE_ID_COLUMNS) & set(table_header)
            row_index = list(range(1, len(table_data) + 1))
            df = pd.DataFrame(table_data, columns=list(unique_id_columns))  # 只取需要的欄位
            df['row_index'] = row_index
            unique_stats = validate_unique_column(df, unique_id_columns)
            stats_dict.setdefault('unique_stats', {}).update(unique_stats)

            # 一次取固定資料筆數出來驗證
            for i in range(0, len(table_data), 1000):
                rows = table_data[i:i + 1000]
                for index, row in enumerate(rows):
                    row['row_index'] = i + index + 1 # index 應該從 1 開始 

                # 驗證控制詞彙
                common_columns = set(CONTROLLED_VOCABULARY_COLUMNS) & set(table_header)
                if common_columns:
                    df = pd.DataFrame(rows, columns=list(common_columns) + ['row_index'])  # 只取需要的欄位
                    controlled_stats = validate_controll_column(df, common_columns)
                    # print(f'controlled_stats: {controlled_stats}')
                    for col, stats in controlled_stats.items():
                        existing_stats = stats_dict.setdefault('controlled_stats', {}).setdefault(col, {
                            'counts_rows': 0,
                            'valid_rows': 0,
                            'invalid_rows': {
                                'count': 0, 
                                'values': [], 
                                'indexes': [], 
                                'error_message': stats['invalid_rows']['error_message']
                            },
                        })
                        existing_stats['counts_rows'] += stats['counts_rows']
                        existing_stats['valid_rows'] += stats['valid_rows']
                        existing_stats['invalid_rows']['count'] += stats['invalid_rows']['count']
                        existing_stats['invalid_rows']['values'].extend(stats['invalid_rows']['values'])
                        existing_stats['invalid_rows']['indexes'].extend(stats['invalid_rows']['indexes'])

                # 驗證經度
                lon_columns = set(LON_COLUMNS) & set(table_header)
                if lon_columns:
                    df = pd.DataFrame(rows, columns=list(lon_columns) + ['row_index'])  # 只取需要的欄位
                    lon_stats = validte_lon_column(df, lon_columns)
                    for col, stats in lon_stats.items():
                        existing_stats = stats_dict.setdefault('lon_stats', {}).setdefault(col, {
                            'counts_rows': 0,
                            'valid_rows': 0,
                            'invalid_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLongitude 超出範圍'
                            },
                            'zero_rows': {  
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLongitude 零座標'
                            },
                            'blank_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLongitude 有空值'
                            },
                            'invalid_content_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLongitude 有無效值'
                            },
                        })
                        existing_stats['counts_rows'] += stats['counts_rows']
                        existing_stats['valid_rows'] += stats['valid_rows']
                        existing_stats['invalid_rows']['count'] += stats['invalid_rows']['count']
                        existing_stats['invalid_rows']['values'].extend(stats['invalid_rows']['values'])
                        existing_stats['invalid_rows']['indexes'].extend(stats['invalid_rows']['indexes'])
                        existing_stats['zero_rows']['count'] += stats['zero_rows']['count']
                        existing_stats['zero_rows']['values'].extend(stats['zero_rows']['values'])
                        existing_stats['zero_rows']['indexes'].extend(stats['zero_rows']['indexes'])
                        existing_stats['blank_rows']['count'] += stats['blank_rows']['count']
                        existing_stats['blank_rows']['values'].extend(stats['blank_rows']['values'])
                        existing_stats['blank_rows']['indexes'].extend(stats['blank_rows']['indexes'])
                        existing_stats['invalid_content_rows']['count'] += stats['invalid_content_rows']['count']
                        existing_stats['invalid_content_rows']['values'].extend(stats['invalid_content_rows']['values'])
                        existing_stats['invalid_content_rows']['indexes'].extend(stats['invalid_content_rows']['indexes'])

                # 驗證緯度
                lat_columns = set(LAT_COLUMNS) & set(table_header)
                if lat_columns:
                    df = pd.DataFrame(rows, columns=list(lat_columns) + ['row_index'])  # 只取需要的欄位
                    lat_stats = validte_lat_column(df, lat_columns)
                    for col, stats in lat_stats.items():
                        existing_stats = stats_dict.setdefault('lat_stats', {}).setdefault(col, {
                            'counts_rows': 0,
                            'valid_rows': 0,
                            'invalid_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLatitude 超出範圍'
                            },
                            'zero_rows': {  
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLatitude 零座標'
                            },
                            'blank_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLatitude 有空值或無效值'
                            },
                            'invalid_content_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'decimalLatitude 有無效值'
                            },
                        })
                        existing_stats['counts_rows'] += stats['counts_rows']
                        existing_stats['valid_rows'] += stats['valid_rows']
                        existing_stats['invalid_rows']['count'] += stats['invalid_rows']['count']
                        existing_stats['invalid_rows']['values'].extend(stats['invalid_rows']['values'])
                        existing_stats['invalid_rows']['indexes'].extend(stats['invalid_rows']['indexes'])
                        existing_stats['zero_rows']['count'] += stats['zero_rows']['count']
                        existing_stats['zero_rows']['values'].extend(stats['zero_rows']['values'])
                        existing_stats['zero_rows']['indexes'].extend(stats['zero_rows']['indexes'])
                        existing_stats['blank_rows']['count'] += stats['blank_rows']['count']
                        existing_stats['blank_rows']['values'].extend(stats['blank_rows']['values'])
                        existing_stats['blank_rows']['indexes'].extend(stats['blank_rows']['indexes'])
                        existing_stats['invalid_content_rows']['count'] += stats['invalid_content_rows']['count']
                        existing_stats['invalid_content_rows']['values'].extend(stats['invalid_content_rows']['values'])
                        existing_stats['invalid_content_rows']['indexes'].extend(stats['invalid_content_rows']['indexes'])

                # 檢查是否有 year, month, day 欄位，有的話加入驗證
                if all(col in table_header for col in ['year', 'month', 'day']):
                    DATETIME_COLUMNS.extend(['year', 'month', 'day'])

                # 驗證日期
                datetime_columns = set(DATETIME_COLUMNS) & set(table_header)
                if datetime_columns:
                    df = pd.DataFrame(rows, columns=list(datetime_columns) + ['row_index'])  # 只取需要的欄位
                    datetime_stats = validate_datetime_coulmn(df, datetime_columns)
                    for col, stats in datetime_stats.items():
                        existing_stats = stats_dict.setdefault('datetime_stats', {}).setdefault(col, {
                            'counts_rows': 0,
                            'valid_rows': 0,
                            'invalid_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'error_message': 'eventDate 無效'
                            },
                            'mismatched_year_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'raw_eventDate': [],
                                'error_message': 'year 和 eventDate 不匹配'
                            },
                            'mismatched_month_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'raw_eventDate': [],
                                'error_message': 'month 和 eventDate 不匹配'
                            },
                            'mismatched_day_rows': {
                                'count': 0,
                                'values': [],
                                'indexes': [],
                                'raw_eventDate': [],
                                'error_message': 'day 和 eventDate 不匹配'
                            }  
                        })
                        existing_stats['counts_rows'] += stats['counts_rows']
                        existing_stats['valid_rows'] += stats['valid_rows']
                        existing_stats['invalid_rows']['count'] += stats['invalid_rows']['count']
                        existing_stats['invalid_rows']['values'].extend(stats['invalid_rows']['values'])
                        existing_stats['invalid_rows']['indexes'].extend(stats['invalid_rows']['indexes'])   

                        if stats.get('mismatched_year_rows') is not None:
                            mismatched_year_rows = stats['mismatched_year_rows']
                            existing_stats['mismatched_year_rows']['count'] += len(mismatched_year_rows['values'])
                            existing_stats['mismatched_year_rows']['values'].extend(mismatched_year_rows['values'])
                            existing_stats['mismatched_year_rows']['indexes'].extend(mismatched_year_rows['indexes'])
                            existing_stats['mismatched_year_rows']['raw_eventDate'].extend(mismatched_year_rows['raw_eventDate'])  

                        if stats.get('mismatched_month_rows') is not None:
                            mismatched_month_rows = stats['mismatched_month_rows']
                            existing_stats['mismatched_month_rows']['count'] += len(mismatched_month_rows['values'])
                            existing_stats['mismatched_month_rows']['values'].extend(mismatched_month_rows['values'])
                            existing_stats['mismatched_month_rows']['indexes'].extend(mismatched_month_rows['indexes'])
                            existing_stats['mismatched_month_rows']['raw_eventDate'].extend(mismatched_month_rows['raw_eventDate'])

                        if stats.get('mismatched_day_rows') is not None:
                            mismatched_day_rows = stats['mismatched_day_rows']
                            existing_stats['mismatched_day_rows']['count'] += len(mismatched_day_rows['values'])
                            existing_stats['mismatched_day_rows']['values'].extend(mismatched_day_rows['values'])
                            existing_stats['mismatched_day_rows']['indexes'].extend(mismatched_day_rows['indexes'])
                            existing_stats['mismatched_day_rows']['raw_eventDate'].extend(mismatched_day_rows['raw_eventDate'])   

                # 驗證年日月
                date_columns = set(DATE_COLUMNS) & set(table_header)
                if date_columns:
                    df = pd.DataFrame(rows, columns=list(date_columns) + ['row_index'])  # 只取需要的欄位
                    date_column_stats = validate_date_column(df, date_columns)
                    for col, stats in date_column_stats.items():
                        existing_stats = stats_dict.setdefault('date_column_stats', {}).setdefault(col, {
                            'counts_rows': 0,
                            'valid_rows': 0,
                            'invalid_rows': {
                                'count': 0,
                                'values':[],
                                'indexes': [],
                                'error_message': f'{col} 無效',
                            },
                        })
                        existing_stats['counts_rows'] += stats['counts_rows']
                        existing_stats['valid_rows'] += stats['valid_rows']
                        existing_stats['invalid_rows']['count'] += stats['invalid_rows']['count']
                        existing_stats['invalid_rows']['values'].extend(stats['invalid_rows']['values'])
                        existing_stats['invalid_rows']['indexes'].extend(stats['invalid_rows']['indexes'])
                
                # 檢查剩下的欄位
                remain_columns = set(table_header) - set(CONTROLLED_VOCABULARY_COLUMNS + 
                                                        UNIQUE_ID_COLUMNS +
                                                        LON_COLUMNS +
                                                        LAT_COLUMNS +
                                                        DATETIME_COLUMNS +
                                                        DATE_COLUMNS)
                # 驗證空白
                df = pd.DataFrame(rows, columns=list(remain_columns) + ['row_index'])
                remain_column_stats = validate_blank_column(df, remain_columns)
                for col, stats in remain_column_stats.items():
                    existing_stats = stats_dict.setdefault('remain_column_stats', {}).setdefault(col, {
                        'counts_rows': 0,
                        'valid_rows': 0,
                        'blank_rows': {
                            'count': 0,
                            'values': [],
                            'indexes': [],
                            'error_message': stats['blank_rows']['error_message'],
                        },
                    })
                    existing_stats['counts_rows'] += stats['counts_rows']
                    existing_stats['valid_rows'] += stats['valid_rows']
                    existing_stats['blank_rows']['count'] += stats['blank_rows']['count']
                    existing_stats['blank_rows']['values'].extend(stats['blank_rows']['values'])
                    existing_stats['blank_rows']['indexes'].extend(stats['blank_rows']['indexes'])

            # 將 stats_dict 存入 table_stats 中，對應於當前的 table_name
            table_stats[table_name] = stats_dict

            if stats_dict.get('controlled_stats'):
                for col, stats in stats_dict['controlled_stats'].items():
                    valid_percentage = round((stats['valid_rows'] / stats['counts_rows']) * 100, 1)
                    stats['valid_percentage'] = valid_percentage
            if stats_dict.get('lon_stats'):
                for col, stats in stats_dict['lon_stats'].items():
                    valid_percentage = round((stats['valid_rows'] / stats['counts_rows']) * 100, 1)
                    stats['valid_percentage'] = valid_percentage
            if stats_dict.get('lat_stats'):
                for col, stats in stats_dict['lat_stats'].items():
                    valid_percentage = round((stats['valid_rows'] / stats['counts_rows']) * 100, 1)
                    stats['valid_percentage'] = valid_percentage
            if stats_dict.get('datetime_stats'):
                for col, stats in stats_dict['datetime_stats'].items():
                    valid_percentage = round((stats['valid_rows'] / stats['counts_rows']) * 100, 1)
                    stats['valid_percentage'] = valid_percentage
            if stats_dict.get('date_column_stats'):
                for col, stats in stats_dict['date_column_stats'].items():
                    valid_percentage = round((stats['valid_rows'] / stats['counts_rows']) * 100, 1)
                    stats['valid_percentage'] = valid_percentage
            if stats_dict.get('remain_column_stats'):
                for col, stats in stats_dict['remain_column_stats'].items():
                    valid_percentage = round((stats['valid_rows'] / stats['counts_rows']) * 100, 1)
                    stats['valid_percentage'] = valid_percentage

    delete_table_stats(project_id) # 先清掉 ErrorMesssages 表中的所有內容，理論上同一時間下只會有一筆資料
    save_table_stats(project_id, table_stats)
    session['table_name'] = table_name
    session['project_id'] = project_id
    
    return jsonify({'success': 'Recieved data successfully'})

@data_edit_bp.route('/column_mapping', methods=['GET'])
def column_mapping():
    import_filename = session.get('import_filename', '')
    template_name = session.get('template_name', '')
    checkbox_names_list = session.get('checkbox_names_list', [])
    import_data_header = session.get('import_data_header', [])

    checkbox_names_set = set(checkbox_names_list)
    unmapped_columns_list = [header for header in import_data_header if header not in checkbox_names_set]

    return render_template('column-mapping.html',
                           import_data_header=import_data_header, 
                           import_filename=import_filename, 
                           template_name=template_name,
                           checkbox_names_list=checkbox_names_list,
                           unmapped_columns_list=unmapped_columns_list)

@data_edit_bp.route('/pagination', methods=['GET'])
def get_pagination():
    project_id = request.args.get('project_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    column_name = request.args.get('column_name')
    filter_value = request.args.get('filter_value')
    blur_search = request.args.get('blur_search')
    regex_search = request.args.get('regex_search')
    print(regex_search)

    # 確保 project_id 存在，否則返回錯誤
    if not project_id:
        return jsonify({"error": "Project ID is required"}), 400

    # 查詢該 project_id 下所有表格的 TableHeader
    table_headers_entries = TableHeader.query.filter_by(project_id=project_id).all()
    
    if not table_headers_entries:
        return jsonify({"error": "No tables found for this project"}), 404

    response_data = {}

    # 遍歷每個 TableHeader，並查詢對應的 TableData
    for table_header_entry in table_headers_entries:
        table_headers = table_header_entry.table_header  # 每張表格的欄位名稱
        table_name = table_header_entry.table_name

        query = TableData.query.filter_by(project_id=project_id, table_name=table_name)

        # 如果有 column_name 和 filter_value，則添加過濾條件
        if column_name and filter_value:
            if blur_search == 'true':
                query = query.filter(
                    func.json_extract(TableData.data, f'$.{column_name}').like(f'%{str(filter_value)}%')
                )
            elif regex_search == 'true':
                query = query.filter(
                    func.json_extract(TableData.data, f'$.{column_name}').op('REGEXP')(str(filter_value))
                )
            else:
                query = query.filter(
                    func.json_extract(TableData.data, f'$.{column_name}') == str(filter_value)  
                )   

        # 分頁查詢每張表格的 TableData
        pagination = query.order_by(TableData.row_id).paginate(page=page, per_page=per_page, error_out=False)

        # if (column_name and filter_value):
            

        # # 分頁查詢每張表格的 TableData
        # pagination = TableData.query.filter_by(project_id=project_id, table_name=table_name)\
        #     .order_by(TableData.row_id).paginate(page=page, per_page=per_page, error_out=False)
        
        table_data = pagination.items

        # 根據 table_headers 的順序提取每行資料
        data = []
        row_index = []
        for entry in table_data:
            row_data = []
            row_index.append(entry.row_id)
            for header in table_headers:
                row_data.append(entry.data.get(header))
            data.append(row_data)

        # 每張表格的分頁和數據資訊
        response_data[table_name] = {
            'data': data,
            'row_index': row_index,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': pagination.page,
            'next_page': pagination.next_num,
            'prev_page': pagination.prev_num,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }

    # 回傳所有表格的分頁數據
    return jsonify(response_data)

@data_edit_bp.route('/column_content', methods=['GET'])
def get_column_content():
    # 取得請求參數
    project_id = request.args.get('project_id', type=int)
    table_name = request.args.get('table_name', type=str)
    column_name = request.args.get('column_name', type=str)

    # 確認必要參數是否提供
    if not (project_id and table_name and column_name):
        return jsonify({"error": "Project ID, table name, and column name are required"}), 400

    try:
        # 查詢 TableData 表，使用 JSON 查詢特定 column_name 值的次數
        results = (
            db.session.query(
                func.json_extract(TableData.data, f'$.{column_name}').label('column_value'),
                func.count().label('count')
            )
            .filter_by(project_id=project_id, table_name=table_name)
            .group_by(func.json_extract(TableData.data, f'$.{column_name}'))
            .all()
        )

        # 將 None 轉成 'null' 在前端渲染才不會報錯
        data = {result.column_value if result.column_value is not None else 'null': result.count for result in results}

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@data_edit_bp.route('/export_column_csv', methods=['GET'])
def export_column_to_csv():
    # 從請求參數中獲取 project_id 和 table_name
    project_id = request.args.get("project_id", type=int)
    table_name = request.args.get("table_name", type=str)

    if not project_id or not table_name:
        return {"error": "Missing project_id or table_name."}, 400

    table_data = TableData.query.filter_by(project_id=project_id, table_name=table_name).order_by(TableData.row_id).all()

    if not table_data:
        return {"error": "No data found for the given project and table name."}, 404

    table_header_entry = TableHeader.query.filter_by(project_id=project_id, table_name=table_name).first()
    headers = table_header_entry.table_header

    # 創建 CSV 輸出
    def generate_csv():
        # 使用 io.StringIO 來模擬一個文件對象
        output = io.StringIO()
        csv_writer = csv.DictWriter(output, fieldnames=headers)
        csv_writer.writeheader()

        for record in table_data:
            row = {header: record.data.get(header, "") for header in headers}
            csv_writer.writerow(row)

        output.seek(0)  # 重置指針位置
        # 將內容編碼為 UTF-8-SIG
        return output.getvalue().encode('utf-8-sig')

    # 獲取 UTF-8-SIG 編碼的 CSV 數據
    csv_data = generate_csv()

    # 使用 io.BytesIO 包裝為文件對象
    buffer = io.BytesIO(csv_data)

    return Response(
        buffer,
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={table_name}-{date.today()}.csv"
        },
    )

@data_edit_bp.route('/insert_page', methods=['POST'])
def insert_blank_page():
    '''
    插入 20 筆空白資料進 TableData 
    '''

    data = request.get_json()
    table_name = data.get('table_name')
    project_id = data.get('project_id')

    # 先檢查是否有必要參數
    if not (project_id and table_name):
        return jsonify({"error": "Project ID and table name are required"}), 400
    
    # 逆查 TableHeader 中的 table_id, table_header
    table_header_entry = TableHeader.query.filter_by(project_id=project_id, table_name=table_name).first()
    if not table_header_entry:
        return jsonify({"error": "Table header not found"}), 404
    
    table_id = table_header_entry.id
    table_header = table_header_entry.table_header

    # 根據 table_header 建立空白資料
    empty_data = {header: None for header in table_header}

    # 查詢 TableData 中對應的最後一筆資料
    last_row = TableData.query.filter_by(project_id=project_id, table_id=table_id).order_by(TableData.row_id.desc()).first()
    last_row_id = last_row.row_id if last_row else 0  

    # 插入 20 筆空白資料
    new_rows = [
        TableData(project_id=project_id, table_id=table_id, table_name=table_name, 
                  row_id=last_row_id + i + 1, data=empty_data)
        for i in range(20)
    ]
    
    db.session.bulk_save_objects(new_rows)
    db.session.commit()

    return jsonify({"message": "Inserted blank pages successfully"}), 200

@data_edit_bp.route('/remove_rows', methods=['DELETE'])
def remove_rows():
    data = request.get_json()
    table_name = data.get('table_name')
    project_id = data.get('project_id')
    start_row_id = data.get('start_row_id')
    end_row_id = data.get('end_row_id')

    # 先檢查是否有必要參數
    if not (project_id and table_name and start_row_id and end_row_id):
        return jsonify({"error": "Project ID, table name, start row index and end row index are required"}), 400
    
    # 逆查 TableHeader 中的 table_id
    table_header_entry = TableHeader.query.filter_by(project_id=project_id, table_name=table_name).first()
    if not table_header_entry:
        return jsonify({"error": "Table header not found"}), 404
    
    table_id = table_header_entry.id

    try:
        # 如果 start_row_id 和 end_row_id 相等，刪除一筆資料；若不相等則刪除範圍資料
        if start_row_id == end_row_id:
            # 刪除單筆資料
            TableData.query.filter_by(
                project_id=project_id,
                table_id=table_id,
                table_name=table_name,
                row_id=start_row_id
            ).delete(synchronize_session=False)

            # 更新後續資料的 row_id
            TableData.query.filter(
                TableData.project_id == project_id,
                TableData.table_id == table_id,
                TableData.table_name == table_name,
                TableData.row_id > start_row_id
            ).update({
                TableData.row_id: TableData.row_id - 1
            }, synchronize_session=False)
        else:
            # 刪除範圍資料
            deleted_rows_count = TableData.query.filter(
                TableData.project_id == project_id,
                TableData.table_id == table_id,
                TableData.table_name == table_name,
                TableData.row_id.between(start_row_id, end_row_id)
            ).delete(synchronize_session=False)

            # 更新後續資料的 row_id
            if deleted_rows_count > 0:
                TableData.query.filter(
                    TableData.project_id == project_id,
                    TableData.table_id == table_id,
                    TableData.table_name == table_name,
                    TableData.row_id > end_row_id
                ).update({
                    TableData.row_id: TableData.row_id - deleted_rows_count
                }, synchronize_session=False)

        db.session.commit()
        return {"message": "Rows deleted successfully"}, 200
    
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500



